"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type Health = {
  ok: boolean;
  model: string;
  models: string[];
  error?: string;
  hint?: string;
  chrome?: { ok: boolean; error?: string; hint?: string };
};

async function fetchHealth(): Promise<Health> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return (await res.json()) as Health;
  } catch {
    return { ok: false, model: "", models: [], error: "Sin conexión con el servidor" };
  }
}

export default function StatusPill() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const report = await fetchHealth();
      if (!active) return;
      setHealth(report);
      setLoading(false);
    };

    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function check() {
    setLoading(true);
    setHealth(await fetchHealth());
    setLoading(false);
  }

  if (loading && !health) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verificando modelo
      </span>
    );
  }

  if (!health?.ok) {
    return (
      <button
        type="button"
        onClick={() => void check()}
        title={health?.hint ?? "Revisá que Ollama esté corriendo"}
        className="flex items-center gap-2 rounded-full border border-[#fecdca] bg-danger-soft px-3 py-1.5 text-xs font-medium text-danger transition hover:brightness-[0.98]"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {health?.model ? "Modelo no disponible" : "Ollama desconectado"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void check()}
      title={`Modelo local listo en ${health.models.length} opciones instaladas`}
      className="flex items-center gap-2 rounded-full border border-[#d1fadf] bg-ok-soft px-3 py-1.5 text-xs font-medium text-ok transition hover:brightness-[0.98]"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
      </span>
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="font-mono text-[11px] tracking-tight">{health.model}</span>
    </button>
  );
}
