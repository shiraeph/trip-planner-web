import type { GenerationProgress } from "../types/tripTypes";

export type GenerationStage = {
  id: string;
  labelKey: string;
  afterSec: number;
};

export const GENERATION_STAGES: GenerationStage[] = [
  { id: "analyze", labelKey: "generationProgress.analyzing", afterSec: 0 },
  { id: "events", labelKey: "generationProgress.findingEvents", afterSec: 12 },
  { id: "building", labelKey: "generationProgress.buildingItinerary", afterSec: 35 },
  { id: "details", labelKey: "generationProgress.addingDetails", afterSec: 70 },
];

/** Stage activation thresholds by overall itinerary completion (0–1). */
export const COMPLETION_STAGE_THRESHOLDS = [0, 0.2, 0.4, 0.7] as const;

export function completionRatio(
  progress: GenerationProgress | null | undefined,
  tripDayCount = 0
): number {
  if (!progress) return 0;

  const totalDays = Math.max(progress.totalDays || tripDayCount || 1, 1);

  if (progress.stage === "FINALIZING") {
    return 1;
  }

  if (progress.stage === "ANALYZING" && progress.daysCompleted === 0) {
    return 0.05;
  }

  return Math.min(Math.max(progress.daysCompleted / totalDays, 0), 0.99);
}

export function completionRatioToActiveIndex(ratio: number): number {
  if (ratio >= COMPLETION_STAGE_THRESHOLDS[3]) return 3;
  if (ratio >= COMPLETION_STAGE_THRESHOLDS[2]) return 2;
  if (ratio >= COMPLETION_STAGE_THRESHOLDS[1]) return 1;
  return 0;
}

/** Active checklist step from backend day completion — not chunk boundaries. */
export function progressToActiveIndex(
  progress: GenerationProgress,
  tripDayCount = 0
): number {
  return completionRatioToActiveIndex(completionRatio(progress, tripDayCount));
}

/** Checklist steps fully complete before the active one. */
export function progressToCompletedCount(
  progress: GenerationProgress,
  tripDayCount = 0
): number {
  return progressToActiveIndex(progress, tripDayCount);
}

/** Fallback when backend progress is not yet available (time-based estimate). */
export function elapsedToCompletionRatio(elapsedSec: number, longTrip: boolean): number {
  const scale = longTrip ? 1.8 : 1;
  const t = elapsedSec / scale;
  if (t < 8) return 0.08;
  if (t < 20) return 0.28;
  if (t < 45) return 0.48;
  if (t < 90) return 0.62;
  return 0.68;
}

export function getActiveStageIndex(elapsedSec: number, longTrip: boolean): number {
  return completionRatioToActiveIndex(elapsedToCompletionRatio(elapsedSec, longTrip));
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatCompletionPercent(ratio: number): number {
  return Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
}

export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function isLongTrip(dayCount: number): boolean {
  return dayCount >= 9;
}

/** Never decrease stage index — keeps the checklist moving forward only. */
export function monotonicStageIndex(currentMax: number, next: number): number {
  return Math.max(currentMax, next);
}
