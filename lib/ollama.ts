const RAW_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

export const OLLAMA_URL = RAW_URL.replace(/\/+$/, "");
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.8:27b";

const RAW_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 8192);
export const OLLAMA_NUM_CTX = Number.isFinite(RAW_CTX) && RAW_CTX >= 512 ? RAW_CTX : 8192;

export class OllamaError extends Error {
  code: string;
  hint?: string;

  constructor(message: string, code = "ollama_error", hint?: string) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
    this.hint = hint;
  }
}

export type OllamaModel = {
  name: string;
  size: number;
  parameterSize?: string;
};

export async function listModels(timeoutMs = 4000): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new OllamaError(`Ollama respondió ${res.status}`);
  const data = (await res.json()) as {
    models?: { name: string; size: number; details?: { parameter_size?: string } }[];
  };
  return (data.models ?? []).map((m) => ({
    name: m.name,
    size: m.size,
    parameterSize: m.details?.parameter_size,
  }));
}

export type HealthReport = {
  ok: boolean;
  url: string;
  model: string;
  modelAvailable: boolean;
  models: string[];
  error?: string;
  hint?: string;
};

export async function health(): Promise<HealthReport> {
  try {
    const models = await listModels();
    const names = models.map((m) => m.name);
    const available = names.some(
      (n) => n === OLLAMA_MODEL || n.split(":")[0] === OLLAMA_MODEL.split(":")[0],
    );
    return {
      ok: available,
      url: OLLAMA_URL,
      model: OLLAMA_MODEL,
      modelAvailable: available,
      models: names,
      hint: available
        ? undefined
        : `El modelo "${OLLAMA_MODEL}" no está instalado. Ejecutá: ollama pull ${OLLAMA_MODEL}`,
    };
  } catch {
    return {
      ok: false,
      url: OLLAMA_URL,
      model: OLLAMA_MODEL,
      modelAvailable: false,
      models: [],
      error: "No se pudo conectar con Ollama.",
      hint: "Verificá que Ollama esté corriendo (ollama serve) y que OLLAMA_URL sea correcto.",
    };
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  jsonSchema?: object;
  temperature?: number;
  numPredict?: number;
  numCtx?: number;
  seed?: number;
  onToken?: (chunk: string, total: string) => void;
  onRestart?: () => void;
  signal?: AbortSignal;
};

export type ChatResult = {
  content: string;
  evalCount: number;
  promptEvalCount: number;
  totalDurationMs: number;
  evalDurationMs: number;
  loadDurationMs: number;
};

type OllamaChunk = {
  message?: { role?: string; content?: string; thinking?: string };
  done?: boolean;
  error?: string;
  eval_count?: number;
  prompt_eval_count?: number;
  total_duration?: number;
  eval_duration?: number;
  load_duration?: number;
};

/**
 * Llama a /api/chat en modo streaming y devuelve el texto completo al terminar.
 * El streaming nos permite mostrar progreso real (caracteres generados) aunque
 * el JSON final solo sea válido al cerrar la respuesta.
 */
export async function chat(options: ChatRequest): Promise<ChatResult> {
  const initialCtx = options.numCtx ?? OLLAMA_NUM_CTX;

  try {
    return await runChat(options, initialCtx);
  } catch (error) {
    // Algunos drivers hacen fallar el kernel de flash-attention al cargar con
    // contextos grandes. Reintentamos una vez con la mitad de contexto.
    if (!isCudaFailure(error) || initialCtx <= 2048) throw error;
    options.onRestart?.();
    return runChat(options, Math.max(2048, Math.floor(initialCtx / 2)));
  }
}

function isCudaFailure(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /CUDA error|process has terminated|0xc0000409|shared object initialization/i.test(text);
}

async function runChat(
  {
    messages,
    jsonSchema,
    temperature = 0.2,
    numPredict = 2600,
    seed,
    onToken,
    signal,
  }: ChatRequest,
  numCtx: number,
): Promise<ChatResult> {
  const startedAt = Date.now();
  const timeout = AbortSignal.timeout(15 * 60 * 1000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const payload = {
    model: OLLAMA_MODEL,
    messages,
    stream: true,
    think: false,
    keep_alive: "30m",
    ...(jsonSchema ? { format: jsonSchema } : {}),
    options: {
      temperature,
      num_ctx: numCtx,
      num_predict: numPredict,
      top_p: 0.9,
      repeat_penalty: 1.05,
      ...(seed !== undefined ? { seed } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: combined,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OllamaError("La generación se canceló o excedió el tiempo máximo.", "timeout");
    }
    throw new OllamaError(
      "No se pudo conectar con Ollama.",
      "connection",
      "Verificá que Ollama esté corriendo en " + OLLAMA_URL,
    );
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new OllamaError(
      `Ollama respondió ${res.status}. ${detail.slice(0, 300)}`.trim(),
      "bad_response",
      res.status === 404
        ? `Puede que el modelo "${OLLAMA_MODEL}" no exista. Ejecutá: ollama pull ${OLLAMA_MODEL}`
        : undefined,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finished: OllamaChunk | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line) continue;

      let chunk: OllamaChunk;
      try {
        chunk = JSON.parse(line) as OllamaChunk;
      } catch {
        continue;
      }

      if (chunk.error) {
        throw new OllamaError(chunk.error, "model_error");
      }
      const delta = chunk.message?.content ?? "";
      if (delta) {
        content += delta;
        onToken?.(delta, content);
      }
      if (chunk.done) finished = chunk;
    }
  }

  if (!content.trim()) {
    throw new OllamaError(
      "El modelo no devolvió contenido. Puede haber agotado el límite de tokens o estar cargando.",
      "empty",
      "Probá de nuevo; la primera carga del modelo puede tardar cerca de un minuto.",
    );
  }

  return {
    content,
    evalCount: finished?.eval_count ?? 0,
    promptEvalCount: finished?.prompt_eval_count ?? 0,
    totalDurationMs: finished?.total_duration
      ? Math.round(finished.total_duration / 1e6)
      : Date.now() - startedAt,
    evalDurationMs: finished?.eval_duration ? Math.round(finished.eval_duration / 1e6) : 0,
    loadDurationMs: finished?.load_duration ? Math.round(finished.load_duration / 1e6) : 0,
  };
}
