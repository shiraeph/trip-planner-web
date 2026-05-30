import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AirplaneGame from "./AirplaneGame";
import { getGameBestScores, submitGameScore } from "../../features/tripPlanner/api/tripApi";
import type { GenerationProgress } from "../../features/tripPlanner/types/tripTypes";
import {
  formatElapsed,
  GENERATION_STAGES,
  getActiveStageIndex,
  isLongTrip,
  monotonicStageIndex,
  progressToActiveIndex,
  progressToCompletedCount,
} from "../../features/tripPlanner/lib/generationProgress";

type Props = {
  title: string;
  subtitle?: string;
  tripDayCount?: number;
  generationProgress?: GenerationProgress | null;
  /** Resets monotonic progress when a new generation starts (e.g. trip id). */
  progressResetKey?: string;
  active?: boolean;
  className?: string;
  showProgress?: boolean;
};

export default function TripGeneratingGame({
  title,
  subtitle,
  tripDayCount = 0,
  generationProgress = null,
  progressResetKey = "",
  active = true,
  className = "",
  showProgress = false,
}: Props) {
  const { t } = useTranslation();
  const [myBest, setMyBest] = useState<number | null>(null);
  const [globalBest, setGlobalBest] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const maxActiveRef = useRef(0);
  const maxCompletedRef = useRef(0);
  const resetKeyRef = useRef(progressResetKey);

  const longTrip = isLongTrip(tripDayCount);
  const hasBackendProgress = !!generationProgress?.stage;

  useEffect(() => {
    if (resetKeyRef.current !== progressResetKey) {
      resetKeyRef.current = progressResetKey;
      maxActiveRef.current = 0;
      maxCompletedRef.current = 0;
    }
  }, [progressResetKey]);

  const rawActiveStageIdx = useMemo(() => {
    if (hasBackendProgress) {
      return progressToActiveIndex(generationProgress!, tripDayCount);
    }
    return getActiveStageIndex(elapsedSec, longTrip);
  }, [hasBackendProgress, generationProgress, tripDayCount, elapsedSec, longTrip]);

  const rawCompletedStageCount = useMemo(() => {
    if (hasBackendProgress) {
      return progressToCompletedCount(generationProgress!, tripDayCount);
    }
    return rawActiveStageIdx;
  }, [hasBackendProgress, generationProgress, tripDayCount, rawActiveStageIdx]);

  const activeStageIdx = monotonicStageIndex(maxActiveRef.current, rawActiveStageIdx);
  maxActiveRef.current = activeStageIdx;

  const completedStageCount = monotonicStageIndex(
    maxCompletedRef.current,
    Math.max(rawCompletedStageCount, activeStageIdx)
  );
  maxCompletedRef.current = completedStageCount;

  useEffect(() => {
    if (!showProgress || !active) return;
    setElapsedSec(0);
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [showProgress, active, progressResetKey]);

  useEffect(() => {
    let cancelled = false;
    getGameBestScores()
      .then((r) => {
        if (!cancelled) {
          setMyBest(r.myBest ?? null);
          setGlobalBest(r.globalBest ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (lastScore > 0) {
        submitGameScore(lastScore)
          .then((r) => {
            setMyBest(r.myBest ?? null);
            setGlobalBest(r.globalBest ?? null);
          })
          .catch(() => {});
      }
    };
  }, [lastScore]);

  const daysLabel =
    generationProgress && generationProgress.totalDays > 0
      ? t("generationProgress.daysProgress", {
          completed: generationProgress.daysCompleted,
          total: generationProgress.totalDays,
        })
      : null;

  return (
    <div
      className={`mt-8 flex w-full flex-col items-center gap-4 ${className}`}
      aria-busy="true"
    >
      <div className="max-w-md text-center">
        <p className="text-base font-semibold text-slate-800">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>

      {showProgress ? (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{t("generationProgress.elapsed", { time: formatElapsed(elapsedSec) })}</span>
            {daysLabel ? (
              <span className="font-medium text-brand-700">{daysLabel}</span>
            ) : null}
            {longTrip ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                {t("tripDetails.longTripHint")}
              </span>
            ) : null}
          </div>
          {generationProgress && generationProgress.totalChunks > 1 ? (
            <p className="mb-3 text-xs text-slate-500">
              {t("generationProgress.chunksProgress", {
                completed: generationProgress.chunksCompleted,
                total: generationProgress.totalChunks,
              })}
            </p>
          ) : null}
          <ol className="space-y-2">
            {GENERATION_STAGES.map((stage, idx) => {
              const done = hasBackendProgress ? idx < completedStageCount : idx < activeStageIdx;
              const current = idx === activeStageIdx;
              return (
                <li
                  key={stage.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                    current
                      ? "bg-brand-50 font-semibold text-brand-800"
                      : done
                        ? "text-emerald-700"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      current
                        ? "bg-brand-600 text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                    aria-hidden
                  >
                    {done ? "✓" : idx + 1}
                  </span>
                  <span>{t(stage.labelKey)}</span>
                  {current ? (
                    <span className="ms-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <div className="card w-full max-w-xl p-4 sm:p-5">
        <div className="mb-3 text-center">
          <div className="text-sm font-semibold text-brand-800">
            {t("waitingGame.playWhileWaiting")}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t("waitingGame.tapToStart")}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {t("waitingGame.bestYour")}: {myBest ?? "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {t("waitingGame.bestGlobal")}: {globalBest ?? "—"}
            </span>
          </div>
        </div>
        <AirplaneGame
          active={active}
          onScoreChange={(score) => setLastScore(score)}
          onGameOver={(score) => {
            submitGameScore(score)
              .then((r) => {
                setMyBest(r.myBest ?? null);
                setGlobalBest(r.globalBest ?? null);
              })
              .catch(() => {});
          }}
        />
        <p className="mt-3 text-center text-xs text-slate-500">
          {t("waitingGame.controlsHint")}
        </p>
      </div>
    </div>
  );
}
