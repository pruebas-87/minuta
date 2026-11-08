import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` se anuncia como localhost; permitir también 127.0.0.1 evita que
  // Next bloquee los recursos de desarrollo (HMR, chunks) y la app no hidrate.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // These packages ship their own runtime assets / native-ish bindings and must
  // stay outside the Turbopack server bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "mammoth", "unpdf", "pdf-lib"],
  // El Chromium serverless lee sus propios binarios (.br) en runtime; el trazador
  // no los detecta, así que se incluyen explícitamente para las rutas que lo usan.
  outputFileTracingIncludes: {
    "/api/meetings": ["node_modules/@sparticuz/chromium/**"],
    "/api/meetings/[id]/pdf": ["node_modules/@sparticuz/chromium/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
