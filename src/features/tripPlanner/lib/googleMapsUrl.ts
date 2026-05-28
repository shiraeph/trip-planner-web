const MAPS_SEARCH_BASE = "https://www.google.com/maps/search/?api=1&query=";

function segmentIncluded(segments: string[], part: string): boolean {
  const lower = part.toLowerCase();
  return segments.some(
    (s) =>
      s.toLowerCase() === lower ||
      s.toLowerCase().includes(lower) ||
      lower.includes(s.toLowerCase())
  );
}

/** Build a search query: item name + location area + trip destination (city/country). */
export function buildGoogleMapsSearchQuery(
  name: string,
  locationName?: string | null,
  tripDestination?: string | null
): string {
  const segments: string[] = [];
  const trimmedName = name.trim();
  if (trimmedName) segments.push(trimmedName);

  const loc = locationName?.trim();
  if (loc && !segmentIncluded(segments, loc)) {
    segments.push(loc);
  }

  const dest = tripDestination?.trim();
  if (dest) {
    for (const part of dest.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!segmentIncluded(segments, part)) {
        segments.push(part);
      }
    }
  }

  return segments.join(" ");
}

export function buildGoogleMapsSearchUrl(
  name: string,
  locationName?: string | null,
  tripDestination?: string | null
): string {
  const query = buildGoogleMapsSearchQuery(name, locationName, tripDestination);
  return `${MAPS_SEARCH_BASE}${encodeURIComponent(query)}`;
}
