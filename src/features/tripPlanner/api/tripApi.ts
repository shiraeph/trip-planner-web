import { apiUrl } from "../../../api";
import { getOrCreateUserId } from "../../../shared/lib/userId";
import { getAuthToken } from "../../../shared/lib/auth";
import type { Itinerary, PlanTripRequest, SearchHistoryResponse, TripPlanResponse } from "../types/tripTypes";

function apiHeaders(includeJson = false): Record<string, string> {
    const h: Record<string, string> = { "X-User-Id": getOrCreateUserId() };
    const token = getAuthToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (includeJson) h["Content-Type"] = "application/json";
    return h;
}

// ---- Errors ----
export type ApiError = {
    status: number;
    message: string;
    raw?: any;
};

// ---- HTTP helpers ----
async function parseJsonOrText(res: Response): Promise<any> {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return text;
    }
}

function buildErrorMessage(res: Response, body: any): string {
    if (typeof body === "string" && body.trim().length > 0) {
        return `${res.status} ${res.statusText}: ${body}`;
    }
    if (body && typeof body === "object") {
        const msg = body.message || body.error || JSON.stringify(body);
        return `${res.status} ${res.statusText}: ${msg}`;
    }
    return `${res.status} ${res.statusText}`;
}

// ---- API calls ----
export async function planTrip(request: PlanTripRequest): Promise<TripPlanResponse> {
    const res = await fetch(apiUrl("/api/trips/plan"), {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify(request),
    });

    const body = await parseJsonOrText(res);

    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }

    return body as TripPlanResponse;
}

export type LockedBlock = { day: number; timeBlock: "MORNING" | "AFTERNOON" | "EVENING" };
export type LockedItem = { day: number; timeBlock: "MORNING" | "AFTERNOON" | "EVENING"; itemIndex: number };

export async function regenerateTrip(
    id: string,
    options?: { lockedBlocks?: LockedBlock[]; lockedItems?: LockedItem[] }
): Promise<TripPlanResponse> {
    const res = await fetch(apiUrl(`/api/trips/${encodeURIComponent(id)}/regenerate`), {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({
            lockedBlocks: options?.lockedBlocks ?? [],
            lockedItems: options?.lockedItems ?? [],
        }),
    });
  
    const body = await parseJsonOrText(res);
  
    if (!res.ok) {
      throw {
        status: res.status,
        message: buildErrorMessage(res, body),
        raw: body,
      } as ApiError;
    }
  
    return body as TripPlanResponse;
  }

export async function updateTripItinerary(
    id: string,
    itinerary: Itinerary,
    language?: "en" | "he"
): Promise<TripPlanResponse> {
    const url = new URL(apiUrl(`/api/trips/${encodeURIComponent(id)}/itinerary`));
    if (language) url.searchParams.set("language", language);
    const res = await fetch(url.toString(), {
        method: "PUT",
        headers: apiHeaders(true),
        body: JSON.stringify(itinerary),
    });
    const body = await parseJsonOrText(res);
    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }
    return body as TripPlanResponse;
}

export async function getTrip(id: string, language?: "en" | "he"): Promise<TripPlanResponse> {
    const url = new URL(apiUrl(`/api/trips/${encodeURIComponent(id)}`));
    if (language) url.searchParams.set("language", language);
    const res = await fetch(url.toString(), { method: "GET", headers: apiHeaders() });

    const body = await parseJsonOrText(res);

    if (!res.ok) {
      throw {
        status: res.status,
        message: buildErrorMessage(res, body),
        raw: body,
      } as ApiError;
    }

    return body as TripPlanResponse;
}

export async function getSearchHistory(): Promise<SearchHistoryResponse[]> {
    const res = await fetch(apiUrl("/api/me/search-history"), {
        method: "GET",
        headers: apiHeaders(),
    });
    const body = await parseJsonOrText(res);
    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }
    return (body ?? []) as SearchHistoryResponse[];
}

export async function getMyTrips(): Promise<TripPlanResponse[]> {
    const res = await fetch(apiUrl("/api/me/trips"), {
        method: "GET",
        headers: apiHeaders(),
    });
    const body = await parseJsonOrText(res);
    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }
    return (body ?? []) as TripPlanResponse[];
}

export type PollOptions = {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (trip: TripPlanResponse) => void;
    language?: "en" | "he";
};

export async function pollTripUntilDone(
    id: string,
    options: PollOptions = {}
): Promise<TripPlanResponse> {
    const intervalMs = options.intervalMs ?? 1000;
    const timeoutMs = options.timeoutMs ?? 30000;
    const language = options.language;

    const startedAt = Date.now();

    while (true) {
        const trip = await getTrip(id, language);
        options.onUpdate?.(trip);

        if (trip.tripStatus === "READY" || trip.tripStatus === "FAILED") {
            return trip;
        }

        if (Date.now() - startedAt > timeoutMs) {
            throw {
                status: 408,
                message: `Timeout waiting for trip ${id} to finish`,
                raw: trip,
            } as ApiError;
        }

        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

// ---- Waiting game scores ----
export type GameBestScoresResponse = { myBest: number | null; globalBest: number | null };

export async function getGameBestScores(): Promise<GameBestScoresResponse> {
    const res = await fetch(apiUrl("/api/game/scores/best"), {
        method: "GET",
        headers: apiHeaders(),
    });
    const body = await parseJsonOrText(res);
    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }
    return (body ?? { myBest: null, globalBest: null }) as GameBestScoresResponse;
}

export async function submitGameScore(score: number): Promise<GameBestScoresResponse> {
    const res = await fetch(apiUrl("/api/game/scores/submit"), {
        method: "POST",
        headers: apiHeaders(true),
        body: JSON.stringify({ score }),
    });
    const body = await parseJsonOrText(res);
    if (!res.ok) {
        throw {
            status: res.status,
            message: buildErrorMessage(res, body),
            raw: body,
        } as ApiError;
    }
    return (body ?? { myBest: null, globalBest: null }) as GameBestScoresResponse;
}
