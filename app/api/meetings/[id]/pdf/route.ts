import { readMeeting, readPdf, savePdf } from "@/lib/store";
import { pdfFileName, renderRecordPdf } from "@/lib/pdf/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function getRecord(id: string) {
  const record = await readMeeting(id);
  if (!record) return null;
  return record;
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const record = await getRecord(id);
  if (!record) {
    return Response.json({ error: "Acta no encontrada." }, { status: 404 });
  }

  let bytes: Uint8Array;
  const cached = await readPdf(id);
  if (cached) {
    bytes = cached;
  } else {
    // El PDF se borró o nunca se escribió: se regenera desde el JSON guardado.
    bytes = await renderRecordPdf(record);
    await savePdf(id, bytes);
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = pdfFileName(record);
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const record = await getRecord(id);
  if (!record) {
    return Response.json({ error: "Acta no encontrada." }, { status: 404 });
  }

  const bytes = await renderRecordPdf(record);
  await savePdf(id, bytes);

  return Response.json({ ok: true, bytes: bytes.byteLength, at: new Date().toISOString() });
}
