import { randomUUID } from "node:crypto";
import { chat, OLLAMA_MODEL, OllamaError } from "./ollama";
import {
  buildChunkPrompt,
  buildMeetingPrompt,
  buildRepairPrompt,
  buildSynthesisPrompt,
} from "./prompt";
import { splitIntoChunks } from "./extract";
import {
  ChunkExtractSchema,
  MEETING_JSON_SCHEMA,
  CHUNK_JSON_SCHEMA,
  MeetingDocSchema,
  type ChunkExtract,
  type MeetingDoc,
} from "./schema";
import { computeStats, saveMeeting, savePdf, type MeetingRecord } from "./store";
import { renderRecordPdf } from "./pdf/document";
import { humanizeDates } from "./dates";

export type ProgressEvent =
  | { type: "phase"; id: string; label: string; detail?: string }
  | { type: "progress"; chars: number; percent: number; etaSeconds: number | null; note?: string }
  | { type: "done"; meeting: MeetingRecord }
  | { type: "error"; message: string; hint?: string };

export type Emit = (event: ProgressEvent) => void;

export type GenerateInput = {
  notes: string;
  title?: string;
  date?: string;
  project?: string;
  type?: string;
  sourceName?: string;
  sourceKind?: "texto" | "archivo";
};

const CHUNK_THRESHOLD = 9000;
const MAX_NOTES = 200_000;

function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("La respuesta del modelo no contiene un objeto JSON reconocible.");
  }
}

function cleanList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim().replace(/^[-•*\d.\s]+/, "");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function normalizeIsoDate(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const isoTimestamp = /^\d{4}-\d{2}-\d{2}T/.exec(raw);
  if (isoTimestamp) return raw.slice(0, 10);

  return "";
}

function postProcess(doc: MeetingDoc, input: GenerateInput): MeetingDoc {
  const normalizedDate = normalizeIsoDate(doc.fecha) || normalizeIsoDate(input.date ?? "");

  const attendees = doc.asistentes
    .map((person) => ({
      nombre: person.nombre.replace(/\s+/g, " ").trim(),
      rol: person.rol.replace(/\s+/g, " ").trim(),
    }))
    .filter((person) => person.nombre.length > 0);

  const attendeeKeys = attendees.map((a) => a.nombre.toLowerCase());
  const uniqueAttendees = attendees.filter(
    (person, index) => attendeeKeys.indexOf(person.nombre.toLowerCase()) === index,
  );

  const actions = doc.acciones
    .map((action) => {
      const priority = action.prioridad.toLowerCase();
      const state = action.estado.toLowerCase();
      return {
        tarea: humanizeDates(action.tarea.replace(/\s+/g, " ").trim()),
        responsable: action.responsable.replace(/\s+/g, " ").trim(),
        fecha: normalizeIsoDate(action.fecha),
        prioridad: priority.startsWith("al") ? "alta" : priority.startsWith("ba") ? "baja" : "media",
        estado: ["pendiente", "en curso", "bloqueada", "hecha"].includes(state) ? state : "pendiente",
      };
    })
    .filter((action) => action.tarea.length > 2);

  const uniqueActions = actions.filter((action, index) => {
    const key = `${action.tarea.toLowerCase()}|${action.responsable.toLowerCase()}`;
    return actions.findIndex((other) => `${other.tarea.toLowerCase()}|${other.responsable.toLowerCase()}` === key) === index;
  });

  return {
    titulo: (input.title?.trim() || doc.titulo.trim() || "Acta de reunión").slice(0, 120),
    fecha: normalizedDate,
    proyecto: (input.project?.trim() || doc.proyecto.trim()).slice(0, 80),
    tipo: (input.type?.trim() || doc.tipo.trim() || "Reunión de trabajo").slice(0, 60),
    asistentes: uniqueAttendees.slice(0, 30),
    resumenEjecutivo: cleanList(doc.resumenEjecutivo).map(humanizeDates).slice(0, 6),
    contexto: humanizeDates(doc.contexto.trim()),
    temas: doc.temas
      .map((topic) => ({
        titulo: topic.titulo.replace(/\s+/g, " ").trim(),
        puntos: cleanList(topic.puntos).map(humanizeDates).slice(0, 8),
        decisiones: cleanList(topic.decisiones).map(humanizeDates).slice(0, 6),
      }))
      .filter((topic) => topic.titulo.length > 0)
      .slice(0, 8),
    decisiones: cleanList(doc.decisiones).map(humanizeDates).slice(0, 20),
    acciones: uniqueActions.slice(0, 30),
    riesgos: doc.riesgos
      .map((risk) => ({
        descripcion: humanizeDates(risk.descripcion.replace(/\s+/g, " ").trim()),
        impacto: risk.impacto.toLowerCase().startsWith("al")
          ? "alto"
          : risk.impacto.toLowerCase().startsWith("ba")
            ? "bajo"
            : "medio",
        mitigacion: humanizeDates(risk.mitigacion.replace(/\s+/g, " ").trim()),
      }))
      .filter((risk) => risk.descripcion.length > 0)
      .slice(0, 10),
    preguntasAbiertas: cleanList(doc.preguntasAbiertas).map(humanizeDates).slice(0, 10),
    proximosPasos: cleanList(doc.proximosPasos).map(humanizeDates).slice(0, 10),
    palabrasClave: cleanList(doc.palabrasClave).slice(0, 8),
  };
}

