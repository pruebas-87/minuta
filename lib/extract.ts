export type ExtractResult = {
  text: string;
  name: string;
  kind: "texto" | "docx" | "pdf" | "markdown";
  chars: number;
};

const MAX_FILE_BYTES = 30 * 1024 * 1024;

export function normalizeNotes(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, "  ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("El archivo supera los 30 MB. Pegá el texto o dividí las notas.");
  }

  const ext = extensionOf(file.name);
  const buffer = await file.arrayBuffer();
  let text = "";
  let kind: ExtractResult["kind"] = "texto";

  if (ext === "docx") {
    text = await extractDocx(buffer);
    kind = "docx";
  } else if (ext === "pdf") {
    text = await extractPdf(buffer);
    kind = "pdf";
  } else if (ext === "md" || ext === "markdown") {
    text = new TextDecoder("utf-8").decode(buffer);
    kind = "markdown";
  } else if (ext === "txt" || ext === "text" || file.type.startsWith("text/") || !ext) {
    text = new TextDecoder("utf-8").decode(buffer);
    kind = "texto";
  } else if (ext === "doc") {
    throw new Error(
      "El formato .doc antiguo no está soportado. Guardalo como .docx o pegá el texto.",
    );
  } else if (ext === "rtf") {
    throw new Error("El formato .rtf no está soportado. Guardalo como .docx o pegá el texto.");
  } else {
    throw new Error(`Formato .${ext} no soportado. Usá .txt, .md, .docx o .pdf.`);
  }

  const normalized = normalizeNotes(text);

  if (normalized.length < 20) {
    throw new Error(
      "No se pudo extraer texto suficiente del archivo. Si es un PDF escaneado, pegá las notas como texto.",
    );
  }

  return { text: normalized, name: file.name, kind, chars: normalized.length };
}

/**
 * Parte las notas en bloques de tamaño manejable respetando párrafos.
 * Se usa solo cuando las notas no entran cómodamente en una sola llamada.
 */
export function splitIntoChunks(notes: string, maxChars = 9000): string[] {
  if (notes.length <= maxChars) return [notes];

  const paragraphs = notes.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      push();
      // Párrafo gigante: cortar por oraciones.
      const sentences = paragraph.match(/[^.!?\n]+[.!?]?/g) ?? [paragraph];
      let piece = "";
      for (const sentence of sentences) {
        if ((piece + sentence).length > maxChars) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = sentence;
        } else {
          piece += sentence;
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }

    if ((current + "\n\n" + paragraph).length > maxChars) {
      push();
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  push();

  return chunks.length ? chunks : [notes];
}
