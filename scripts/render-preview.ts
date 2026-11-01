/**
 * Utilidad de desarrollo: captura el HTML de la plantilla PDF como PNG.
 *
 * Uso: npx tsx scripts/render-preview.ts <url> <salida.png> [cover|body]
 */
import puppeteer from "puppeteer-core";
import { findChrome } from "../lib/pdf/chrome";

async function main() {
  const [url, out = "preview.png", mode = "cover"] = process.argv.slice(2);
  if (!url) {
    console.error("Uso: tsx scripts/render-preview.ts <url> <salida.png> [cover|body]");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "load" });

    if (mode === "body") {
      await page.addStyleTag({
        content:
          "html{background:#e9edf4}body{width:174mm;margin:0 auto;padding:20mm 18mm 18mm;background:#fff;box-shadow:0 0 0 1px #dfe4ec}",
      });
    } else {
      await page.addStyleTag({ content: "html{background:#e9edf4}" });
    }

    await page.screenshot({ path: out, fullPage: true });
    console.log("PNG:", out);
  } finally {
    await browser.close();
  }
}

void main();