function mergePartials(partials: ChunkExtract[]) {
  return {
    resumen: cleanList(partials.flatMap((p) => p.resumen)).slice(0, 12),
    personas: cleanList(partials.flatMap((p) => p.personas)).slice(0, 20),
    decisiones: cleanList(partials.flatMap((p) => p.decisiones)).slice(0, 30),
    acciones: partials.flatMap((p) => p.acciones).slice(0, 40),
    riesgos: partials.flatMap((p) => p.riesgos).slice(0, 15),
    preguntas: cleanList(partials.flatMap((p) => p.preguntas)).slice(0, 20),
  };
}

export async function generateMeeting(
  input: GenerateInput,
  emit: Emit,
  signal?: AbortSignal,
): Promise<MeetingRecord> {
  const startedAt = Date.now();
  const notes = input.notes.trim();

  if (notes.length < 40) {
    throw new OllamaError(
      "Las notas son demasiado cortas para generar un acta.",
      "validation",
      "Pegá al menos unas pocas líneas con lo que se habló en la reunión.",
    );
  }
  if (notes.length > MAX_NOTES) {
    throw new OllamaError(
      "Las notas superan el máximo soportado (200.000 caracteres).",
      "validation",
      "Dividí la reunión en partes o subí el archivo original.",
    );
  }

  const chunks = splitIntoChunks(notes, CHUNK_THRESHOLD);
  const expectedChars = Math.min(7500, Math.max(1200, Math.round(notes.length * 0.3) + 800));
  const weights = chunks.length > 1 ? { map: 55, reduce: 30, pdf: 15 } : { map: 75, reduce: 0, pdf: 25 };

  let producedChars = 0;
  const generationStart = Date.now();

  const resetProgress = () => {
    producedChars = 0;
  };

  const reportProgress = (chars: number, basePercent: number, span: number, note?: string) => {
    producedChars += chars;
    const elapsed = Math.max(1, (Date.now() - generationStart) / 1000);
    const rate = producedChars / elapsed;
    const remaining = Math.max(0, expectedChars - producedChars);
    const etaSeconds = rate > 5 ? Math.round(remaining / rate) : null;
    emit({
      type: "progress",
      chars: producedChars,
      percent: Math.min(98, Math.round(basePercent + Math.min(1, producedChars / expectedChars) * span)),
      etaSeconds,
      note,
    });
  };

  let doc: MeetingDoc;

  if (chunks.length === 1) {
    emit({
      type: "phase",
      id: "analizando",
      label: "Analizando las notas",
      detail: `${notes.length.toLocaleString("es")} caracteres en una sola pasada`,
    });

    const result = await chat({
      messages: buildMeetingPrompt({
        notes,
        title: input.title,
        date: input.date,
        project: input.project,
        type: input.type,
      }).messages,
      jsonSchema: MEETING_JSON_SCHEMA,
      numPredict: 3000,
      signal,
      onRestart: resetProgress,
      onToken: (delta) => reportProgress(delta.length, 5, weights.map, "Redactando el acta"),
    });

    doc = await parseAndValidate(result.content, input, emit, signal);
  } else {
    emit({
      type: "phase",
      id: "fragmentos",
      label: "Procesando notas largas",
      detail: `${chunks.length} fragmentos`,
    });

    const partials: ChunkExtract[] = [];

    for (let i = 0; i < chunks.length; i += 1) {
      emit({
        type: "phase",
        id: `fragmento-${i}`,
        label: `Fragmento ${i + 1} de ${chunks.length}`,
        detail: `${chunks[i].length.toLocaleString("es")} caracteres`,
      });

      const result = await chat({
        messages: buildChunkPrompt({
          chunk: chunks[i],
          index: i,
          total: chunks.length,
          date: input.date,
          project: input.project,
        }).messages,
        jsonSchema: CHUNK_JSON_SCHEMA,
        numPredict: 1400,
        signal,
        onRestart: resetProgress,
        onToken: (delta) =>
          reportProgress(
            delta.length,
            5 + (i / chunks.length) * weights.map,
            weights.map / chunks.length,
            `Leyendo fragmento ${i + 1}`,
          ),
      });

      try {
        const parsed = ChunkExtractSchema.safeParse(extractJson(result.content));
        if (parsed.success) partials.push(parsed.data);
      } catch {
        // Un fragmento ilegible no debe romper toda la generación.
      }
    }

    if (!partials.length) {
      throw new OllamaError(
        "No se pudo extraer información de los fragmentos.",
        "parse",
        "Probá con menos texto o con notas más limpias.",
      );
    }

    emit({
      type: "phase",
      id: "sintetizando",
      label: "Fusionando los fragmentos",
      detail: "Eliminando duplicados y ordenando secciones",
    });

    const merged = mergePartials(partials);
    const result = await chat({
      messages: buildSynthesisPrompt({
        partials,
        date: input.date,
        project: input.project,
        type: input.type,
        title: input.title,
      }).messages,
      jsonSchema: MEETING_JSON_SCHEMA,
      numPredict: 3200,
      signal,
      onRestart: resetProgress,
      onToken: (delta) =>
        reportProgress(delta.length, 5 + weights.map, weights.reduce, "Redactando el acta final"),
    });

    doc = await parseAndValidate(result.content, input, emit, signal);

    // Si la síntesis pierde contenido que sí estaba en los fragmentos, lo recuperamos.
    if (doc.decisiones.length < merged.decisiones.length) {
      doc.decisiones = cleanList([...doc.decisiones, ...merged.decisiones]).slice(0, 20);
    }
    if (doc.acciones.length < Math.min(3, merged.acciones.length)) {
      const extras = merged.acciones
        .filter((action) => !doc.acciones.some((a) => a.tarea.toLowerCase() === action.tarea.toLowerCase()))
        .map((action) => ({
          tarea: action.tarea,
          responsable: action.responsable,
          fecha: normalizeIsoDate(action.fecha),
          prioridad: "media",
          estado: "pendiente",
        }));
      doc.acciones = [...doc.acciones, ...extras].slice(0, 30);
    }
  }

  doc = postProcess(doc, input);

  emit({
    type: "phase",
    id: "maquetando",
    label: "Maquetando el PDF",
    detail: "Portada, tablas y numeración de páginas",
  });
  emit({ type: "progress", chars: producedChars, percent: 92, etaSeconds: 3, note: "Renderizando" });

  const record: MeetingRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model: OLLAMA_MODEL,
    durationMs: Date.now() - startedAt,
    source: {
      name: input.sourceName?.trim() || "Texto pegado",
      chars: notes.length,
      kind: input.sourceKind ?? "texto",
    },
    doc,
    stats: computeStats(doc),
  };

  const pdfBytes = await renderRecordPdf(record);

  emit({ type: "phase", id: "guardando", label: "Guardando en el historial" });

  await savePdf(record.id, pdfBytes);
  await saveMeeting(record);

  record.durationMs = Date.now() - startedAt;

  return record;
}

