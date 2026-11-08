"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderKanban,
  ListChecks,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { MeetingRecord } from "@/lib/store";
import { formatDateLong, formatDateTime, formatDuration } from "@/lib/format";
import DocDetails from "./DocDetails";

export default function MeetingDetail({ meeting }: { meeting: MeetingRecord }) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<"regenerating" | "deleting" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `/api/meetings/${meeting.id}/pdf`;
  const { doc } = meeting;

  async function regenerate() {
    setBusy("regenerating");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(pdfUrl, { method: "POST" });
      if (!res.ok) throw new Error("No se pudo regenerar el PDF.");
      setVersion(Date.now());
      setMessage("PDF regenerado con la plantilla actual.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo regenerar el PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("deleting");
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el acta.");
      router.push("/history");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el acta.");
      setBusy(null);
      setConfirming(false);
    }
  }

  const stats = [
    { label: "Acciones", value: meeting.stats.acciones, icon: ListChecks },
    { label: "Decisiones", value: meeting.stats.decisiones, icon: CheckCircle2 },
    { label: "Riesgos", value: meeting.stats.riesgos, icon: ShieldAlert },
    { label: "Asistentes", value: meeting.stats.asistentes, icon: Users },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Historial
      </Link>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted">
              {doc.tipo || "Reunión"}
            </span>
            {doc.proyecto && (
              <span className="flex items-center gap-1 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
                <FolderKanban className="h-3 w-3" />
                {doc.proyecto}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {doc.titulo}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateLong(doc.fecha)}
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {meeting.model} · {formatDuration(meeting.durationMs)}
            </span>
            <span>Generada el {formatDateTime(meeting.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`${pdfUrl}?download=1&v=${version}`}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.6)] transition hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            Descargar
          </a>
          <a
            href={`${pdfUrl}?v=${version}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </a>
          <button
            type="button"
            onClick={() => void regenerate()}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "regenerating" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerar
          </button>

          {confirming ? (
            <span className="flex items-center gap-1.5 rounded-xl border border-[#fecdca] bg-danger-soft px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy !== null}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busy === "deleting" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-danger hover:bg-white/60"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
              className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-muted transition hover:text-danger disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#d1fadf] bg-ok-soft px-3.5 py-2.5 text-xs text-ok">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-[#fecdca] bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="card overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              PDF del acta
            </span>
            <span className="text-[11px] text-muted-soft">A4</span>
          </div>
          <iframe
            key={version}
            src={`${pdfUrl}?v=${version}#view=FitH`}
            title={`PDF de ${doc.titulo}`}
            className="h-[720px] w-full bg-slate-100"
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
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Origen</dt>
                <dd className="truncate text-right font-medium text-ink-soft">
                  {meeting.source.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Tamaño de las notas</dt>
                <dd className="font-medium text-ink-soft">
                  {meeting.source.chars.toLocaleString("es")} caracteres
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Temas</dt>
                <dd className="font-medium text-ink-soft">{meeting.stats.temas}</dd>
              </div>
            </dl>
          </div>

          {doc.asistentes.length > 0 && (
            <div className="card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Participantes
              </p>
              <ul className="mt-3 space-y-2.5">
                {doc.asistentes.map((person) => (
                  <li key={person.nombre} className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-soft text-[10px] font-bold text-brand">
                      {person.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {person.nombre}
                      </span>
                      {person.rol && (
                        <span className="block truncate text-[11px] text-muted">{person.rol}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-6 p-6 sm:p-7">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-ink">Contenido del acta</h2>
        <DocDetails doc={doc} />
      </div>
    </div>
  );
}
