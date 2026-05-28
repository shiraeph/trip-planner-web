export type ParsedItineraryNotes = {
  description: string;
  openingHours?: string;
  price?: string;
  avgPricePerDish?: string;
};

function cleanupLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanupDescription(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

/** Extract labeled segment anywhere in text and remove it from the source. */
function extractAndRemove(
  text: string,
  pattern: RegExp
): { text: string; value?: string } {
  const m = pattern.exec(text);
  if (!m) return { text };
  const value = cleanupLine(m[1] ?? "");
  const next = cleanupDescription(
    text.slice(0, m.index) + text.slice(m.index + m[0].length)
  );
  return { text: next, value: value || undefined };
}

export function parseItineraryNotes(raw?: string | null): ParsedItineraryNotes {
  let text = (raw ?? "").trim();
  if (!text) return { description: "" };

  let openingHours: string | undefined;
  let price: string | undefined;
  let avgPricePerDish: string | undefined;

  // Longer / more specific labels first (e.g. "מחיר ממוצע למנה" before "מחיר").
  const avg = extractAndRemove(
    text,
    /(?:Average\s*price\s*per\s*dish|Avg\s*price\s*per\s*dish|מחיר\s*ממוצע\s*למנה)\s*:\s*([^\n]+)/i
  );
  text = avg.text;
  avgPricePerDish = avg.value;

  const hours = extractAndRemove(
    text,
    /(?:Opening\s*Hours|Hours|שעות\s*פתיחה)\s*:\s*([^\n]+)/i
  );
  text = hours.text;
  openingHours = hours.value;

  const priceMatch = extractAndRemove(
    text,
    /(?:^|[\s\n])(?:Price|מחיר)(?!\s*ממוצע)\s*:\s*([^\n]+)/im
  );
  text = priceMatch.text;
  price = priceMatch.value;

  const description = text
    .split(/\r?\n+/)
    .map((l) => cleanupLine(l))
    .filter(Boolean)
    .join("\n");

  return {
    description,
    openingHours,
    price,
    avgPricePerDish,
  };
}
