import { health } from "@/lib/ollama";
import { findChrome } from "@/lib/pdf/chrome";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await health();

  let chrome: { ok: boolean; error?: string; hint?: string } = { ok: true };
  try {
    findChrome();
  } catch (error) {
    chrome = {
      ok: false,
      error: error instanceof Error ? error.message : "Chrome no encontrado",
      hint: "Definí CHROME_PATH en .env.local",
    };
  }

  return Response.json({ ...report, chrome }, { headers: { "Cache-Control": "no-store" } });
}
