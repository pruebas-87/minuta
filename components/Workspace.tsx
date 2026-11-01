"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Sparkles, Wand2 } from "lucide-react";
import type { MeetingRecord, MeetingSummary } from "@/lib/store";
import { formatRelative } from "@/lib/format";
import Composer, { type ComposePayload } from "./Composer";
import ProgressPanel, { type PhaseItem } from "./ProgressPanel";
import ResultPanel from "./ResultPanel";

type Status = "idle" | "working" | "done" | "error";

type ProgressState = {
  chars: number;
  percent: number;
  etaSeconds: number | null;
  note?: string;
};

type StreamEvent =
  | { type: "phase"; id: string; label: string; detail?: string }
  | { type: "progress"; chars: number; percent: number; etaSeconds: number | null; note?: string }
  | { type: "done"; meeting: MeetingRecord }
  | { type: "error"; message: string; hint?: string };

const STEPS = [
  {
    title: "Pegá las notas",
    body: "Texto, transcripción o un archivo .txt, .md, .docx o .pdf.",
  },
  {
    title: "La IA local estructura",
    body: "Detecta asistentes, decisiones, acciones con responsable y riesgos.",
  },
  {
    title: "Descargá el PDF",
    body: "Portada, tablas y numeración de páginas. Se guarda en el historial.",
  },
];

export default function Workspace({
  recent,
  today,
}: {
  recent: MeetingSummary[];
  today: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [progress, setProgress] = useState<ProgressState>({
    chars: 0,
    percent: 0,
    etaSeconds: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null);
  const [pending, setPending] = useState<ComposePayload | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);

  useEffect(() => {
    if (status !== "working") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  function applyEvent(event: StreamEvent) {
    if (event.type === "phase") {
      setPhases((prev) => {
        const index = prev.findIndex((item) => item.id === event.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { id: event.id, label: event.label, detail: event.detail };
          return next;
        }
        return [...prev, { id: event.id, label: event.label, detail: event.detail }];
      });
      setProgress((prev) => ({ ...prev, note: event.detail ?? event.label }));
      return;
    }

    if (event.type === "progress") {
      setProgress({
        chars: event.chars,
        percent: event.percent,
        etaSeconds: event.etaSeconds,
        note: event.note,
      });
      return;
    }

    if (event.type === "done") {
      setMeeting(event.meeting);
      setStatus("done");
      setProgress((prev) => ({ ...prev, percent: 100, etaSeconds: 0, note: "Listo" }));
      return;
    }

    if (event.type === "error") {
      setError(event.message);
      setHint(event.hint);
      setStatus("error");
    }
  }

  async function generate(payload: ComposePayload) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPending(payload);
    setMeeting(null);
    setError(null);
    setHint(undefined);
    setPhases([{ id: "preparando", label: "Preparando las notas" }]);
    setProgress({ chars: 0, percent: 2, etaSeconds: null, note: "Enviando al modelo local" });
    setStatus("working");
    setElapsed(0);
    startedRef.current = Date.now();

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `El servidor respondió ${res.status}.`);
      }
      if (!res.body) throw new Error("El servidor no devolvió progreso.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separator = buffer.indexOf("\n\n");
        while (separator >= 0) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          separator = buffer.indexOf("\n\n");

          const line = block.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          try {
            const event = JSON.parse(line.slice(5).trim()) as StreamEvent;
            applyEvent(event);
            if (event.type === "done" || event.type === "error") finished = true;
          } catch {
            // Ignorar líneas parciales o mal formadas.
          }
        }
      }

      if (!finished) {
        throw new Error("La conexión se cortó antes de terminar el acta.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setHint("Revisá que Ollama siga corriendo y volvé a intentar.");
      setStatus("error");
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }

  if (status === "done" && meeting) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <ResultPanel meeting={meeting} onReset={() => setStatus("idle")} />
      </div>
    );
  }

  if (status === "working" || status === "error") {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <ProgressPanel
              phases={phases}
              percent={progress.percent}
              chars={progress.chars}
              etaSeconds={progress.etaSeconds}
              note={progress.note}
              elapsedSeconds={elapsed}
              error={error}
              hint={hint}
              onCancel={cancel}
              onRetry={() => pending && void generate(pending)}
            />
            {pending && (
              <div className="card flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted" />
                <p className="truncate text-xs text-muted">
                  <span className="font-medium text-ink-soft">Notas cargadas:</span>{" "}
                  {pending.notes.length.toLocaleString("es")} caracteres
                  {pending.sourceName ? ` · ${pending.sourceName}` : ""}
                  {pending.project ? ` · ${pending.project}` : ""}
                </p>
              </div>
            )}
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Mientras esperás
              </p>
              <ul className="mt-3 space-y-3 text-sm text-ink-soft">
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  Un acta típica tarda entre 1 y 3 minutos; las notas largas se procesan por
                  fragmentos.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  El resultado se guarda solo: podés cerrar la pestaña y buscarlo en el historial.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  Si algo falla, el acta no se descarta: reintentar reutiliza las mismas notas.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <header className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              IA local · tus notas no salen de tu máquina
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">
              De notas sueltas a un acta impecable
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Pegá lo que se habló en la reunión. El modelo local la ordena en secciones,
              detecta decisiones y acciones con responsable, y arma un PDF corporativo listo
              para compartir.
            </p>
          </header>

          <Composer
            onSubmit={(payload) => void generate(payload)}
            busy={false}
            defaultDate={today}
          />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
                <Wand2 className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-ink">Cómo funciona</h2>
            </div>
            <ol className="mt-4 space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-white font-mono text-[10px] font-semibold text-muted">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              <p className="text-[11px] leading-relaxed text-muted">
                El acta se genera con <span className="font-medium text-ink-soft">qwen3.8:27b</span>{" "}
                en Ollama. Sin API keys, sin costos y sin enviar datos afuera.
              </p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">Recientes</h2>
              <Link
                href="/history"
                className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
              >
                Ver todo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-muted">
                  Todavía no generaste actas. La primera aparece acá.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/meetings/${item.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-[#fbfcfe]"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-muted ring-1 ring-line">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                          {item.project && <span>{item.project}</span>}
                          {item.project && <span className="text-muted-soft">·</span>}
                          <span>{formatRelative(item.createdAt)}</span>
                          <span className="text-muted-soft">·</span>
                          <span>{item.acciones} acciones</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
