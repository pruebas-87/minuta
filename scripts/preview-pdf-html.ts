/**
 * Utilidad de desarrollo: vuelca el HTML de la plantilla PDF a /public para
 * inspeccionarlo en el navegador con las mismas medidas de impresión.
 *
 * Uso: npx tsx scripts/preview-pdf-html.ts <id-del-acta>
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { readMeeting } from "../lib/store";
import { renderPdfHtml } from "../lib/pdf/render";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Falta el id del acta.");
    process.exit(1);
  }

  const record = await readMeeting(id);
  if (!record) {
    console.error("Acta no encontrada:", id);
    process.exit(1);
  }

  const html = renderPdfHtml(record.doc, {
    model: record.model,
    sourceName: record.source.name,
  });

  const dir = path.join(process.cwd(), "public");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "__preview_cover.html"), html.cover, "utf8");
  await fs.writeFile(path.join(dir, "__preview_body.html"), html.body, "utf8");

  console.log("Listo: /__preview_cover.html y /__preview_body.html");
}

void main();
