import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <FileQuestion className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-ink">No encontramos esa acta</h1>
      <p className="mt-1.5 text-sm text-muted">
        Puede que se haya eliminado o que el enlace esté mal.
      </p>
      <Link
        href="/history"
        className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
      >
        Ir al historial
      </Link>
    </div>
  );
}
