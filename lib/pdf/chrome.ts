import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import { PDFDocument } from "pdf-lib";

/**
 * En Vercel no hay Chrome del sistema ni filesystem persistente:
 * usamos @sparticuz/chromium (binario headless para serverless).
 * El paquete descomprime su binario y sus fuentes (Open Sans) a /tmp y
 * define FONTCONFIG_PATH automáticamente, así que no hace falta extra.
 * Detectamos el entorno por la variable VERCEL que la plataforma define.
 */
const IS_SERVERLESS = process.env.VERCEL === "1";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((candidate): candidate is string => Boolean(candidate));

let chromePathCache: string | null = null;
let browserPromise: Promise<Browser> | null = null;

export class ChromeError extends Error {
  hint: string;

  constructor(message: string, hint: string) {
    super(message);
    this.name = "ChromeError";
    this.hint = hint;
  }
}

export function findChrome(): string {
  if (chromePathCache) return chromePathCache;
  const found = CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new ChromeError(
      "No se encontró Chrome ni Edge para generar el PDF.",
      "Instalá Chrome o definí CHROME_PATH en .env.local apuntando al ejecutable.",
    );
  }
  chromePathCache = found;
  return found;
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      if (browser.connected) return browser;
    } catch {
      // relanzar abajo
    }
    browserPromise = null;
  }

  if (IS_SERVERLESS) {
    browserPromise = (async () => {
      const [{ default: puppeteer }, chromiumModule] = await Promise.all([
        import("puppeteer-core"),
        import("@sparticuz/chromium"),
      ]);
      const engine = chromiumModule.default;
      engine.setGraphicsMode = false; // Menos memoria y extracción más rápida (sobra swiftshader)
      const browser = await puppeteer.launch({
        args: [...engine.args, "--font-render-hinting=none"],
        executablePath: await engine.executablePath(),
        headless: true,
      });
      browser.on("disconnected", () => {
        browserPromise = null;
      });
      return browser;
    })();
    return browserPromise;
  }

  const executablePath = findChrome();
  browserPromise = (async () => {
    const { default: puppeteer } = await import("puppeteer-core");
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
        "--disable-extensions",
      ],
    });
    browser.on("disconnected", () => {
      browserPromise = null;
    });
    return browser;
  })();

  return browserPromise;
}

type RenderInput = {
  cover: string;
  body: string;
  header: string;
  footer: string;
  title: string;
  subject: string;
  author: string;
  keywords: string[];
};

const A4 = { width: "210mm", height: "297mm" };

export async function renderMeetingPdf(input: RenderInput): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.emulateMediaType("print");

    await page.setContent(input.cover, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const coverBytes = await page.pdf({
      width: A4.width,
      height: A4.height,
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    await page.setContent(input.body, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    const bodyBytes = await page.pdf({
      width: A4.width,
      height: A4.height,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: input.header,
      footerTemplate: input.footer,
      margin: { top: "20mm", right: "18mm", bottom: "18mm", left: "18mm" },
    });

    const merged = await PDFDocument.create();
    merged.setTitle(input.title);
    merged.setSubject(input.subject);
    merged.setAuthor(input.author);
    merged.setCreator("Minuta");
    merged.setProducer("Minuta · Chrome print engine");
    merged.setKeywords(input.keywords);
    merged.setCreationDate(new Date());

    for (const bytes of [coverBytes, bodyBytes]) {
      const source = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((pdfPage) => merged.addPage(pdfPage));
    }

    return await merged.save();
  } finally {
    await page.close().catch(() => undefined);
  }
}
