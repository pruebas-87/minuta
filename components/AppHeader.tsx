"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, History } from "lucide-react";
import StatusPill from "./StatusPill";

const LINKS = [
  { href: "/", label: "Nueva acta", icon: FilePlus2 },
  { href: "/history", label: "Historial", icon: History },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0b1e45] via-[#123a7d] to-brand text-white shadow-sm transition group-hover:shadow-md">
            <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
              <path
                d="M9.5 22.5V9.5h2.7l3.8 6.6 3.8-6.6h2.7v13h-2.6v-8.1L16 21l-3.9-6.6v8.1H9.5z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-ink">Minuta</span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-soft">
              IA local
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-slate-100 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <StatusPill />
        </div>
      </div>
    </header>
  );
}
