import { promises as fs } from "node:fs";
import path from "node:path";
import { MeetingDocSchema, type MeetingDoc } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data", "meetings");
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

export type MeetingRecord = {
  id: string;
  createdAt: string;
  model: string;
  durationMs: number;
  source: {
    name: string;
    chars: number;
    kind: "texto" | "archivo";
  };
  doc: MeetingDoc;
  stats: {
    acciones: number;
    decisiones: number;
    riesgos: number;
    temas: number;
    asistentes: number;
  };
};

export type MeetingSummary = {
  id: string;
  createdAt: string;
  title: string;
  project: string;
  date: string;
  type: string;
  acciones: number;
  decisiones: number;
  asistentes: string[];
  hasPdf: boolean;
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function assertId(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Identificador inválido");
}

export function meetingJsonPath(id: string) {
  assertId(id);
  return path.join(DATA_DIR, `${id}.json`);
}

export function meetingPdfPath(id: string) {
  assertId(id);
  return path.join(DATA_DIR, `${id}.pdf`);
}

export async function saveMeeting(record: MeetingRecord): Promise<void> {
  assertId(record.id);
  await ensureDir();
  await fs.writeFile(meetingJsonPath(record.id), JSON.stringify(record, null, 2), "utf8");
}

export async function readMeeting(id: string): Promise<MeetingRecord | null> {
  try {
    const raw = await fs.readFile(meetingJsonPath(id), "utf8");
    const parsed = JSON.parse(raw) as MeetingRecord;
    const doc = MeetingDocSchema.safeParse(parsed.doc);
    if (!doc.success) return null;
    return {
      ...parsed,
      doc: doc.data,
      stats: parsed.stats ?? computeStats(doc.data),
    };
  } catch {
    return null;
  }
}

export async function savePdf(id: string, bytes: Uint8Array): Promise<void> {
  await ensureDir();
  await fs.writeFile(meetingPdfPath(id), bytes);
}

export async function hasPdf(id: string): Promise<boolean> {
  try {
    await fs.access(meetingPdfPath(id));
    return true;
  } catch {
    return false;
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  assertId(id);
  await Promise.all([
    fs.rm(meetingJsonPath(id), { force: true }),
    fs.rm(meetingPdfPath(id), { force: true }),
  ]);
}

export async function listMeetings(query?: string): Promise<MeetingSummary[]> {
  await ensureDir();
  const entries = await fs.readdir(DATA_DIR).catch(() => [] as string[]);
  const ids = entries.filter((name) => name.endsWith(".json")).map((name) => name.replace(/\.json$/, ""));

  const records = await Promise.all(
    ids.map(async (id) => {
      const record = await readMeeting(id);
      if (!record) return null;
      const pdf = await hasPdf(id);
      return toSummary(record, pdf);
    }),
  );

  const summaries = records.filter((r): r is MeetingSummary => r !== null);
  const sorted = summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const needle = query?.trim().toLowerCase();
  if (!needle) return sorted;

  const tokens = needle.split(/\s+/).filter(Boolean);
  return sorted.filter((item) => {
    const haystack = `${item.title} ${item.project} ${item.date} ${item.type} ${item.asistentes.join(" ")}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function computeStats(doc: MeetingDoc): MeetingRecord["stats"] {
  return {
    acciones: doc.acciones.length,
    decisiones: doc.decisiones.length,
    riesgos: doc.riesgos.length,
    temas: doc.temas.length,
    asistentes: doc.asistentes.length,
  };
}

function toSummary(record: MeetingRecord, pdf: boolean): MeetingSummary {
  return {
    id: record.id,
    createdAt: record.createdAt,
    title: record.doc.titulo || "Acta sin título",
    project: record.doc.proyecto || "",
    date: record.doc.fecha || "",
    type: record.doc.tipo || "",
    acciones: record.doc.acciones.length,
    decisiones: record.doc.decisiones.length,
    asistentes: record.doc.asistentes.map((a) => a.nombre).filter(Boolean),
    hasPdf: pdf,
  };
}
