import type { MeetingRecord } from "../store";
import { renderPdfHtml } from "./render";
import { renderMeetingPdf } from "./chrome";

export async function renderRecordPdf(record: MeetingRecord): Promise<Uint8Array> {
  const html = renderPdfHtml(record.doc, {
    model: record.model,
    sourceName: record.source.name,
  });

  return renderMeetingPdf({
    ...html,
    title: record.doc.titulo,
    subject: `Acta de reunión · ${record.doc.proyecto || "General"}`,
    author: "Minuta",
    keywords: record.doc.palabrasClave,
  });
}

export function pdfFileName(record: MeetingRecord): string {
  const base = `${record.doc.titulo || "acta"} ${record.doc.fecha || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 70);
  return `${base || "acta-de-reunion"}.pdf`;
}
