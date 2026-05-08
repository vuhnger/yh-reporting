// Shared date formatters for the indoor-climate report. Used by both the PDF
// renderer and the in-wizard review section so the two stay in sync.

/** YYYY-MM-DD → DD.MM.YYYY (e.g. "2026-04-29" → "29.04.2026"). */
export function formatLongDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

/** YYYY-MM-DD → DD.MM. (e.g. "2026-04-29" → "29.04."). */
export function formatShortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.`;
}

/**
 * Format a measurement period for human display:
 *   - Single day  → "29.04.2026"
 *   - Multi-day   → "29.04.2026 – 04.05.2026"
 */
export function formatDateRange(dateFrom: string, dateTo: string): string {
  if (dateFrom === dateTo) return formatLongDate(dateFrom);
  return `${formatLongDate(dateFrom)} – ${formatLongDate(dateTo)}`;
}
