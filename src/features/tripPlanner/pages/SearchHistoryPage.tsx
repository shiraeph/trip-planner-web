import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMyTrips } from "../api/tripApi";
import type { TripPlanResponse } from "../types/tripTypes";
import Page from "../../../app/layout/Page";
import { formatTripDate } from "../lib/dateFormat";

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone =
    status === "READY"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "GENERATING"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-rose-50 text-rose-800 ring-rose-200";
  const label =
    status === "READY"
      ? t("status.ready")
      : status === "GENERATING"
        ? t("status.generating")
        : t("status.failed");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
      {label}
    </span>
  );
}

export default function SearchHistoryPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<TripPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const locale = useMemo(
    () => (i18n.language?.startsWith("he") ? "he-IL" : "en-US"),
    [i18n.language]
  );
  const isHebrew = i18n.language?.startsWith("he");
  const rangeArrow = isHebrew ? "←" : "→";

  const visibleItems = useMemo(
    () => (items ?? []).filter((x) => x?.tripStatus === "READY"),
    [items]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyTrips()
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? t("common.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <Page maxWidth="max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t("history.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t("history.subtitle")}</p>
        </div>
        <Link to="/" className="btn-secondary !rounded-full">
          {t("history.backToPlanner")}
        </Link>
      </header>

      {loading ? (
        <div className="card px-4 py-6 text-center text-sm text-slate-500">
          {t("common.loading")}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="card grid place-items-center px-4 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M6 12h12M8 17h8"
                stroke="currentColor"
                className="text-slate-400"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm text-slate-500">{t("history.empty")}</p>
          <Link to="/" className="btn-primary mt-4">
            {t("planTrip.generateTrip")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(`/trip/${item.id}`)}
                className="card group w-full p-4 text-start transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-ring"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-display text-base font-semibold text-slate-900">
                    {item.destination || t("history.untitledTrip")}
                  </div>
                  <StatusPill status={item.tripStatus} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {item.startDate && item.endDate ? (
                    <span>
                      {formatTripDate(item.startDate, locale)} {rangeArrow}{" "}
                      {formatTripDate(item.endDate, locale)}
                    </span>
                  ) : null}
                  <span className="ms-auto font-medium text-brand-700 group-hover:underline">
                    {t("history.openItinerary")} →
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
