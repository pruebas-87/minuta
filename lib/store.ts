import { promises as fs } from "node:fs";
import path from "node:path";
import { get, list, del, put } from "@vercel/blob";
import { MeetingDocSchema, type MeetingDoc } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data", "meetings");
const BLOB_DIR = "meetings";
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

/**
 * Modo almacenamiento: en producción serverless (Vercel) usamos Vercel Blob
 * porque el filesystem es efímero; en desarrollo local seguimos con archivos
 * en `data/meetings/`. El modo se elige por la presencia del token de Blob.
 */
const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

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

function assertId(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Identificador inválido");
}

const blobJsonPath = (id: string) => `${BLOB_DIR}/${id}.json`;
const blobPdfPath = (id: string) => `${BLOB_DIR}/${id}.pdf`;

export function meetingJsonPath(id: string) {
  assertId(id);
  return path.join(DATA_DIR, `${id}.json`);
}

export function meetingPdfPath(id: string) {
  assertId(id);
  return path.join(DATA_DIR, `${id}.pdf`);
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function putBlob(pathname: string, body: string | Buffer) {
  await put(pathname, body, { access: "public", addRandomSuffix: false });
}

async function getBlobText(pathname: string): Promise<string | null> {
  const result = await get(pathname, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const response = new Response(result.stream as unknown as BodyInit);
  return await response.text();
}

async function getBlobBytes(pathname: string): Promise<Uint8Array | null> {
  const result = await get(pathname, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const response = new Response(result.stream as unknown as BodyInit);
  return new Uint8Array(await response.arrayBuffer());
}

export async function saveMeeting(record: MeetingRecord): Promise<void> {
  assertId(record.id);
  const json = JSON.stringify(record, null, 2);
  if (BLOB_ENABLED) {
    await putBlob(blobJsonPath(record.id), json);
    return;
  }
  await ensureDir();
  await fs.writeFile(meetingJsonPath(record.id), json, "utf8");
}

export async function readMeeting(id: string): Promise<MeetingRecord | null> {
  const raw = BLOB_ENABLED ? await getBlobText(blobJsonPath(id)) : await readLocalText(meetingJsonPath(id));
  if (!raw) return null;
  try {
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

async function readLocalText(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function savePdf(id: string, bytes: Uint8Array): Promise<void> {
  assertId(id);
  if (BLOB_ENABLED) {
    await putBlob(blobPdfPath(id), Buffer.from(bytes));
    return;
  }
  await ensureDir();
  await fs.writeFile(meetingPdfPath(id), bytes);
}

export async function readPdf(id: string): Promise<Uint8Array | null> {
  assertId(id);
  if (BLOB_ENABLED) return await getBlobBytes(blobPdfPath(id));
  try {
    return new Uint8Array(await fs.readFile(meetingPdfPath(id)));
  } catch {
    return null;
  }
}

export async function hasPdf(id: string): Promise<boolean> {
  assertId(id);
  if (BLOB_ENABLED) {
    const { blobs } = await list({ prefix: blobPdfPath(id), limit: 1 });
    return blobs.length > 0;
  }
  try {
    await fs.access(meetingPdfPath(id));
    return true;
  } catch {
    return false;
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  assertId(id);
  if (BLOB_ENABLED) {
    const { blobs } = await list({ prefix: `${BLOB_DIR}/${id}.`, limit: 1000 });
    if (blobs.length > 0) await del(blobs.map((blob) => blob.url));
    return;
  }
  await Promise.all([
    fs.rm(meetingJsonPath(id), { force: true }),
    fs.rm(meetingPdfPath(id), { force: true }),
  ]);
}

export async function listMeetings(query?: string): Promise<MeetingSummary[]> {
  let ids: string[];
  if (BLOB_ENABLED) {
    const { blobs } = await list({ prefix: `${BLOB_DIR}/`, limit: 1000 });
    ids = blobs
      .filter((blob) => blob.pathname.endsWith(".json"))
      .map((blob) => blob.pathname.replace(new RegExp(`^${BLOB_DIR}/`), "").replace(/\.json$/, ""));
  } else {
    await ensureDir();
    const entries = await fs.readdir(DATA_DIR).catch(() => [] as string[]);
    ids = entries.filter((name) => name.endsWith(".json")).map((name) => name.replace(/\.json$/, ""));
  }

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
