import type { MeetingDoc } from "@/lib/schema";
import { formatDateLong } from "@/lib/format";

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-semibold text-brand">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const priorityStyles: Record<string, string> = {
  alta: "bg-danger-soft text-danger border-[#fee4e2]",
  media: "bg-warn-soft text-warn border-[#fef0c7]",
  baja: "bg-ok-soft text-ok border-[#d1fadf]",
};

const impactBorder: Record<string, string> = {
  alto: "border-l-[#d92d20]",
  medio: "border-l-[#f79009]",
  bajo: "border-l-[#12b76a]",
};

export default function DocDetails({ doc }: { doc: MeetingDoc }) {
  let index = 1;

  return (
    <div className="space-y-6">
      {doc.resumenEjecutivo.length > 0 && (
        <div className="rounded-2xl border border-brand-line bg-brand-soft/70 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
            Resumen ejecutivo
          </p>
          <ul className="mt-3 space-y-2">
            {doc.resumenEjecutivo.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-brand" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.contexto && (
        <Section index={index++} title="Contexto">
          <div className="space-y-2 text-sm leading-relaxed text-ink-soft">
            {doc.contexto.split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </Section>
      )}

      {doc.temas.length > 0 && (
        <Section index={index++} title="Temas tratados">
          <div className="space-y-4">
            {doc.temas.map((topic) => (
              <article
                key={topic.titulo}
                className="rounded-xl border border-line bg-[#fbfcfe] px-4 py-3.5"
              >
                <h3 className="text-sm font-semibold text-ink">{topic.titulo}</h3>
                {topic.puntos.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {topic.puntos.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 text-[13px] leading-relaxed text-ink-soft"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-soft" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {topic.decisiones.length > 0 && (
                  <div className="mt-3">
                    <span className="inline-block rounded border border-[#d1fadf] bg-ok-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
                      Decisión
                    </span>
                    <ul className="mt-2 space-y-1">
                      {topic.decisiones.map((decision) => (
                        <li
                          key={decision}
                          className="flex gap-2 text-[13px] leading-relaxed text-ink-soft"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6ce9a6]" />
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}

      {doc.decisiones.length > 0 && (
        <Section index={index++} title="Decisiones">
          <ul className="space-y-2">
            {doc.decisiones.map((decision) => (
              <li
                key={decision}
                className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-soft"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#6ce9a6] bg-ok-soft text-[10px] font-bold text-ok">
                  ✓
                </span>
                {decision}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {doc.acciones.length > 0 && (
        <Section index={index++} title="Plan de acción">
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbfcfe] text-[10px] uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Acción</th>
                  <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Responsable</th>
                  <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Fecha</th>
                  <th className="px-3 py-2.5 font-semibold">Prioridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {doc.acciones.map((action, i) => (
                  <tr key={`${action.tarea}-${i}`} className="bg-white">
                    <td className="px-3 py-3 align-top">
                      <div className="text-[13px] leading-relaxed text-ink">{action.tarea}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                          {action.estado}
                        </span>
                        <span className="sm:hidden">{action.responsable || "Sin asignar"}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 align-top text-[13px] text-ink-soft sm:table-cell">
                      {action.responsable || "Sin asignar"}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 align-top text-[13px] text-ink-soft md:table-cell">
                      {action.fecha ? formatDateLong(action.fecha) : "s/d"}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          priorityStyles[action.prioridad] ?? priorityStyles.media
                        }`}
                      >
                        {action.prioridad}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {doc.riesgos.length > 0 && (
        <Section index={index++} title="Riesgos y bloqueos">
          <div className="space-y-2.5">
            {doc.riesgos.map((risk) => (
              <div
                key={risk.descripcion}
                className={`rounded-xl border border-l-4 border-line bg-white px-4 py-3 ${
                  impactBorder[risk.impacto] ?? impactBorder.medio
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{risk.descripcion}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Impacto {risk.impacto}
                  </span>
                </div>
                {risk.mitigacion && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    <span className="font-medium text-ink-soft">Mitigación:</span> {risk.mitigacion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {doc.preguntasAbiertas.length > 0 && (
        <Section index={index++} title="Preguntas abiertas">
          <ol className="space-y-2">
            {doc.preguntasAbiertas.map((question, i) => (
              <li key={question} className="flex gap-3 text-sm text-ink-soft">
                <span className="font-mono text-xs text-muted-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {question}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {doc.proximosPasos.length > 0 && (
        <Section index={index++} title="Próximos pasos">
          <ul className="space-y-2">
            {doc.proximosPasos.map((step) => (
              <li key={step} className="flex items-start gap-3 text-sm text-ink-soft">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                {step}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {doc.palabrasClave.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-5">
          {doc.palabrasClave.map((word) => (
            <span
              key={word}
              className="rounded-lg bg-surface px-2 py-1 text-[11px] text-muted"
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
