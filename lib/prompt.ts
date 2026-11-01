import type { ChunkExtract } from "./schema";

const SYSTEM_RULES = `Eres "Minuta", un asistente ejecutivo experto en documentar reuniones de trabajo en español.

Tu tarea es convertir notas crudas en un acta estructurada, precisa y profesional.

REGLAS ABSOLUTAS
1. Usa únicamente información presente en las notas. No inventes hechos, nombres, cifras, fechas ni acuerdos.
2. Si un dato no aparece, deja el campo vacío ("") o usa "s/d". Nunca rellenes por suposición.
3. No repitas la misma idea en dos secciones distintas.
4. Escribe en español neutro y profesional. Sin emojis, sin markdown, sin negritas, sin viñetas dentro de los textos.
5. Fechas siempre en formato AAAA-MM-DD. Resuelve expresiones relativas ("el viernes", "la próxima semana", "fin de mes") tomando como referencia la FECHA DE LA REUNIÓN. Si no se puede determinar, deja "".
6. Los nombres de responsables deben escribirse exactamente como aparecen en las notas.
7. El título debe tener entre 3 y 8 palabras, ser descriptivo y no incluir la palabra "reunión" ni comillas.
8. Cada acción debe ser atómica, empezar con un verbo en infinitivo y tener un único responsable.
9. El resumen ejecutivo va de 3 a 5 viñetas de una sola línea (máximo 25 palabras), centradas en resultados y decisiones, no en la agenda.
10. Los temas agrupan la conversación; no los uses para repetir el resumen.
11. Prioridad de las acciones: "alta" solo si tiene fecha límite dentro de los 7 días posteriores a la reunión, bloquea el trabajo de otra persona o es un compromiso explícito con un cliente; "media" por defecto; "baja" si es una idea o mejora sin plazo.
12. preguntasAbiertas: solo preguntas explícitas sin respuesta o temas que quedaron sin definir, redactados como pregunta breve (ej. "¿Conviene evaluar notificaciones por WhatsApp?"). Si no hay, devuelve [].

Devuelve exclusivamente el JSON solicitado.`;

export type MeetingPromptInput = {
  notes: string;
  title?: string;
  date?: string;
  project?: string;
  type?: string;
};

export function buildMeetingPrompt(input: MeetingPromptInput) {
  const meta = [
    `FECHA DE LA REUNIÓN: ${input.date || "no indicada"}`,
    `PROYECTO O ÁREA: ${input.project?.trim() || "no indicado"}`,
    `TIPO DE REUNIÓN: ${input.type?.trim() || "no indicado"}`,
    input.title?.trim() ? `TÍTULO PEDIDO POR EL USUARIO: ${input.title.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = `${meta}

NOTAS DE LA REUNIÓN (texto crudo, puede tener errores de transcripción):
"""
${input.notes}
"""

Genera el acta completa respetando el esquema. Si las notas mencionan varios proyectos, usa el principal como "proyecto".`;

  return {
    messages: [
      { role: "system" as const, content: SYSTEM_RULES },
      { role: "user" as const, content: user },
    ],
  };
}

const CHUNK_RULES = `Eres un analista que procesa un fragmento de las notas de una reunión.
Extrae solo lo que aparece explícitamente en el fragmento. No inventes nada.
Fechas en formato AAAA-MM-DD resolviendo referencias relativas contra la fecha de la reunión; si no se puede, "".
Nombres de personas exactamente como aparecen. Sin markdown ni viñetas dentro de los textos.
Devuelve exclusivamente el JSON solicitado.`;

export function buildChunkPrompt(args: {
  chunk: string;
  index: number;
  total: number;
  date?: string;
  project?: string;
}) {
  const user = `FECHA DE LA REUNIÓN: ${args.date || "no indicada"}
PROYECTO O ÁREA: ${args.project?.trim() || "no indicado"}
FRAGMENTO ${args.index + 1} DE ${args.total}:
"""
${args.chunk}
"""

Extrae resumen, personas mencionadas, decisiones, acciones, riesgos y preguntas abiertas de este fragmento.`;

  return {
    messages: [
      { role: "system" as const, content: CHUNK_RULES },
      { role: "user" as const, content: user },
    ],
  };
}

export function buildSynthesisPrompt(args: {
  partials: ChunkExtract[];
  date?: string;
  project?: string;
  type?: string;
  title?: string;
}) {
  const compact = args.partials.map((p, i) => ({
    fragmento: i + 1,
    resumen: p.resumen,
    personas: p.personas,
    decisiones: p.decisiones,
    acciones: p.acciones,
    riesgos: p.riesgos,
    preguntas: p.preguntas,
  }));

  const user = `FECHA DE LA REUNIÓN: ${args.date || "no indicada"}
PROYECTO O ÁREA: ${args.project?.trim() || "no indicado"}
TIPO DE REUNIÓN: ${args.type?.trim() || "no indicado"}
${args.title?.trim() ? `TÍTULO PEDIDO POR EL USUARIO: ${args.title.trim()}` : ""}

A continuación están los extractos estructurados de una reunión larga, en orden.
Debes fusionarlos en un único acta coherente: elimina duplicados, agrupa temas relacionados,
conserva todas las decisiones y acciones distintas y no agregues información nueva.

EXTRACTOS:
${JSON.stringify(compact, null, 1)}

Genera el acta completa respetando el esquema.`;

  return {
    messages: [
      { role: "system" as const, content: SYSTEM_RULES },
      { role: "user" as const, content: user },
    ],
  };
}

export function buildRepairPrompt(args: {
  raw: string;
  error: string;
  date?: string;
}) {
  const user = `El siguiente JSON debía respetar un esquema estricto pero falló la validación.

ERROR DE VALIDACIÓN:
${args.error}

JSON RECIBIDO:
"""
${args.raw.slice(0, 12000)}
"""

Corrige el JSON: conserva todo el contenido real, completa los campos faltantes con "" o [] según corresponda,
elimina claves desconocidas y devuelve únicamente el JSON corregido.
Fecha de la reunión de referencia: ${args.date || "no indicada"}.`;

  return {
    messages: [
      {
        role: "system" as const,
        content:
          "Eres un validador de datos. Reparas JSON para que cumpla un esquema exacto sin alterar su contenido. Respondes solo con JSON válido.",
      },
      { role: "user" as const, content: user },
    ],
  };
}
