import { parseItineraryNotes } from "./itineraryNotes";
import type { ItineraryItem } from "../types/tripTypes";

export type ResolvedItemDetails = {
  description: string;
  openingHours?: string;
  price?: string;
  avgPricePerDish?: string;
};

/** Prefer structured API fields; fall back to parsing legacy notes. */
export function resolveItemDetails(item: ItineraryItem): ResolvedItemDetails {
  const structured =
    !!item.openingHours?.trim() ||
    !!item.price?.trim() ||
    !!item.averagePricePerDish?.trim();

  if (structured) {
    return {
      description: item.notes?.trim() ?? "",
      openingHours: item.openingHours?.trim() || undefined,
      price: item.price?.trim() || undefined,
      avgPricePerDish: item.averagePricePerDish?.trim() || undefined,
    };
  }

  const parsed = parseItineraryNotes(item.notes);
  return {
    description: parsed.description,
    openingHours: parsed.openingHours,
    price: parsed.price,
    avgPricePerDish: parsed.avgPricePerDish,
  };
}
