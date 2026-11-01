import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  FolderKanban,
  ListChecks,
  Search,
  X,
} from "lucide-react";
import { listMeetings } from "@/lib/store";
import { formatDateLong, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim();
  const meetings = await listMeetings(query || undefined);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Historial de actas
          </h1>
          <p className="mt-1 text-sm text-muted">
            {meetings.length === 0
              ? "Sin resultados"
              : `${meetings.length} ${meetings.length === 1 ? "acta guardada" : "actas guardadas"}`}
            {query ? ` para “${query}”` : ""}
          </p>
        </div>

        <form action="/history" method="get" className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar por título o proyecto"
              className="field pl-9"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            Buscar
          </button>
          {query && (
            <Link
              href="/history"
              className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-muted transition hover:text-ink"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </form>
      </div>

      {meetings.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <FileText className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink">
            {query ? "No encontramos actas con ese criterio" : "Todavía no hay actas"}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            {query
              ? "Probá con otra palabra o revisá el historial completo."
              : "Generá tu primera acta a partir de las notas de una reunión."}
          </p>
          <Link
            href={query ? "/history" : "/"}
            className="mt-5 flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            {query ? "Ver todo" : "Nueva acta"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {meetings.map((item) => (
            <li key={item.id}>
              <Link
                href={`/meetings/${item.id}`}
                className="card group flex flex-col gap-4 px-5 py-4 transition hover:border-brand-line hover:shadow-md sm:flex-row sm:items-center"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <FileText className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-ink">{item.title}</h2>
                    {item.type && (
                      <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                        {item.type}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    {item.project && (
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {item.project}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDateLong(item.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3 w-3" />
                      {item.acciones} acciones
                    </span>
                    {item.asistentes.length > 0 && (
                      <span className="hidden truncate sm:inline">
                        {item.asistentes.slice(0, 3).join(", ")}
                        {item.asistentes.length > 3 ? ` +${item.asistentes.length - 3}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[11px] text-muted-soft">{formatRelative(item.createdAt)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-soft transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
