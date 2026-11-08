"use client";

import { AlertTriangle, Check, Clock3, Loader2, RotateCcw, X } from "lucide-react";
import { formatEta, formatNumber } from "@/lib/format";

export type PhaseItem = {
  id: string;
  label: string;
  detail?: string;
};

export default function ProgressPanel({
  phases,
  percent,
  chars,
  etaSeconds,
  note,
  elapsedSeconds,
  error,
  hint,
  onCancel,
  onRetry,
}: {
  phases: PhaseItem[];
  percent: number;
  chars: number;
  etaSeconds: number | null;
  note?: string;
  elapsedSeconds: number;
  error: string | null;
  hint?: string;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="card animate-fade-up overflow-hidden">
        <div className="flex items-start gap-3 border-b border-[#fecdca] bg-danger-soft px-5 py-4 sm:px-6">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-danger">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">No se pudo generar el acta</h2>
            <p className="text-xs text-danger">{error}</p>
          </div>
        </div>
        {hint && (
          <div className="border-b border-line px-5 py-4 text-sm text-ink-soft sm:px-6">
            <p className="rounded-lg bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">{hint}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-slate-50"
          >
            Volver a las notas
          </button>
        </div>
      </div>
    );
  }

  const activeIndex = phases.length - 1;

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={2} />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-ink">Generando el acta</h2>
          <p className="text-xs text-muted">{note ?? "El modelo local está trabajando"}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums text-ink">{percent}%</div>
          <div className="flex items-center justify-end gap-1 text-[11px] text-muted">
            <Clock3 className="h-3 w-3" />
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#60a5fa] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(3, percent)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>{formatNumber(chars)} caracteres generados</span>
          <span>{formatEta(etaSeconds)}</span>
        </div>

        <ul className="mt-5 space-y-3">
          {phases.map((phase, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li key={phase.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${
                    done
                      ? "border-[#6ce9a6] bg-ok-soft text-ok"
                      : active
                        ? "border-brand bg-brand text-white animate-pulse-ring"
                        : "border-line bg-white text-muted-soft"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm leading-snug ${
                      active ? "font-semibold text-ink" : done ? "text-ink-soft" : "text-muted"
                    }`}
                  >
                    {phase.label}
                  </p>
                  {phase.detail && <p className="text-[11px] text-muted">{phase.detail}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcfe] px-5 py-3 sm:px-6">
        <p className="text-[11px] text-muted">
          Podés dejarlo correr: el acta se guarda automáticamente al terminar.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-muted transition hover:text-danger"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
