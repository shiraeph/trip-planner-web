import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getTrip,
  pollTripUntilDone,
  regenerateTrip,
  updateTripItinerary,
} from "../api/tripApi";
import type { Itinerary, TimeBlock, TripPlanResponse } from "../types/tripTypes";
import Page from "../../../app/layout/Page";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function SpinnerRow({ text }: { text: string }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 text-base text-slate-700">
      <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
      <span className="text-center font-medium">{text}</span>
    </div>
  );
}

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
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}
    >
      {label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
      {mode}
    </span>
  );
}

function DirectionsBox({
  mode,
  minutes,
  from,
  directions,
}: {
  mode: string;
  minutes?: number | null;
  from?: string | null;
  directions?: string | null;
}) {
  const { t } = useTranslation();
  if (!directions) return null;
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">
          {t("tripResult.directions")}
        </span>
        <ModeBadge mode={mode} />
        {minutes != null ? (
          <span className="text-slate-500">
            ~{minutes} {t("common.min")}
          </span>
        ) : null}
        {from ? (
          <span className="text-slate-500">
            {t("common.from")} {from}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-slate-600">{directions}</div>
    </div>
  );
}

function ItemCard({
  item,
  keepChecked,
  onToggleKeep,
}: {
  item: {
    type: string;
    name: string;
    notes?: string | null;
    location?: { name: string } | null;
    transit?: {
      from: string;
      mode: string;
      estimatedMinutes?: number | null;
      directions?: string | null;
    } | null;
  };
  keepChecked?: boolean;
  onToggleKeep?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800">
            {item.type}
          </span>
          <div className="text-sm font-semibold text-slate-900">{item.name}</div>
          {item.location?.name ? (
            <div className="text-sm text-slate-500">· {item.location.name}</div>
          ) : null}
        </div>

        {onToggleKeep ? (
          <label className="flex select-none items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={!!keepChecked}
              onChange={onToggleKeep}
              className="h-4 w-4 rounded border-slate-300"
            />
            {t("tripResult.keep")}
          </label>
        ) : null}
      </div>

      {item.notes ? (
        <div className="mt-1.5 text-sm text-slate-600">{item.notes}</div>
      ) : null}

      {item.transit ? (
        <DirectionsBox
          mode={item.transit.mode}
          minutes={item.transit.estimatedMinutes}
          from={item.transit.from}
          directions={item.transit.directions}
        />
      ) : null}
    </div>
  );
}

const TIME_BLOCK_ORDER: TimeBlock[] = ["MORNING", "AFTERNOON", "EVENING"];

function DayTabs({
  trip,
  locked,
  onToggleItem,
  onReorderBlocks,
}: {
  trip: TripPlanResponse;
  locked: Record<string, boolean>;
  onToggleItem: (dayIndex: number, timeBlock: TimeBlock, itemIndex: number) => void;
  onReorderBlocks: (dayIndex: number, fromIndex: number, toIndex: number) => void;
}) {
  const { t } = useTranslation();
  const days = trip.itinerary?.dayPlans ?? [];
  const [active, setActive] = useState(0);
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);

  useEffect(() => {
    if (active >= days.length) setActive(0);
  }, [days.length, active]);

  if (days.length === 0) return null;

  const day = days[active];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {days.map((d, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-start text-sm transition",
                isActive
                  ? "border-transparent bg-gradient-to-r from-brand-600 to-sky-600 text-white shadow-soft"
                  : "border-slate-200 bg-white text-slate-800 hover:border-brand-200 hover:bg-brand-50/30"
              )}
            >
              <div className="font-semibold">
                {t("tripResult.day")} {idx + 1}
              </div>
              <div className="text-xs opacity-80">{d.date}</div>
            </button>
          );
        })}
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display text-lg font-semibold text-slate-900">
            {day.title}
          </div>
          <div className="text-sm text-slate-500">{day.date}</div>
        </div>

        <div className="mt-5 space-y-5">
          {day.blocks.map((block, i) => (
            <div
              key={`${block.timeBlock}-${i}`}
              draggable
              onDragStart={() => setDragBlockIdx(i)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragBlockIdx === null || dragBlockIdx === i) return;
                onReorderBlocks(active, dragBlockIdx, i);
                setDragBlockIdx(null);
              }}
              onDragEnd={() => setDragBlockIdx(null)}
              className={cn(
                "rounded-xl border border-transparent p-2 transition",
                dragBlockIdx === i
                  ? "border-brand-300 bg-brand-50/50 opacity-90"
                  : "hover:border-slate-200 hover:bg-slate-50/60"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="cursor-grab select-none text-slate-400" aria-hidden>
                    ⋮⋮
                  </span>
                  <span>{t(`timeBlocks.${block.timeBlock as TimeBlock}`)}</span>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {block.items.map((item: any, j: number) => {
                  const tb = block.timeBlock as TimeBlock;
                  const lockKey = `${active + 1}:${tb}:${j}`;
                  return (
                    <ItemCard
                      key={j}
                      item={item}
                      keepChecked={!!locked[lockKey]}
                      onToggleKeep={() => onToggleItem(active, tb, j)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TripResultPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const navigate = useNavigate();

  const lang = (i18n.language?.startsWith("he") ? "he" : "en") as "en" | "he";

  const [trip, setTrip] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockedItems, setLockedItems] = useState<Record<string, boolean>>({});

  const [draftItinerary, setDraftItinerary] = useState<Itinerary | null>(null);
  const [itineraryDirty, setItineraryDirty] = useState(false);

  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!trip) return t("app.title");
    return trip.destination || t("app.title");
  }, [trip, t]);

  const dateRange = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return "";
    return `${trip.startDate} ${t("common.to")} ${trip.endDate}`;
  }, [trip, t]);

  const syncDraftFromTrip = useCallback((p: TripPlanResponse) => {
    if (p.tripStatus === "READY" && p.itinerary) {
      setDraftItinerary(structuredClone(p.itinerary));
      setItineraryDirty(false);
    } else {
      setDraftItinerary(null);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const initial = await getTrip(id!, lang);
        if (cancelled) return;
        setTrip(initial);
        syncDraftFromTrip(initial);

        if (initial.tripStatus === "GENERATING") {
          const finalTrip = await pollTripUntilDone(id!, {
            intervalMs: 1200,
            timeoutMs: 90000,
            language: lang,
            onUpdate: (updatedTrip) => {
              if (!cancelled) {
                setTrip(updatedTrip);
                syncDraftFromTrip(updatedTrip);
              }
            },
          });
          if (!cancelled) {
            setTrip(finalTrip);
            syncDraftFromTrip(finalTrip);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setTrip({
            id,
            destination: "",
            startDate: "",
            endDate: "",
            tripGroup: null,
            travelStyle: null,
            budgetLevel: null,
            itinerary: null,
            tripStatus: "FAILED",
            errorMessage: e?.message ?? t("tripResult.generationFailed"),
            createdAt: null,
            updatedAt: null,
          } as any);
          setDraftItinerary(null);
          setItineraryDirty(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, lang, syncDraftFromTrip, t]);

  function reorderBlocksForDay(dayIndex: number, fromIndex: number, toIndex: number) {
    setDraftItinerary((prev) => {
      if (!prev?.dayPlans?.length) return prev;
      const dayPlans = prev.dayPlans.map((d) => ({ ...d, blocks: [...d.blocks] }));
      const day = dayPlans[dayIndex];
      if (!day?.blocks?.length) return prev;
      const blocks = [...day.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      day.blocks = blocks.map((b, idx) => ({
        ...b,
        timeBlock: TIME_BLOCK_ORDER[idx] ?? (b.timeBlock as TimeBlock),
      }));
      dayPlans[dayIndex] = day;
      return { ...prev, dayPlans };
    });
    setLockedItems({});
    setItineraryDirty(true);
    setSaveError(null);
  }

  async function onSaveItinerary() {
    if (!id || !draftItinerary) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const saved = await updateTripItinerary(id, draftItinerary, lang);
      setTrip(saved);
      syncDraftFromTrip(saved);
    } catch (e: any) {
      setSaveError(e?.message ?? t("common.error"));
    } finally {
      setSaveLoading(false);
    }
  }

  async function onRegenerate() {
    if (!id) return;
    setRegenLoading(true);
    setRegenError(null);
    try {
      setTrip((prev) => (prev ? { ...prev, tripStatus: "GENERATING" } : prev));
      setDraftItinerary(null);
      setItineraryDirty(false);

      const locked = Object.entries(lockedItems)
        .filter(([, v]) => v)
        .map(([k]) => {
          const [dayStr, tb, itemIdxStr] = k.split(":");
          return {
            day: Number(dayStr),
            timeBlock: tb as "MORNING" | "AFTERNOON" | "EVENING",
            itemIndex: Number(itemIdxStr),
          };
        });

      const updated = await regenerateTrip(id, { lockedItems: locked });
      if (!updated) throw new Error("Regenerate returned empty response");
      setTrip(updated);

      if (updated.tripStatus === "GENERATING") {
        const nextId = updated.id || id;
        if (nextId !== id) navigate(`/trip/${nextId}`, { replace: true });
        setLockedItems({});

        const finalTrip = await pollTripUntilDone(nextId, {
          intervalMs: 1200,
          timeoutMs: 90000,
          language: lang,
          onUpdate: (updatedTrip) => {
            if (updatedTrip) {
              setTrip(updatedTrip);
              syncDraftFromTrip(updatedTrip);
            }
          },
        });
        setTrip(finalTrip);
        syncDraftFromTrip(finalTrip);
      } else {
        syncDraftFromTrip(updated);
      }
    } catch (e: any) {
      setRegenError(e?.message ?? t("common.error"));
    } finally {
      setRegenLoading(false);
    }
  }

  return (
    <Page maxWidth="max-w-4xl">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link
            to="/"
            className="rounded-full px-2 py-0.5 text-brand-700 hover:bg-brand-50"
          >
            ← {t("common.back")}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-xs">
            {t("tripResult.tripId")}: {id}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
            {dateRange ? (
              <p className="mt-1 text-sm text-slate-600">{dateRange}</p>
            ) : null}
          </div>
          {trip ? <StatusPill status={trip.tripStatus} /> : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link to="/" className="btn-secondary">
          {t("app.planAnotherTrip")}
        </Link>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenLoading}
          className="btn-primary"
        >
          {regenLoading ? t("tripResult.regenerating") : t("tripResult.regenerate")}
        </button>
        <button
          type="button"
          onClick={onSaveItinerary}
          disabled={saveLoading || !itineraryDirty || !draftItinerary}
          className={cn(
            "btn",
            saveLoading || !itineraryDirty || !draftItinerary
              ? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
              : "bg-white text-emerald-800 ring-1 ring-emerald-300 hover:bg-emerald-50"
          )}
        >
          {saveLoading ? t("tripResult.savingItinerary") : t("tripResult.saveItinerary")}
        </button>
      </div>

      {trip?.tripStatus === "READY" ? (
        <p className="mt-3 text-xs text-slate-500">{t("tripResult.dragBlocksHint")}</p>
      ) : null}

      {regenError ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
        >
          {regenError}
        </div>
      ) : null}

      {saveError ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800"
        >
          {saveError}
        </div>
      ) : null}

      {loading ? <SpinnerRow text={t("tripResult.thinking")} /> : null}

      {trip?.tripStatus === "FAILED" ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-800">
          {trip.errorMessage ?? t("tripResult.generationFailed")}
        </div>
      ) : null}

      {!loading && trip?.tripStatus === "GENERATING" ? (
        <SpinnerRow text={t("tripResult.stillGenerating")} />
      ) : null}

      {trip?.tripStatus === "READY" && draftItinerary ? (
        <DayTabs
          trip={{ ...trip, itinerary: draftItinerary }}
          locked={lockedItems}
          onReorderBlocks={reorderBlocksForDay}
          onToggleItem={(dayIndex, timeBlock, itemIndex) => {
            const key = `${dayIndex + 1}:${timeBlock}:${itemIndex}`;
            setLockedItems((prev) => ({ ...prev, [key]: !prev[key] }));
          }}
        />
      ) : null}
    </Page>
  );
}
