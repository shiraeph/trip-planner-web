import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  BudgetLevel,
  DisplayLanguage,
  GenderMix,
  GroupComposition,
  PlanTripRequest,
  SearchHistoryResponse,
  TravelStyle,
  TripPlanResponse,
} from "../types/tripTypes";
import { planTrip } from "../api/tripApi";

type Props = {
  onResult: (trip: TripPlanResponse) => void;
  onStatus?: (statusText: string) => void;
  prefill?: SearchHistoryResponse | null;
};

type TransportPreference = "WALKING" | "PUBLIC_TRANSPORT" | "TAXI" | "CAR" | "MIXED";

const INTEREST_KEYS = ["food", "history", "museums", "architecture", "shopping", "nature", "nightlife", "beaches"] as const;
const CONSTRAINT_KEYS = ["no long walks", "kid-friendly", "vegetarian friendly", "early nights", "avoid museums"] as const;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="mt-1">{children}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Chip({
  active,
  label,
  onClick,
  tone = "indigo",
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone?: "indigo" | "emerald" | "rose" | "sky";
}) {
  const activeClasses: Record<string, string> = {
    indigo: "border-indigo-400 bg-indigo-600 text-white shadow-sm shadow-indigo-200",
    emerald: "border-emerald-400 bg-emerald-600 text-white shadow-sm shadow-emerald-200",
    rose: "border-rose-400 bg-rose-600 text-white shadow-sm shadow-rose-200",
    sky: "border-sky-400 bg-sky-600 text-white shadow-sm shadow-sky-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        active
          ? activeClasses[tone]
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

function formatAsYyyyMmDd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function TripForm({ onResult, onStatus, prefill }: Props) {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language?.startsWith("he");
  const selectAlignClass = isHebrew ? "text-right" : "text-left";
  const selectStyle = useMemo(
    () =>
      ({
        textAlign: isHebrew ? "right" : "left",
        textAlignLast: isHebrew ? "right" : "left",
      }) as React.CSSProperties,
    [isHebrew]
  );

  // Basics
  const [destination, setDestination] = useState("Athens");
  const [startDate, setStartDate] = useState(() => formatAsYyyyMmDd(new Date()));
  const [endDate, setEndDate] = useState(() => formatAsYyyyMmDd(addDays(new Date(), 2)));
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("BALANCED");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("MEDIUM");

  // Group
  const [composition, setComposition] = useState<GroupComposition>("COUPLE");
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [genderMix, setGenderMix] = useState<GenderMix>("MIXED");
  const [minAge, setMinAge] = useState<number>(30);
  const [maxAge, setMaxAge] = useState<number>(40);

  // Preferences
  const [interests, setInterests] = useState<string[]>(["food", "history"]);
  const [constraints, setConstraints] = useState<string[]>(["no long walks"]);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.destination != null && prefill.destination !== "") {
      setDestination(prefill.destination);
    }
    if (prefill.startDate) setStartDate(prefill.startDate);
    if (prefill.endDate) setEndDate(prefill.endDate);
    if (prefill.budgetLevel) setBudgetLevel(prefill.budgetLevel);
    if (prefill.interests != null && prefill.interests.length > 0) {
      setInterests(prefill.interests);
    }
    if (prefill.constraints != null && prefill.constraints.length > 0) {
      setConstraints(prefill.constraints);
    } else if (prefill.constraints != null) {
      setConstraints([]);
    }
  }, [prefill]);

  // Optional
  const [hotelName, setHotelName] = useState("");
  const [hotelArea, setHotelArea] = useState("");
  const [freeText, setFreeText] = useState("");
  const [includeDirections, setIncludeDirections] = useState(false);
  const [transportPreference, setTransportPreference] =
    useState<TransportPreference>("PUBLIC_TRANSPORT");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const travelStyleHint = useMemo(() => {
    if (travelStyle === "RELAXED") return t("tripDetails.styles.relaxedHint");
    if (travelStyle === "INTENSE") return t("tripDetails.styles.intenseHint");
    return t("tripDetails.styles.balancedHint");
  }, [travelStyle, t]);

  const budgetHint = useMemo(() => {
    if (budgetLevel === "LOW") return t("tripDetails.budgetLevels.lowHint");
    if (budgetLevel === "HIGH") return t("tripDetails.budgetLevels.highHint");
    return t("tripDetails.budgetLevels.mediumHint");
  }, [budgetLevel, t]);

  function validate(): string | null {
    if (!destination.trim()) return t("validation.destinationRequired");
    if (!startDate || !endDate) return t("validation.datesRequired");
    if (startDate > endDate) return t("validation.endDateAfterStart");
    if (peopleCount < 1) return t("validation.peopleCountMin");
    if (minAge > maxAge) return t("validation.minAgeMaxAge");
    if (interests.length === 0) return t("validation.interestsRequired");
    return null;
  }

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError(null);
    onStatus?.(t("status.submitting"));

    const displayLanguage: DisplayLanguage = i18n.language?.startsWith("he") ? "HEBREW" : "ENGLISH";

    const transportPreferences =
      transportPreference === "PUBLIC_TRANSPORT" ? "PUBLIC_TRANPORT" : transportPreference;

    const req: PlanTripRequest = {
      destination: destination.trim(),
      startDate,
      endDate,
      tripGroup: { composition, peopleCount, genderMix, minAge, maxAge },
      travelStyle,
      budgetLevel,
      interests,
      constraints,

      hotelName: hotelName.trim() ? hotelName.trim() : undefined,
      hotelAddressOrArea: hotelArea.trim() ? hotelArea.trim() : undefined,
      freeText: freeText.trim() ? freeText.trim() : undefined,
      includeDirections,
      transportPreferences,
      displayLanguage,
    };

    try {
      const created = await planTrip(req);
      onResult(created);
      onStatus?.(`Status: ${created.tripStatus}`);
    } catch (e: any) {
      console.error("PLAN TRIP FAILED:", e);
      setError(e?.message ?? t("common.error"));
      onStatus?.(t("status.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* outer subtle gradient frame */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-100 via-white to-sky-100 p-[1px] shadow-sm">
        <div className="rounded-3xl bg-white/80 backdrop-blur p-6 shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              ✨ AI Trip Planner
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              Plan your trip
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tell us what you like — we’ll generate a day-by-day itinerary.
            </p>
          </div>

          <Section title={t("tripDetails.title")} subtitle={t("tripDetails.subtitle")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("tripDetails.destination")} hint={t("tripDetails.destinationHint")}>
                <input
                  className={inputBase}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t("tripDetails.destinationPlaceholder")}
                />
              </Field>

              <Field label={t("tripDetails.travelStyle")} hint={travelStyleHint}>
                <select
                  className={cn(inputBase, selectAlignClass)}
                  dir={isHebrew ? "rtl" : "ltr"}
                  style={selectStyle}
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
                >
                  <option value="RELAXED">{t("tripDetails.styles.relaxed")}</option>
                  <option value="BALANCED">{t("tripDetails.styles.balanced")}</option>
                  <option value="INTENSE">{t("tripDetails.styles.intense")}</option>
                </select>
              </Field>

              <Field label={t("tripDetails.startDate")}>
                <input
                  type="date"
                  className={inputBase}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>

              <Field label={t("tripDetails.endDate")}>
                <input
                  type="date"
                  className={inputBase}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>

              <Field label={t("tripDetails.budget")} hint={budgetHint}>
                <select
                  className={cn(inputBase, selectAlignClass)}
                  dir={isHebrew ? "rtl" : "ltr"}
                  style={selectStyle}
                  value={budgetLevel}
                  onChange={(e) => setBudgetLevel(e.target.value as BudgetLevel)}
                >
                  <option value="LOW">{t("tripDetails.budgetLevels.low")} ($2,000)</option>
                  <option value="MEDIUM">{t("tripDetails.budgetLevels.medium")} ($5,000)</option>
                  <option value="HIGH">{t("tripDetails.budgetLevels.high")} ($5,000+)</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title={t("groupDetails.title")} subtitle={t("groupDetails.subtitle")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("groupDetails.groupType")}>
                <select
                  className={cn(inputBase, selectAlignClass)}
                  dir={isHebrew ? "rtl" : "ltr"}
                  style={selectStyle}
                  value={composition}
                  onChange={(e) => setComposition(e.target.value as GroupComposition)}
                >
                  <option value="SOLO">{t("groupDetails.compositions.solo")}</option>
                  <option value="COUPLE">{t("groupDetails.compositions.couple")}</option>
                  <option value="FRIENDS">{t("groupDetails.compositions.friends")}</option>
                  <option value="FAMILY_WITH_KIDS">{t("groupDetails.compositions.familyWithKids")}</option>
                  <option value="FAMILY_NO_KIDS">{t("groupDetails.compositions.familyNoKids")}</option>
                  <option value="OTHER">{t("groupDetails.compositions.other")}</option>
                </select>
              </Field>

              <Field label={t("groupDetails.people")}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputBase}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                />
              </Field>

              <Field label={t("groupDetails.genderMix")} hint={t("groupDetails.genderMixHint")}>
                <select
                  className={cn(inputBase, selectAlignClass)}
                  dir={isHebrew ? "rtl" : "ltr"}
                  style={selectStyle}
                  value={genderMix}
                  onChange={(e) => setGenderMix(e.target.value as GenderMix)}
                >
                  <option value="MIXED">{t("groupDetails.genderMixes.mixed")}</option>
                  <option value="FEMALE_ONLY">{t("groupDetails.genderMixes.femaleOnly")}</option>
                  <option value="MALE_ONLY">{t("groupDetails.genderMixes.maleOnly")}</option>
                  <option value="UNKNOWN">{t("groupDetails.genderMixes.unknown")}</option>
                </select>
              </Field>

              <Field label={t("groupDetails.ageRange")} hint={t("groupDetails.ageRangeHint")}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className={inputBase}
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                  />
                  <span className="text-slate-500">{t("common.to")}</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    className={inputBase}
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section title={t("preferences.title")} subtitle={t("preferences.subtitle")}>
            <div>
              <div className="text-sm font-medium text-slate-700">{t("preferences.interests")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTEREST_KEYS.map((key) => (
                  <Chip
                    key={key}
                    active={interests.includes(key)}
                    label={t(`preferences.interestOptions.${key}`)}
                    tone="indigo"
                    onClick={() => setInterests((prev) => toggle(prev, key))}
                  />
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {t("preferences.interestsHint")}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700">{t("preferences.constraints")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONSTRAINT_KEYS.map((key) => {
                  const translationKey = key === "no long walks" ? "noLongWalks" :
                    key === "kid-friendly" ? "kidFriendly" :
                    key === "vegetarian friendly" ? "vegetarianFriendly" :
                    key === "early nights" ? "earlyNights" :
                    "avoidMuseums";
                  return (
                    <Chip
                      key={key}
                      active={constraints.includes(key)}
                      label={t(`preferences.constraintOptions.${translationKey}`)}
                      tone="sky"
                      onClick={() => setConstraints((prev) => toggle(prev, key))}
                    />
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Helps avoid suggestions you don’t want.
              </div>
            </div>
          </Section>

          <Section title={t("optionalDetails.title")} subtitle={t("optionalDetails.subtitle")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("optionalDetails.hotelName")} hint={t("optionalDetails.hotelNameHint")}>
                <input
                  className={inputBase}
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder={t("optionalDetails.hotelNamePlaceholder")}
                />
              </Field>

              <Field
                label={t("optionalDetails.hotelArea")}
                hint={t("optionalDetails.hotelAreaHint")}
              >
                <input
                  className={inputBase}
                  value={hotelArea}
                  onChange={(e) => setHotelArea(e.target.value)}
                  placeholder={t("optionalDetails.hotelAreaPlaceholder")}
                />
              </Field>

              <Field label={t("optionalDetails.transportPreference")} hint={t("optionalDetails.transportPreferenceHint")}>
                <select
                  className={cn(inputBase, selectAlignClass)}
                  dir={isHebrew ? "rtl" : "ltr"}
                  style={selectStyle}
                  value={transportPreference}
                  onChange={(e) =>
                    setTransportPreference(e.target.value as TransportPreference)
                  }
                >
                  <option value="WALKING">{t("optionalDetails.transportOptions.walking")}</option>
                  <option value="PUBLIC_TRANSPORT">{t("optionalDetails.transportOptions.publicTransport")}</option>
                  <option value="TAXI">{t("optionalDetails.transportOptions.taxi")}</option>
                  <option value="CAR">{t("optionalDetails.transportOptions.car")}</option>
                  <option value="MIXED">{t("optionalDetails.transportOptions.mixed")}</option>
                </select>
              </Field>

              <Field label={t("optionalDetails.directions")}>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <input
                    id="includeDirections"
                    type="checkbox"
                    checked={includeDirections}
                    onChange={(e) => setIncludeDirections(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="includeDirections" className="text-sm text-slate-700">
                    {t("optionalDetails.includeDirections")}
                  </label>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("optionalDetails.directionsHint")}
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label={t("optionalDetails.freeText")}
                  hint={t("optionalDetails.freeTextHint")}
                >
                  <textarea
                    className={cn(inputBase, "min-h-[90px]")}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder={t("optionalDetails.freeTextPlaceholder")}
                    rows={3}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {error ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className={cn(
                "w-full rounded-2xl px-4 py-3 font-semibold shadow-sm transition sm:w-80",
                loading
                  ? "cursor-not-allowed bg-slate-200 text-slate-700"
                  : "bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
              )}
            >
              {loading ? t("planTrip.generating") : t("planTrip.generateTrip")}
            </button>

            <div className="text-xs text-slate-500">
              {t("planTrip.dayByDayPlan")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
