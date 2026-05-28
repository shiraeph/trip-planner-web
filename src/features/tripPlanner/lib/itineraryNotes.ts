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

/** Next labeled field (opening hours / price) after valueStart. */
const NEXT_LABEL_RE =
  /\s*(?:(?:Average\s*price\s*per\s*dish|Avg\s*price\s*per\s*dish|מחיר\s*ממוצע\s*למנה)|(?:Price|מחיר)(?!\s*ממוצע)|(?:Opening\s*Hours|Hours|שעות\s*פתיחה))\s*:/i;

function valueEndIndex(text: string, valueStart: number): number {
  const rest = text.slice(valueStart);
  const m = NEXT_LABEL_RE.exec(rest);
  if (!m || m.index === undefined) return text.length;
  if (m.index === 0) return valueStart;
  return valueStart + m.index;
}

function trimValue(raw: string): string {
  return cleanupLine(raw.replace(/[,\s.;]+$/g, "").replace(/^[,\s.;]+/g, ""));
}

function looksLikePriceFragment(s: string): boolean {
  const t = s.trim();
  if (!t || t.length > 70) return false;
  return /(?:€|\$|£|₪|₽|USD|EUR|\d|free|חינם|לאדם|per person|למנה|לכרטיס)/i.test(t);
}

/** Keep only the price fragment; return extra sentences for description. */
function splitPriceValue(raw: string): { value: string; trailing: string } {
  const v = trimValue(raw);
  if (!v) return { value: "", trailing: "" };

  const dotSplit = v.split(/\.\s+/);
  if (dotSplit.length > 1) {
    const head = dotSplit[0].trim();
    const rest = dotSplit.slice(1).join(". ").trim();
    if (looksLikePriceFragment(head) && rest.length > 0) {
      return { value: head, trailing: rest };
    }
  }

  return { value: v, trailing: "" };
}

/** Keep only hours/time range; return trailing text for description. */
function splitHoursValue(raw: string): { value: string; trailing: string } {
  const v = trimValue(raw);
  if (!v) return { value: "", trailing: "" };

  const timeMatch = v.match(
    /^(\d{1,2}:\d{2}(?:\s*[-–—]\s*\d{1,2}:\d{2})?|varies|closed|24\s*\/\s*7)/i
  );
  if (timeMatch) {
    const after = v.slice(timeMatch[0].length).replace(/^[,.]\s*/, "").trim();
    return { value: cleanupLine(timeMatch[0]), trailing: after };
  }

  const comma = v.indexOf(",");
  if (comma > 0) {
    return {
      value: trimValue(v.slice(0, comma)),
      trailing: v.slice(comma + 1).trim(),
    };
  }

  return { value: v, trailing: "" };
}

type FieldType = "openingHours" | "price" | "avgPricePerDish";

type ExtractedField = {
  type: FieldType;
  start: number;
  end: number;
  value: string;
  trailing: string;
};

const FIELD_SPECS: { type: FieldType; re: RegExp }[] = [
  {
    type: "avgPricePerDish",
    re: /(?:Average\s*price\s*per\s*dish|Avg\s*price\s*per\s*dish|מחיר\s*ממוצע\s*למנה)\s*:\s*/gi,
  },
  {
    type: "price",
    re: /(?:^|[\s,;(\[])(?:Price|מחיר)(?!\s*ממוצע)\s*:\s*/gi,
  },
  {
    type: "openingHours",
    re: /(?:Opening\s*Hours|Hours|שעות\s*פתיחה)\s*:\s*/gi,
  },
];

function findAllFields(text: string): ExtractedField[] {
  const found: ExtractedField[] = [];

  for (const spec of FIELD_SPECS) {
    spec.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = spec.re.exec(text)) !== null) {
      const valueStart = m.index + m[0].length;
      const end = valueEndIndex(text, valueStart);
      const rawSlice = text.slice(valueStart, end);

      let value = trimValue(rawSlice);
      let trailing = "";

      if (spec.type === "openingHours") {
        const split = splitHoursValue(rawSlice);
        value = split.value;
        trailing = split.trailing;
      } else if (spec.type === "price" || spec.type === "avgPricePerDish") {
        const split = splitPriceValue(rawSlice);
        value = split.value;
        trailing = split.trailing;
      }

      if (value) {
        found.push({
          type: spec.type,
          start: m.index,
          end,
          value,
          trailing: cleanupLine(trailing),
        });
      }
    }
  }

  found.sort((a, b) => a.start - b.start);
  return found;
}

function buildDescription(text: string, fields: ExtractedField[]): string {
  if (fields.length === 0) return cleanupDescription(text);

  const parts: string[] = [];
  let cursor = 0;

  for (const f of fields) {
    if (f.start > cursor) {
      const chunk = cleanupLine(text.slice(cursor, f.start));
      if (chunk) parts.push(chunk);
    }
    if (f.trailing) parts.push(f.trailing);
    cursor = f.end;
  }

  if (cursor < text.length) {
    const tail = cleanupLine(text.slice(cursor));
    if (tail) parts.push(tail);
  }

  return cleanupDescription(parts.join("\n"));
}

export function parseItineraryNotes(raw?: string | null): ParsedItineraryNotes {
  const text = (raw ?? "").trim();
  if (!text) return { description: "" };

  const fields = findAllFields(text);

  let openingHours: string | undefined;
  let price: string | undefined;
  let avgPricePerDish: string | undefined;

  for (const f of fields) {
    if (f.type === "openingHours" && !openingHours) openingHours = f.value;
    if (f.type === "price" && !price) price = f.value;
    if (f.type === "avgPricePerDish" && !avgPricePerDish) avgPricePerDish = f.value;
  }

  const description = buildDescription(text, fields);

  return {
    description,
    openingHours,
    price,
    avgPricePerDish,
  };
}
