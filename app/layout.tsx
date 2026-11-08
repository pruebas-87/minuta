import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minuta · Actas de reunión con IA local",
  description:
    "Convertí notas de reuniones en actas PDF profesionales usando un modelo de IA que corre en tu propia máquina.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line/70 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Minuta · las notas y los PDFs nunca salen de tu máquina.</span>
            <span className="font-mono text-[11px] text-muted-soft">
              Next.js + Ollama · procesamiento local
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
