const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-03-12" → "12 de marzo de 2026". Devuelve el original si no es una fecha ISO. */
export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso.trim() || "s/d";
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1] ?? "";
  if (!monthName) return iso;
  return `${Number(day)} de ${monthName} de ${year}`;
}

/** Formato corto para columnas angostas: "12 mar 2026". */
export function formatShortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso.trim() || "s/d";
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return iso;
  return `${Number(day)} ${monthName.slice(0, 3)} ${year}`;
}

/**
 * Reemplaza fechas AAAA-MM-DD dentro de un texto libre por su forma larga.
 * Evita que el acta muestre "el jueves 2026-03-19" en medio de una frase.
 */
export function humanizeDates(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match) => {
    const formatted = formatLongDate(match);
    return formatted === "s/d" ? match : formatted;
  });
}
