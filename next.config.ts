import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` se anuncia como localhost; permitir también 127.0.0.1 evita que
  // Next bloquee los recursos de desarrollo (HMR, chunks) y la app no hidrate.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // These packages ship their own runtime assets / native-ish bindings and must
  // stay outside the Turbopack server bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "mammoth", "unpdf", "pdf-lib"],
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
