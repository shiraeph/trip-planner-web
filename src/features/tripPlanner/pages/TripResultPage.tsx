import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTrip, pollTripUntilDone, regenerateTrip, updateTripItinerary } from "../api/tripApi";
import type { Itinerary, TimeBlock, TripPlanResponse } from "../types/tripTypes";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { useAuth } from "../../../auth/AuthContext";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function SpinnerRow({ text }: { text: string }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 text-base text-gray-800">
      <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500 shadow ring-2 ring-indigo-100" />
      <span className="font-medium">{text}</span>
    </div>
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
        <span className="font-semibold text-slate-900">{t("tripResult.directions")}</span>
        <ModeBadge mode={mode} />
        {minutes != null ? <span className="text-slate-500">~{minutes} {t("common.min")}</span> : null}
        {from ? <span className="text-slate-500">{t("common.from")} {from}</span> : null}
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

          <div className="text-sm font-medium text-slate-900">{item.name}</div>

          {item.location?.name ? (
            <div className="text-sm text-slate-500">· {item.location.name}</div>
          ) : null}
        </div>

        {onToggleKeep ? (
          <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
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

      {item.notes ? <div className="mt-1 text-sm text-slate-600">{item.notes}</div> : null}

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
      {/* Day tabs */}
      <div className="flex flex-wrap gap-2">
        {days.map((d, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                isActive
                  ? "border-indigo-300 bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              )}
            >
              <div className="font-semibold">{t("tripResult.day")} {idx + 1}</div>
              <div className="text-xs opacity-80">{d.date}</div>
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-lg font-semibold text-slate-900">{day.title}</div>
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
                dragBlockIdx === i ? "border-indigo-300 bg-indigo-50/50 opacity-90" : "hover:border-slate-200 hover:bg-slate-50/50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-600">
                  <span className="cursor-grab select-none text-slate-400" aria-hidden>
                    ⋮⋮
                  </span>
                  <span>{block.timeBlock}</span>
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
  const { logout } = useAuth();

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
    const dest = trip.destination || t("app.title");
    const dates =
      trip.startDate && trip.endDate ? ` · ${trip.startDate} ${t("common.to")} ${trip.endDate}` : "";
    return `${dest}${dates}`;
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
            errorMessage: e?.message ?? "Failed to load trip",
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
  }, [id, lang, syncDraftFromTrip]);

  function reorderBlocksForDay(dayIndex: number, fromIndex: number, toIndex: number) {
    setDraftItinerary((prev) => {
      if (!prev?.dayPlans?.length) return prev;
      const dayPlans = prev.dayPlans.map((d) => ({
        ...d,
        blocks: [...d.blocks],
      }));
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
      setSaveError(e?.message ?? "Save failed");
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

      if (!updated) {
        throw new Error("Regenerate returned empty response");
      }

      setTrip(updated);

      if (updated.tripStatus === "GENERATING") {
        const nextId = updated.id || id;
        if (nextId !== id) {
          navigate(`/trip/${nextId}`, { replace: true });
        }
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
      setRegenError(e?.message ?? "Failed to regenerate");
    } finally {
      setRegenLoading(false);
    }

  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-200 via-white to-sky-200 flex flex-col items-center py-10 relative overflow-y-auto">
      {/* Decorative Background Elements (same as Plan Trip) */}
      <div className="absolute left-[-80px] top-[10%] w-52 h-52 bg-indigo-100 rounded-full z-0 blur-2xl opacity-70 animate-float" />
      <div className="absolute right-[-60px] bottom-[5%] w-36 h-36 bg-sky-100 rounded-full z-0 blur-2xl opacity-70 animate-float-slow" />
      <div className="absolute left-[42%] top-[78%] w-20 h-20 bg-yellow-100 rounded-full z-0 blur-lg opacity-60 animate-float-reverse" />

      <div className="relative z-10 mx-auto max-w-3xl w-full bg-white bg-opacity-75 rounded-3xl shadow-xl px-6 py-12 sm:px-10 my-10">
        <div className="absolute top-4 left-0 right-0 z-20 px-6 sm:px-10">
          <div className="flex items-center justify-between">
            <div className="lang-switcher-container">
              <LanguageSwitcher />
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/auth", { replace: true });
              }}
              className="inline-flex items-center justify-center rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-white"
            >
              {t("auth.signOut")}
            </button>
          </div>
        </div>

        <header className="mb-9 text-center">
          <h1 className="text-5xl font-extrabold tracking-wide text-indigo-700 drop-shadow-glow animate-fade-in">
            {title}
          </h1>
          <p className="mt-3 text-lg text-gray-500 font-medium animate-fade-in delay-75">
            {t("tripResult.tripId")} <span className="font-mono">{id}</span>
          </p>
        </header>

        <div className="mb-7 flex flex-col items-center animate-fade-in delay-150">
          <div className="flex flex-row gap-3">
            <span className="inline-block text-2xl">🌏</span>
            <span className="inline-block text-2xl">🧳</span>
            <span className="inline-block text-2xl">📍</span>
            <span className="inline-block text-2xl">🏖️</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">{t("tripResult.tagline")}</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8 animate-fade-in delay-150">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {t("common.back")}
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {t("app.planAnotherTrip")}
          </Link>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenLoading}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
              regenLoading
                ? "cursor-not-allowed bg-slate-200 text-slate-700"
                : "bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
            )}
          >
            {regenLoading ? t("tripResult.regenerating") : t("tripResult.regenerate")}
          </button>
          <button
            type="button"
            onClick={onSaveItinerary}
            disabled={saveLoading || !itineraryDirty || !draftItinerary}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ring-1",
              saveLoading || !itineraryDirty || !draftItinerary
                ? "cursor-not-allowed bg-slate-100 text-slate-500 ring-slate-200"
                : "bg-white text-emerald-800 ring-emerald-300 hover:bg-emerald-50"
            )}
          >
            {saveLoading ? t("tripResult.savingItinerary") : t("tripResult.saveItinerary")}
          </button>
        </div>

        {trip?.tripStatus === "READY" ? (
          <p className="mt-3 text-center text-xs text-slate-500">{t("tripResult.dragBlocksHint")}</p>
        ) : null}

        {loading ? <SpinnerRow text={t("tripResult.thinking")} /> : null}

        {regenError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-center">
            {regenError}
          </div>
        ) : null}

        {saveError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-center">
            {saveError}
          </div>
        ) : null}

        {trip ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-indigo-50/80 px-3 py-1 text-sm text-indigo-800 shadow-sm ring-1 ring-indigo-200">
              {t("tripResult.status")} <b>{trip.tripStatus}</b>
            </span>
            {trip.destination ? (
              <span className="rounded-full bg-indigo-50/80 px-3 py-1 text-sm text-indigo-800 shadow-sm ring-1 ring-indigo-200">
                {trip.destination}
              </span>
            ) : null}
            {trip.tripGroup?.composition ? (
              <span className="rounded-full bg-indigo-50/80 px-3 py-1 text-sm text-indigo-800 shadow-sm ring-1 ring-indigo-200">
                {t("tripResult.group")} <b>{trip.tripGroup.composition}</b>
              </span>
            ) : null}
          </div>
        ) : null}

        {trip?.tripStatus === "FAILED" ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-center">
            {trip.errorMessage ?? t("tripResult.generationFailed")}
          </div>
        ) : null}

        {!loading && trip?.tripStatus === "GENERATING" ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-base text-gray-800">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500 shadow ring-2 ring-indigo-100" />
            <span className="font-medium">{t("tripResult.stillGenerating")}</span>
          </div>
        ) : null}

        {trip?.tripStatus === "READY" && draftItinerary ? (
          <div className="animate-fade-in">
            <DayTabs
              trip={{ ...trip, itinerary: draftItinerary }}
              locked={lockedItems}
              onReorderBlocks={reorderBlocksForDay}
              onToggleItem={(dayIndex, timeBlock, itemIndex) => {
                const key = `${dayIndex + 1}:${timeBlock}:${itemIndex}`;
                setLockedItems((prev) => ({ ...prev, [key]: !prev[key] }));
              }}
            />
          </div>
        ) : null}
      </div>

      <style>
        {`
        @keyframes float {
          0% { transform: translateY(0);}
          50% { transform: translateY(-24px);}
          100% { transform: translateY(0);}
        }
        @keyframes float-slow {
          0% { transform: translateY(0);}
          50% { transform: translateY(20px);}
          100% { transform: translateY(0);}
        }
        @keyframes float-reverse {
          0% { transform: translateY(0);}
          50% { transform: translateY(-12px);}
          100% { transform: translateY(0);}
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 6s ease-in-out infinite; }
        .drop-shadow-glow { filter: drop-shadow(0px 0px 12px #a5b4fc); }
        .animate-fade-in {
          animation: fadeIn 1s cubic-bezier(0.23, 1, 0.32, 1);
          opacity: 1;
        }
        .animate-fade-in.delay-75 { animation-delay: 0.15s; }
        .animate-fade-in.delay-150 { animation-delay: 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(24px);} to { opacity: 1; transform: none;} }
        `}
      </style>
    </div>
  );
}
