export function normalizeDateLikeToYyyyMmDd(value?: string | null): string {
  if (!value) return "";
  // Accept "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm:ss..." and normalize.
  const s = String(value).trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export function formatTripDate(
  value?: string | null,
  locale: string = "en"
): string {
  const yyyyMmDd = normalizeDateLikeToYyyyMmDd(value);
  if (!yyyyMmDd) return "";

  // Force UTC to avoid off-by-one on local timezones.
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

