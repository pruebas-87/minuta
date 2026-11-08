"use client";

import { useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  FileUp,
  FolderKanban,
  ListChecks,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { SAMPLE_NOTES } from "@/lib/sample";

export type ComposePayload = {
  notes: string;
  title: string;
  date: string;
  project: string;
  type: string;
  sourceName?: string;
  sourceKind?: "texto" | "archivo";
};

const TYPES = [
  "Seguimiento",
  "Kickoff",
  "Revisión",
  "Planificación",
  "Retrospectiva",
  "Decisión",
  "Otra",
];

export default function Composer({
  onSubmit,
  busy,
  defaultDate,
}: {
  onSubmit: (payload: ComposePayload) => void;
  busy: boolean;
  defaultDate: string;
}) {
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [project, setProject] = useState("");
  const [type, setType] = useState("Seguimiento");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const chars = notes.trim().length;
  const ready = chars >= 40 && !busy && !uploading;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? "No se pudo leer el archivo.");
      }
      setNotes((prev) => (prev.trim() ? `${prev.trim()}\n\n${data.text}` : data.text!));
      setSourceName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSubmit({
      notes: notes.trim(),
      title: title.trim(),
      date,
      project: project.trim(),
      type,
      sourceName: sourceName ?? undefined,
      sourceKind: sourceName ? "archivo" : "texto",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <Wand2 className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Notas de la reunión</h2>
            <p className="text-xs text-muted">Pegá el texto o arrastrá un archivo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[11px] ${
              chars === 0 ? "text-muted-soft" : chars < 40 ? "text-warn" : "text-muted"
            }`}
          >
            {chars.toLocaleString("es")} caracteres
          </span>
          <button
            type="button"
            onClick={() => {
              setNotes(SAMPLE_NOTES);
              setSourceName(null);
              setTitle("");
              setProject("Atlas");
              setType("Seguimiento");
              setError(null);
            }}
            disabled={busy}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
          >
            Usar ejemplo
          </button>
        </div>
      </div>

      <div
        className={`relative px-5 pt-5 sm:px-6 ${dragging ? "bg-brand-soft/60" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) void handleFiles(event.dataTransfer.files);
        }}
      >
        <textarea
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setSourceName(null);
          }}
          disabled={busy}
          spellCheck={false}
          placeholder={
            "Pegá acá las notas, la transcripción o el resumen de la reunión.\n\nEjemplo:\nReunión de seguimiento del proyecto Atlas. Asisten Ana (PM), Luis (backend) y Marta (diseño). Se decidió migrar a Postgres. Ana entrega el cronograma el viernes 20..."
          }
          className="min-h-[240px] w-full resize-y rounded-xl border border-line bg-white px-4 py-3.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50 disabled:text-muted"
        />

        {dragging && (
          <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-2xl border-2 border-dashed border-brand bg-white/80">
            <div className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-lg">
              <FileUp className="h-4 w-4" />
              Soltá el archivo para extraer el texto
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3 sm:px-6">
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.markdown,.docx,.pdf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy || uploading}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          {uploading ? "Extrayendo…" : "Subir archivo"}
        </button>

        {sourceName && (
          <span className="flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand">
            <FileUp className="h-3.5 w-3.5" />
            <span className="max-w-[220px] truncate">{sourceName}</span>
            <button
              type="button"
              onClick={() => {
                setSourceName(null);
              }}
              className="rounded p-0.5 hover:bg-brand/10"
              aria-label="Quitar archivo"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        <span className="text-[11px] text-muted-soft">.txt · .md · .docx · .pdf</span>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-xl border border-[#fecdca] bg-danger-soft px-3.5 py-2.5 text-xs text-danger sm:mx-6">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <label htmlFor="date" className="label flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Fecha de la reunión
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={busy}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="project" className="label flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Proyecto o área
          </label>
          <input
            id="project"
            type="text"
            value={project}
            onChange={(event) => setProject(event.target.value)}
            disabled={busy}
            placeholder="Ej. Atlas, Operaciones, Clientes"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="type" className="label flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            Tipo de reunión
          </label>
          <div className="relative">
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              disabled={busy}
              className="field appearance-none pr-9"
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div>
          <label htmlFor="title" className="label">
            Título <span className="normal-case tracking-normal text-muted-soft">(opcional)</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
            placeholder="La IA lo propone si lo dejás vacío"
            className="field"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#fbfcfe] px-5 py-4 sm:px-6">
        <p className="max-w-xs text-[11px] leading-relaxed text-muted">
          Todo se procesa en tu máquina. Un acta típica tarda entre 1 y 3 minutos con el modelo
          local.
        </p>
        <button
          type="submit"
          disabled={!ready}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-brand to-brand-strong px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <Sparkles className="h-4 w-4" />
          Generar acta
        </button>
      </div>
    </form>
  );
}
