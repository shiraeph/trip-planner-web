import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AirplaneGame from "./AirplaneGame";
import { getGameBestScores, submitGameScore } from "../../features/tripPlanner/api/tripApi";

type Props = {
  title: string;
  subtitle?: string;
  active?: boolean;
  className?: string;
};

export default function TripGeneratingGame({
  title,
  subtitle,
  active = true,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const [myBest, setMyBest] = useState<number | null>(null);
  const [globalBest, setGlobalBest] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number>(0);

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
    // If the game disappears (trip finished / navigation), persist the last score.
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
