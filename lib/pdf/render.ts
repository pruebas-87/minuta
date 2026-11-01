import type { MeetingDoc } from "../schema";
import { formatLongDate, formatShortDate } from "../dates";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const priorityClass = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("al")) return "alta";
  if (normalized.startsWith("ba")) return "baja";
  return "media";
};

const impactClass = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("al")) return "alto";
  if (normalized.startsWith("ba")) return "bajo";
  return "medio";
};

const BASE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #101828;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-feature-settings: "kern" 1, "liga" 1;
  }
  h1, h2, h3, p, ul, ol, table { margin: 0; padding: 0; }
  ul, ol { list-style: none; }
  .num { font-variant-numeric: tabular-nums; }
`;

const COVER_CSS = `
  @page { size: A4; margin: 0; }

  .cover {
    width: 210mm; height: 297mm; background: #ffffff;
    display: flex; flex-direction: column; overflow: hidden;
  }

  .band {
    position: relative;
    flex: 0 0 142mm;
    padding: 20mm 18mm 17mm;
    color: #ffffff;
    background:
      radial-gradient(120% 90% at 100% 0%, rgba(56,132,255,.55) 0%, rgba(56,132,255,0) 55%),
      linear-gradient(150deg, #081a3a 0%, #0f2f68 55%, #1d4ed8 100%);
    display: flex;
    flex-direction: column;
  }
  .band::after {
    content: "";
    position: absolute;
    right: -40mm; bottom: -55mm;
    width: 130mm; height: 130mm;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,.14);
  }

  .brand { display: flex; align-items: center; gap: 3mm; }
  .brand svg { width: 10mm; height: 10mm; }
  .brand-name {
    font-size: 11pt; letter-spacing: 5px; font-weight: 600; text-transform: uppercase;
  }
  .brand-rule { margin-left: auto; font-size: 8pt; letter-spacing: 2px; color: rgba(255,255,255,.55); text-transform: uppercase; }

  .kicker {
    margin-top: auto;
    font-size: 8.5pt; letter-spacing: 3.5px; text-transform: uppercase;
    color: rgba(255,255,255,.7);
  }
  .cover-title {
    margin-top: 5mm;
    font-size: 29pt;
    line-height: 1.14;
    font-weight: 600;
    letter-spacing: -0.4px;
    max-width: 168mm;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cover-meta {
    margin-top: 12mm;
    display: flex;
    gap: 4mm;
  }
  .cover-meta .item {
    flex: 1;
    padding-top: 4mm;
    border-top: 1px solid rgba(255,255,255,.22);
  }
  .cover-meta .label {
    font-size: 7.5pt; letter-spacing: 2px; text-transform: uppercase;
    color: rgba(255,255,255,.6); margin-bottom: 2mm;
  }
  .cover-meta .value { font-size: 10.5pt; font-weight: 500; line-height: 1.35; }

  .cover-body { flex: 1; padding: 15mm 18mm 11mm; display: flex; flex-direction: column; }
  .cover-columns { display: flex; gap: 9mm; }
  .cover-columns > .col { flex: 1; min-width: 0; }
  .cover-columns > .col-points { border-left: 1px solid #eef1f6; padding-left: 9mm; flex: 1.05; }
  .section-label {
    font-size: 8pt; letter-spacing: 2.5px; text-transform: uppercase;
    color: #667085; font-weight: 600;
  }
  .people { margin-top: 5mm; display: grid; grid-template-columns: 1fr; gap: 3.6mm; }
  .person { display: flex; align-items: center; gap: 3mm; }
  .avatar {
    width: 9.5mm; height: 9.5mm; border-radius: 50%;
    background: #eef4ff; color: #1d4ed8;
    display: flex; align-items: center; justify-content: center;
    font-size: 8.5pt; font-weight: 600; letter-spacing: .3px;
    border: 1px solid #dbe6fb;
  }
  .person .name { font-size: 10pt; font-weight: 600; color: #101828; line-height: 1.25; }
  .person .role { font-size: 8.5pt; color: #667085; line-height: 1.3; margin-top: .5mm; }

  .empty-people { margin-top: 5mm; font-size: 10pt; color: #98a2b3; }
  .more-people { margin-top: 3.5mm; font-size: 8pt; color: #98a2b3; }

  .points { margin-top: 5mm; display: flex; flex-direction: column; gap: 3mm; }
  .points li {
    position: relative; padding-left: 5mm;
    font-size: 9.4pt; line-height: 1.45; color: #344054;
  }
  .points li::before {
    content: ""; position: absolute; left: 0; top: 1.7mm;
    width: 1.7mm; height: 1.7mm; border-radius: .4mm; background: #1d4ed8;
  }

  .cover-stats {
    margin-top: auto;
    padding-top: 7mm;
    border-top: 1px solid #eef1f6;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm;
  }
  .cover-stats .stat { display: flex; flex-direction: column; gap: 1.5mm; }
  .cover-stats .stat-value {
    font-size: 17pt; font-weight: 600; color: #0b1220; line-height: 1;
    font-variant-numeric: tabular-nums; letter-spacing: -0.3px;
  }
  .cover-stats .stat-label {
    font-size: 7.5pt; letter-spacing: 2px; text-transform: uppercase;
    color: #98a2b3; font-weight: 600;
  }

  .cover-foot {
    margin-top: 8mm;
    padding-top: 6mm;
    border-top: 1px solid #e5e9f0;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 8pt; color: #98a2b3;
  }
  .cover-foot strong { color: #475467; font-weight: 600; }
`;

const BODY_CSS = `
  @page { size: A4; }

  body { font-size: 9.8pt; line-height: 1.55; }

  .section { margin-bottom: 8mm; }
  .section + .section { margin-top: 0; }
  .section.keep { break-inside: avoid; }

  .section-head { display: flex; align-items: baseline; gap: 3.5mm; margin-bottom: 4mm; break-after: avoid; }
  .section-num {
    font-size: 8.5pt; font-weight: 700; color: #1d4ed8; letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
  }
  .section-title {
    font-size: 14pt; font-weight: 600; color: #0b1220; letter-spacing: -0.2px;
  }
  .section-rule { flex: 1; height: 1px; background: #e5e9f0; margin-bottom: 1.2mm; }

  .summary {
    background: #f4f8ff;
    border: 1px solid #dbe6fb;
    border-left: 3px solid #1d4ed8;
    border-radius: 3mm;
    padding: 6mm 7mm;
    break-inside: avoid;
  }
  .summary-eyebrow {
    font-size: 7.5pt; letter-spacing: 2.2px; text-transform: uppercase;
    color: #1d4ed8; font-weight: 700; margin-bottom: 3.5mm;
  }
  .summary ul { display: flex; flex-direction: column; gap: 2.4mm; }
  .summary li {
    position: relative; padding-left: 5.5mm; font-size: 10.2pt; line-height: 1.5; color: #1d2939;
  }
  .summary li::before {
    content: ""; position: absolute; left: 0; top: 2.1mm;
    width: 1.8mm; height: 1.8mm; border-radius: .4mm; background: #1d4ed8;
  }

  .prose { color: #344054; font-size: 9.9pt; }
  .prose p + p { margin-top: 2.5mm; }

  .topic { padding: 4mm 0 3mm; border-bottom: 1px solid #eef1f6; break-inside: avoid; }
  .topic:first-of-type { padding-top: 1mm; }
  .topic:last-child { border-bottom: none; }
  .topic h3 { font-size: 10.6pt; font-weight: 600; color: #0b1220; margin-bottom: 2.5mm; }
  .bullets { display: flex; flex-direction: column; gap: 1.6mm; }
  .bullets li {
    position: relative; padding-left: 5mm; color: #344054; font-size: 9.6pt; line-height: 1.5;
  }
  .bullets li::before {
    content: ""; position: absolute; left: 1mm; top: 1.9mm;
    width: 1.5mm; height: 1.5mm; border-radius: 50%; background: #98a2b3;
  }
  .topic-decisions { margin-top: 3mm; }
  .topic-decisions .tag {
    display: inline-block; font-size: 7pt; letter-spacing: 1.6px; text-transform: uppercase;
    color: #027a48; background: #ecfdf3; border: 1px solid #d1fadf;
    border-radius: 1.2mm; padding: 1.2mm 2.4mm; margin-bottom: 2mm; font-weight: 700;
  }
  .topic-decisions li {
    position: relative; padding-left: 6mm; font-size: 9.4pt; color: #1d2939; line-height: 1.45;
    margin-bottom: 1.2mm;
  }
  .topic-decisions li::before {
    content: "✓";
    position: absolute; left: 0; top: -.2mm;
    display: flex; align-items: center; justify-content: center;
    font-size: 6.5pt; font-weight: 700; color: #027a48;
    width: 3.6mm; height: 3.6mm; border-radius: 50%; background: #d1fadf;
    border: 1px solid #6ce9a6;
  }

  .decisions { display: flex; flex-direction: column; gap: 2.4mm; }
  .decisions li {
    display: flex; gap: 3.5mm; align-items: flex-start;
    background: #fbfcfd; border: 1px solid #eaecf0; border-radius: 2.4mm;
    padding: 3.2mm 4mm; font-size: 9.7pt; color: #1d2939; break-inside: avoid;
  }
  .decisions .check {
    flex: 0 0 auto; width: 4.6mm; height: 4.6mm; border-radius: 50%;
    background: #ecfdf3; border: 1px solid #6ce9a6; color: #027a48;
    font-size: 7.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center;
    margin-top: .2mm;
  }

  table.actions { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: fixed; }
  table.actions thead { display: table-header-group; }
  table.actions th {
    text-align: left; font-size: 7.2pt; letter-spacing: 1.2px; text-transform: uppercase;
    color: #667085; font-weight: 700; padding: 0 2.4mm 2.5mm; border-bottom: 1px solid #d0d5dd;
  }
  table.actions td {
    padding: 3mm 2.4mm; border-bottom: 1px solid #eef1f6; vertical-align: top; color: #1d2939;
    overflow-wrap: anywhere;
  }
  table.actions tbody tr:nth-child(even) { background: #fafbfc; }
  table.actions tbody tr { break-inside: avoid; }
  .action-index { color: #98a2b3; font-size: 8pt; font-weight: 600; }
  .action-task { font-size: 9.2pt; line-height: 1.45; }
  .action-state {
    display: inline-block; margin-top: 1.6mm; font-size: 7pt; letter-spacing: .6px;
    text-transform: uppercase; color: #667085; background: #f2f4f7; border-radius: 1mm;
    padding: .8mm 1.8mm; font-weight: 600;
  }
  .action-owner { display: flex; align-items: center; gap: 1.8mm; font-size: 8.9pt; min-width: 0; }
  .action-owner .dot {
    flex: 0 0 auto;
    width: 5.2mm; height: 5.2mm; border-radius: 50%; background: #eef4ff; color: #1d4ed8;
    font-size: 6.2pt; font-weight: 700; display: flex; align-items: center; justify-content: center;
  }
  .action-owner .name { min-width: 0; overflow-wrap: anywhere; line-height: 1.3; }
  .action-date { font-size: 8.5pt; color: #344054; white-space: nowrap; }
  .action-date.overdue { color: #b42318; font-weight: 600; }
  .action-priority { text-align: left; }

  .chip {
    display: inline-block; font-size: 7pt; font-weight: 700; letter-spacing: .8px;
    text-transform: uppercase; border-radius: 1.4mm; padding: 1.3mm 2.6mm;
  }
  .chip.alta { background: #fef3f2; color: #b42318; border: 1px solid #fee4e2; }
  .chip.media { background: #fffaeb; color: #b54708; border: 1px solid #fef0c7; }
  .chip.baja { background: #ecfdf3; color: #027a48; border: 1px solid #d1fadf; }

  .risks { display: flex; flex-direction: column; gap: 3mm; }
  .risk {
    border: 1px solid #eaecf0; border-left: 3px solid #f79009; border-radius: 2.4mm;
    padding: 4mm 5mm; background: #ffffff; break-inside: avoid;
  }
  .risk.alto { border-left-color: #d92d20; }
  .risk.bajo { border-left-color: #12b76a; }
  .risk-head { display: flex; align-items: center; justify-content: space-between; gap: 4mm; }
  .risk-title { font-size: 9.8pt; font-weight: 600; color: #101828; }
  .risk-impact {
    flex: 0 0 auto; white-space: nowrap;
    font-size: 7pt; letter-spacing: 1.4px; text-transform: uppercase; color: #667085; font-weight: 700;
  }
  .risk-mitigation { margin-top: 2mm; font-size: 9pt; color: #475467; line-height: 1.5; }
  .risk-mitigation strong { color: #344054; font-weight: 600; }

  .questions { counter-reset: q; display: flex; flex-direction: column; gap: 2.2mm; }
  .questions li {
    counter-increment: q; position: relative; padding-left: 8mm;
    font-size: 9.6pt; color: #344054; line-height: 1.5; break-inside: avoid;
  }
  .questions li::before {
    content: counter(q, decimal-leading-zero);
    position: absolute; left: 0; top: .2mm;
    font-size: 8pt; font-weight: 700; color: #98a2b3; font-variant-numeric: tabular-nums;
  }

  .steps { display: flex; flex-direction: column; gap: 0; }
  .step { display: flex; gap: 4mm; padding: 2.6mm 0; break-inside: avoid; }
  .step-dot { flex: 0 0 auto; width: 2.6mm; height: 2.6mm; border-radius: 50%; background: #1d4ed8; margin-top: 1.9mm; }
  .step-text { font-size: 9.7pt; color: #344054; line-height: 1.5; }

  .keywords { margin-top: 9mm; padding-top: 4mm; border-top: 1px solid #eef1f6; }
  .keywords .label { font-size: 7.2pt; letter-spacing: 1.8px; text-transform: uppercase; color: #98a2b3; font-weight: 700; }
  .keywords .items { margin-top: 2.5mm; display: flex; flex-wrap: wrap; gap: 2mm; }
  .keywords .item {
    font-size: 8pt; color: #475467; background: #f2f4f7; border-radius: 1.4mm; padding: 1mm 2.4mm;
  }

  .closing {
    margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #eef1f6;
    font-size: 7.8pt; color: #98a2b3; line-height: 1.5;
  }
`;

function coverHtml(doc: MeetingDoc, model: string): string {
  const title = doc.titulo || "Acta de reunión";
  const people = doc.asistentes.filter((a) => a.nombre.trim());
  // La portada no pagina: mostramos hasta 8 y resumimos el resto.
  const shownPeople = people.slice(0, 8);
  const extraPeople = people.length - shownPeople.length;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>${BASE_CSS}${COVER_CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="band">
      <div class="brand">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="1" y="1" width="30" height="30" rx="9" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.4)" />
          <path d="M9.5 22.5V9.5h2.7l3.8 6.6 3.8-6.6h2.7v13h-2.6v-8.1L16 21l-3.9-6.6v8.1H9.5z" fill="#ffffff" />
        </svg>
        <span class="brand-name">Minuta</span>
        <span class="brand-rule">${esc(doc.tipo || "Acta de reunión")}</span>
      </div>

      <div class="kicker">Acta de reunión</div>
      <h1 class="cover-title">${esc(title)}</h1>

      <div class="cover-meta">
        <div class="item">
          <div class="label">Proyecto</div>
          <div class="value">${esc(doc.proyecto || "General")}</div>
        </div>
        <div class="item">
          <div class="label">Fecha</div>
          <div class="value">${esc(formatLongDate(doc.fecha))}</div>
        </div>
        <div class="item">
          <div class="label">Participantes</div>
          <div class="value">${people.length ? `${people.length}` : "—"}</div>
        </div>
      </div>
    </div>

    <div class="cover-body">
      <div class="cover-columns">
        <div class="col">
          <div class="section-label">Participantes</div>
          ${
            shownPeople.length
              ? `<div class="people">
                  ${shownPeople
                    .map(
                      (person) => `<div class="person">
                        <div class="avatar">${esc(initials(person.nombre))}</div>
                        <div>
                          <div class="name">${esc(person.nombre)}</div>
                          ${person.rol ? `<div class="role">${esc(person.rol)}</div>` : ""}
                        </div>
                      </div>`,
                    )
                    .join("")}
                </div>
                ${extraPeople > 0 ? `<div class="more-people">+${extraPeople} participantes más en el acta</div>` : ""}`
              : `<div class="empty-people">No se identificaron participantes en las notas.</div>`
          }
        </div>

        <div class="col col-points">
          <div class="section-label">Puntos clave</div>
          ${
            doc.resumenEjecutivo.length
              ? `<ul class="points">${doc.resumenEjecutivo
                  .slice(0, 3)
                  .map((line) => `<li>${esc(line)}</li>`)
                  .join("")}</ul>`
              : `<div class="empty-people">El acta incluye el resumen ejecutivo completo.</div>`
          }
        </div>
      </div>

      <div class="cover-stats">
        <div class="stat">
          <span class="stat-value">${doc.acciones.length}</span>
          <span class="stat-label">Acciones</span>
        </div>
        <div class="stat">
          <span class="stat-value">${doc.decisiones.length}</span>
          <span class="stat-label">Decisiones</span>
        </div>
        <div class="stat">
          <span class="stat-value">${doc.riesgos.length}</span>
          <span class="stat-label">Riesgos</span>
        </div>
      </div>

      <div class="cover-foot">
        <div>
          Documento generado automáticamente a partir de las notas de la reunión.<br />
          Revisá el contenido antes de distribuirlo.
        </div>
        <div style="text-align:right">
          <strong>${esc(model)}</strong><br />
          Procesado localmente
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function section(
  index: number,
  title: string,
  content: string,
  options: { keep?: boolean } = {},
): string {
  return `<section class="section${options.keep ? " keep" : ""}">
    <div class="section-head">
      <span class="section-num">${String(index).padStart(2, "0")}</span>
      <h2 class="section-title">${esc(title)}</h2>
      <span class="section-rule"></span>
    </div>
    ${content}
  </section>`;
}

function bodyHtml(doc: MeetingDoc, meta: { model: string; sourceName: string }): string {
  const blocks: string[] = [];
  let index = 1;

  if (doc.resumenEjecutivo.length) {
    blocks.push(
      `<section class="summary">
        <div class="summary-eyebrow">Resumen ejecutivo</div>
        <ul>${doc.resumenEjecutivo.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
      </section>`,
    );
  }

  if (doc.contexto.trim()) {
    blocks.push(
      section(
        index++,
        "Contexto",
        `<div class="prose">${doc.contexto
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${esc(paragraph)}</p>`)
          .join("")}</div>`,
      ),
    );
  }

  if (doc.temas.length) {
    const topics = doc.temas
      .map(
        (topic) => `<article class="topic">
          <h3>${esc(topic.titulo)}</h3>
          ${
            topic.puntos.length
              ? `<ul class="bullets">${topic.puntos.map((point) => `<li>${esc(point)}</li>`).join("")}</ul>`
              : ""
          }
          ${
            topic.decisiones.length
              ? `<div class="topic-decisions">
                   <span class="tag">Decisión</span>
                   <ul>${topic.decisiones.map((decision) => `<li>${esc(decision)}</li>`).join("")}</ul>
                 </div>`
              : ""
          }
        </article>`,
      )
      .join("");

    blocks.push(section(index++, "Temas tratados", topics));
  }

  if (doc.decisiones.length) {
    blocks.push(
      section(
        index++,
        "Decisiones",
        `<ul class="decisions">${doc.decisiones
          .map((decision) => `<li><span class="check">✓</span><span>${esc(decision)}</span></li>`)
          .join("")}</ul>`,
      ),
    );
  }

  if (doc.acciones.length) {
    const rows = doc.acciones
      .map(
        (action, i) => `<tr>
          <td class="action-index num">${String(i + 1).padStart(2, "0")}</td>
          <td>
            <div class="action-task">${esc(action.tarea)}</div>
            ${action.estado ? `<span class="action-state">${esc(action.estado)}</span>` : ""}
          </td>
          <td>
            <div class="action-owner">
              <span class="dot">${esc(initials(action.responsable || "?"))}</span>
              <span class="name">${esc(action.responsable || "Sin asignar")}</span>
            </div>
          </td>
          <td class="action-date">${esc(formatShortDate(action.fecha))}</td>
          <td class="action-priority"><span class="chip ${priorityClass(action.prioridad)}">${esc(action.prioridad || "media")}</span></td>
        </tr>`,
      )
      .join("");

    blocks.push(
      section(
        index++,
        "Plan de acción",
        `<table class="actions">
          <thead>
            <tr>
              <th style="width:8mm">#</th>
              <th>Acción</th>
              <th style="width:34mm">Responsable</th>
              <th style="width:23mm">Fecha</th>
              <th style="width:20mm">Prioridad</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`,
      ),
    );
  }

  if (doc.riesgos.length) {
    blocks.push(
      section(
        index++,
        "Riesgos y bloqueos",
        `<div class="risks">${doc.riesgos
          .map(
            (risk) => `<div class="risk ${impactClass(risk.impacto)}">
              <div class="risk-head">
                <div class="risk-title">${esc(risk.descripcion)}</div>
                <div class="risk-impact">Impacto ${esc(risk.impacto || "medio")}</div>
              </div>
              ${
                risk.mitigacion
                  ? `<div class="risk-mitigation"><strong>Mitigación:</strong> ${esc(risk.mitigacion)}</div>`
                  : ""
              }
            </div>`,
          )
          .join("")}</div>`,
      ),
    );
  }

  if (doc.preguntasAbiertas.length) {
    blocks.push(
      section(
        index++,
        "Preguntas abiertas",
        `<ol class="questions">${doc.preguntasAbiertas.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`,
      ),
    );
  }

  if (doc.proximosPasos.length) {
    blocks.push(
      section(
        index++,
        "Próximos pasos",
        `<div class="steps">${doc.proximosPasos
          .map((step) => `<div class="step"><span class="step-dot"></span><span class="step-text">${esc(step)}</span></div>`)
          .join("")}</div>`,
      ),
    );
  }

  if (doc.palabrasClave.length) {
    blocks.push(
      `<div class="keywords">
        <div class="label">Temas clave</div>
        <div class="items">${doc.palabrasClave.map((word) => `<span class="item">${esc(word)}</span>`).join("")}</div>
      </div>`,
    );
  }

  blocks.push(
    `<div class="closing">
      Acta generada automáticamente por Minuta a partir de «${esc(meta.sourceName)}» con el modelo local ${esc(
        meta.model,
      )}.
      Las decisiones y acciones deben confirmarse con los participantes antes de su distribución.
    </div>`,
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>${BASE_CSS}${BODY_CSS}</style>
</head>
<body>
${blocks.join("\n")}
</body>
</html>`;
}

export function headerTemplate(doc: MeetingDoc): string {
  return `<div style="width:100%;padding:0 18mm;font-family:'Segoe UI',Arial,sans-serif;font-size:7px;color:#98a2b3;display:flex;justify-content:space-between;border-bottom:1px solid #eef1f6;padding-bottom:4px;">
    <span style="letter-spacing:2px;text-transform:uppercase;font-weight:600;">Minuta</span>
    <span>${esc((doc.proyecto || "General").slice(0, 60))}</span>
  </div>`;
}

export function footerTemplate(): string {
  return `<div style="width:100%;padding:0 18mm;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5px;color:#98a2b3;display:flex;justify-content:space-between;border-top:1px solid #eef1f6;padding-top:5px;">
    <span>Acta de reunión · Documento interno</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`;
}

export function renderPdfHtml(doc: MeetingDoc, meta: { model: string; sourceName: string }) {
  return {
    cover: coverHtml(doc, meta.model),
    body: bodyHtml(doc, meta),
    header: headerTemplate(doc),
    footer: footerTemplate(),
  };
}
