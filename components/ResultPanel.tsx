"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderKanban,
  ListChecks,
  Plus,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import type { MeetingRecord } from "@/lib/store";
import { formatDateLong, formatDuration } from "@/lib/format";

export default function ResultPanel({
  meeting,
  onReset,
}: {
  meeting: MeetingRecord;
  onReset: () => void;
}) {
  const { doc } = meeting;
  const pdfUrl = `/api/meetings/${meeting.id}/pdf`;

  const stats = [
    { label: "Acciones", value: meeting.stats.acciones, icon: ListChecks },
    { label: "Decisiones", value: meeting.stats.decisiones, icon: CheckCircle2 },
    { label: "Riesgos", value: meeting.stats.riesgos, icon: ShieldAlert },
    { label: "Participantes", value: meeting.stats.asistentes, icon: Users },
  ];

  return (
    <div className="animate-fade-up space-y-6">
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[#f4f8ff] via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:px-7">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok shadow-[0_0_0_1px_#d1fadf]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ok">
              Acta lista
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {doc.titulo}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateLong(doc.fecha)}
              </span>
              {doc.proyecto && (
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {doc.proyecto}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {formatDuration(meeting.durationMs)} · {meeting.model}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${pdfUrl}?download=1`}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.6)] transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir
            </a>
            <Link
              href={`/meetings/${meeting.id}`}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-slate-50"
            >
              Detalle
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted transition hover:text-ink"
            >
              <Plus className="h-4 w-4" />
              Nueva
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Vista previa
            </span>
            <span className="text-[11px] text-muted-soft">A4 · listo para imprimir</span>
          </div>
          <iframe
            src={`${pdfUrl}#view=FitH`}
            title={`Vista previa de ${doc.titulo}`}
            className="h-[680px] w-full bg-slate-100"
          />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Contenido extraído
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-line bg-[#fbfcfe] p-3">
                    <Icon className="h-4 w-4 text-brand" strokeWidth={1.8} />
                    <div className="mt-2 text-xl font-semibold tabular-nums text-ink">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-muted">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {doc.resumenEjecutivo.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Resumen
                </p>
                <ul className="mt-2.5 space-y-2">
                  {doc.resumenEjecutivo.slice(0, 4).map((line) => (
                    <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {doc.asistentes.length > 0 && (
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Participantes
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.asistentes.map((person) => (
                  <span
                    key={person.nombre}
                    className="flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-xs text-brand"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-bold">
                      {person.nombre.charAt(0).toUpperCase()}
                    </span>
                    {person.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
