import { z } from "zod";

export const AttendeeSchema = z.object({
  nombre: z.string(),
  rol: z.string().default(""),
});

export const TopicSchema = z.object({
  titulo: z.string(),
  puntos: z.array(z.string()).default([]),
  decisiones: z.array(z.string()).default([]),
});

export const ActionSchema = z.object({
  tarea: z.string(),
  responsable: z.string().default(""),
  fecha: z.string().default(""),
  prioridad: z.string().default("media"),
  estado: z.string().default("pendiente"),
});

export const RiskSchema = z.object({
  descripcion: z.string(),
  impacto: z.string().default(""),
  mitigacion: z.string().default(""),
});

export const MeetingDocSchema = z.object({
  titulo: z.string().default(""),
  fecha: z.string().default(""),
  proyecto: z.string().default(""),
  tipo: z.string().default("Reunión de trabajo"),
  asistentes: z.array(AttendeeSchema).default([]),
  resumenEjecutivo: z.array(z.string()).default([]),
  contexto: z.string().default(""),
  temas: z.array(TopicSchema).default([]),
  decisiones: z.array(z.string()).default([]),
  acciones: z.array(ActionSchema).default([]),
  riesgos: z.array(RiskSchema).default([]),
  preguntasAbiertas: z.array(z.string()).default([]),
  proximosPasos: z.array(z.string()).default([]),
  palabrasClave: z.array(z.string()).default([]),
});

export type Attendee = z.infer<typeof AttendeeSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type MeetingDoc = z.infer<typeof MeetingDocSchema>;

/**
 * JSON Schema que se envía a Ollama en `format`. Ollama restringe la gramática
 * de muestreo a esta estructura, así que el modelo no puede devolver prosa.
 */
export const MEETING_JSON_SCHEMA = {
  type: "object",
  properties: {
    titulo: {
      type: "string",
      description: "Título descriptivo de 3 a 8 palabras, sin la palabra reunión.",
    },
    fecha: {
      type: "string",
      description: "Fecha de la reunión en formato AAAA-MM-DD, o cadena vacía.",
    },
    proyecto: { type: "string", description: "Proyecto o área. Cadena vacía si no se menciona." },
    tipo: {
      type: "string",
      description: "Tipo de reunión: kickoff, seguimiento, revisión, retrospectiva, etc.",
    },
    asistentes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          rol: { type: "string", description: "Rol o área. Cadena vacía si no se indica." },
        },
        required: ["nombre", "rol"],
      },
    },
    resumenEjecutivo: {
      type: "array",
      minItems: 1,
      items: { type: "string", description: "Una idea por viñeta, máximo 25 palabras." },
    },
    contexto: { type: "string", description: "Uno o dos párrafos de contexto previo. Cadena vacía si no aplica." },
    temas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          puntos: { type: "array", items: { type: "string" } },
          decisiones: { type: "array", items: { type: "string" } },
        },
        required: ["titulo", "puntos", "decisiones"],
      },
    },
    decisiones: { type: "array", items: { type: "string" } },
    acciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tarea: { type: "string", description: "Acción concreta en infinitivo o imperativo." },
          responsable: { type: "string", description: "Nombre tal como aparece en las notas." },
          fecha: { type: "string", description: "Fecha límite AAAA-MM-DD, o cadena vacía." },
          prioridad: {
            type: "string",
            enum: ["alta", "media", "baja"],
            description: "alta solo si vence en 7 días, bloquea a otros o es compromiso explícito; media por defecto.",
          },
          estado: { type: "string", enum: ["pendiente", "en curso", "bloqueada", "hecha"] },
        },
        required: ["tarea", "responsable", "fecha", "prioridad", "estado"],
      },
    },
    riesgos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" },
          impacto: { type: "string", enum: ["alto", "medio", "bajo"] },
          mitigacion: { type: "string" },
        },
        required: ["descripcion", "impacto", "mitigacion"],
      },
    },
    preguntasAbiertas: {
      type: "array",
      items: { type: "string", description: "Pregunta breve sobre algo que quedó sin definir." },
    },    proximosPasos: { type: "array", items: { type: "string" } },
    palabrasClave: { type: "array", maxItems: 8, items: { type: "string" } },
  },
  required: [
    "titulo",
    "fecha",
    "proyecto",
    "tipo",
    "asistentes",
    "resumenEjecutivo",
    "contexto",
    "temas",
    "decisiones",
    "acciones",
    "riesgos",
    "preguntasAbiertas",
    "proximosPasos",
    "palabrasClave",
  ],
} as const;

/** Versión reducida para la fase map de notas largas. */
export const CHUNK_JSON_SCHEMA = {
  type: "object",
  properties: {
    resumen: { type: "array", items: { type: "string" } },
    personas: { type: "array", items: { type: "string" } },
    decisiones: { type: "array", items: { type: "string" } },
    acciones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tarea: { type: "string" },
          responsable: { type: "string" },
          fecha: { type: "string" },
          prioridad: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["tarea", "responsable", "fecha", "prioridad"],
      },
    },
    riesgos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" },
          impacto: { type: "string", enum: ["alto", "medio", "bajo"] },
          mitigacion: { type: "string" },
        },
        required: ["descripcion", "impacto", "mitigacion"],
      },
    },
    preguntas: { type: "array", items: { type: "string" } },
  },
  required: ["resumen", "personas", "decisiones", "acciones", "riesgos", "preguntas"],
} as const;

export const ChunkExtractSchema = z.object({
  resumen: z.array(z.string()).default([]),
  personas: z.array(z.string()).default([]),
  decisiones: z.array(z.string()).default([]),
  acciones: z
    .array(
      z.object({
        tarea: z.string(),
        responsable: z.string().default(""),
        fecha: z.string().default(""),
        prioridad: z.string().default("media"),
      }),
    )
    .default([]),
  riesgos: z.array(RiskSchema).default([]),
  preguntas: z.array(z.string()).default([]),
});

export type ChunkExtract = z.infer<typeof ChunkExtractSchema>;