async function parseAndValidate(
  raw: string,
  input: GenerateInput,
  emit: Emit,
  signal?: AbortSignal,
): Promise<MeetingDoc> {
  let candidate: unknown;

  try {
    candidate = extractJson(raw);
  } catch (error) {
    throw new OllamaError(
      error instanceof Error ? error.message : "Respuesta JSON inválida.",
      "parse",
      "El modelo devolvió texto en lugar de JSON. Reintentá la generación.",
    );
  }

  const parsed = MeetingDocSchema.safeParse(candidate);
  if (parsed.success) return parsed.data as MeetingDoc;

  emit({
    type: "phase",
    id: "reparando",
    label: "Corrigiendo la estructura",
    detail: "Un campo no cumplía el esquema",
  });

  const issues = parsed.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "raíz"}: ${issue.message}`)
    .join("; ");

  const repaired = await chat({
    messages: buildRepairPrompt({ raw, error: issues, date: input.date }).messages,
    jsonSchema: MEETING_JSON_SCHEMA,
    temperature: 0,
    numPredict: 3000,
    signal,
  });

  const repairedParse = MeetingDocSchema.safeParse(extractJson(repaired.content));
  if (!repairedParse.success) {
    throw new OllamaError(
      "El modelo no logró producir un acta válida.",
      "schema",
      `Detalle: ${issues}`,
    );
  }

  return repairedParse.data as MeetingDoc;
}
