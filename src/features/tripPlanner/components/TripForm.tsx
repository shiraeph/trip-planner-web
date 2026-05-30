import { useEffect, useMemo, useRef, useState } from "react";
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
  prefill?: SearchHistoryResponse | TripPlanResponse | null;
};

type TransportPreference = "WALKING" | "PUBLIC_TRANSPORT" | "TAXI" | "CAR" | "MIXED";

const TREKKING_KEYS = ["trekkingEasy", "trekkingModerate", "trekkingDifficult"] as const;
type TrekkingKey = (typeof TREKKING_KEYS)[number];

const INTEREST_KEYS = [
  "food",
  "history",
  "museums",
  "architecture",
  "shopping",
  "nature",
  "nightlife",
  "beaches",
  "art",
  "localMarkets",
  "coffee",
  "photography",
  "music",
  "sports",
  "trekkingEasy",
  "trekkingModerate",
  "trekkingDifficult",
  "wellness",
  "technology",
  "dayTrips",
] as const;
const CONSTRAINT_KEYS = [
  "no long walks",
  "kid-friendly",
  "vegetarian friendly",
  "gluten-free friendly",
  "wheelchair accessible",
  "early nights",
  "late starts",
  "avoid museums",
  "avoid nightlife",
  "avoid crowds",
  "low budget",
] as const;

const CONSTRAINT_TRANSLATION_KEY: Record<(typeof CONSTRAINT_KEYS)[number], string> = {
  "no long walks": "noLongWalks",
  "kid-friendly": "kidFriendly",
  "vegetarian friendly": "vegetarianFriendly",
  "gluten-free friendly": "glutenFreeFriendly",
  "wheelchair accessible": "wheelchairAccessible",
  "early nights": "earlyNights",
  "late starts": "lateStarts",
  "avoid museums": "avoidMuseums",
  "avoid nightlife": "avoidNightlife",
  "avoid crowds": "avoidCrowds",
  "low budget": "lowBudget",
};

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function isTrekkingKey(value: string): value is TrekkingKey {
  return (TREKKING_KEYS as readonly string[]).includes(value);
}

function toggleInterest(list: string[], value: string): string[] {
  if (isTrekkingKey(value)) {
    if (list.includes(value)) {
      return list.filter((x) => x !== value);
    }
    return [...list.filter((x) => !isTrekkingKey(x) && x !== "hiking"), value];
  }
  return toggle(list, value);
}

function normalizeInterests(raw: string[]): string[] {
  const withoutLegacyHiking = raw.filter((x) => x !== "hiking");
  const trekking = withoutLegacyHiking.filter(isTrekkingKey);
  if (trekking.length <= 1) {
    return withoutLegacyHiking;
  }
  return withoutLegacyHiking.filter((x) => !isTrekkingKey(x)).concat(trekking[0]);
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
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
    <section className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={active ? "chip-active" : "chip-default"}
    >
      {label}
    </button>
  );
}

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

  const endDateRef = useRef<HTMLInputElement | null>(null);

  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState(() => formatAsYyyyMmDd(new Date()));
  const [endDate, setEndDate] = useState(() =>
    formatAsYyyyMmDd(addDays(new Date(), 2))
  );
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("BALANCED");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>("MEDIUM");
  const [budgetUsd, setBudgetUsd] = useState<number>(5000);

  const [composition, setComposition] = useState<GroupComposition>("COUPLE");
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [genderMix, setGenderMix] = useState<GenderMix>("MIXED");
  const [minAge, setMinAge] = useState<number>(30);
  const [maxAge, setMaxAge] = useState<number>(40);

  const [interests, setInterests] = useState<string[]>(["food", "history"]);
  const [constraints, setConstraints] = useState<string[]>(["no long walks"]);

  useEffect(() => {
    if (!prefill) return;
    // Supports both SearchHistoryResponse and TripPlanResponse.
    const anyPrefill = prefill as any;

    if (anyPrefill.destination) {
      const d = String(anyPrefill.destination);
      const parts = d.split(",").map((x: string) => x.trim()).filter(Boolean);
      if (parts.length >= 2) {
        setCity(parts[0] ?? "");
        setCountry(parts.slice(1).join(", "));
      } else {
        setCity(d);
        setCountry("");
      }
    }
    if (anyPrefill.startDate) setStartDate(String(anyPrefill.startDate));
    if (anyPrefill.endDate) setEndDate(String(anyPrefill.endDate));

    if (anyPrefill.travelStyle) setTravelStyle(anyPrefill.travelStyle as TravelStyle);
    if (anyPrefill.budgetLevel) {
      const bl = anyPrefill.budgetLevel as BudgetLevel;
      setBudgetLevel(bl);
      setBudgetUsd(bl === "LOW" ? 2000 : bl === "HIGH" ? 25000 : 5000);
    }

    const tg = anyPrefill.tripGroup;
    if (tg) {
      if (tg.composition) setComposition(tg.composition as GroupComposition);
      if (tg.peopleCount != null) setPeopleCount(Number(tg.peopleCount));
      if (tg.genderMix) setGenderMix(tg.genderMix as GenderMix);
      if (tg.minAge != null) setMinAge(Number(tg.minAge));
      if (tg.maxAge != null) setMaxAge(Number(tg.maxAge));
    }

    if (Array.isArray(anyPrefill.interests) && anyPrefill.interests.length > 0) {
      setInterests(normalizeInterests(anyPrefill.interests));
    }
    if (Array.isArray(anyPrefill.constraints) && anyPrefill.constraints.length > 0) {
      setConstraints(anyPrefill.constraints);
    } else if (anyPrefill.constraints != null) {
      setConstraints([]);
    }

    if (anyPrefill.hotelName != null) setHotelName(String(anyPrefill.hotelName ?? ""));
    if (anyPrefill.hotelAddressOrArea != null) setHotelArea(String(anyPrefill.hotelAddressOrArea ?? ""));
    if (anyPrefill.freeText != null) setFreeText(String(anyPrefill.freeText ?? ""));
    if (anyPrefill.includeDirections != null) setIncludeDirections(Boolean(anyPrefill.includeDirections));
    if (anyPrefill.transportPreferences) {
      const tp = String(anyPrefill.transportPreferences);
      // Map backend enum to UI values.
      if (tp === "PUBLIC_TRANPORT") setTransportPreference("PUBLIC_TRANSPORT");
      else if (tp === "WALKING") setTransportPreference("WALKING");
      else if (tp === "TAXI") setTransportPreference("TAXI");
      else if (tp === "CAR") setTransportPreference("CAR");
      else if (tp === "MIXED") setTransportPreference("MIXED");
    }
  }, [prefill]);

  useEffect(() => {
    // Keep backend enum in sync with the slider.
    const next: BudgetLevel = budgetUsd < 3000 ? "LOW" : budgetUsd < 12000 ? "MEDIUM" : "HIGH";
    setBudgetLevel(next);
  }, [budgetUsd]);

  useEffect(() => {
    // If group type implies a fixed/typical size, help the user by adjusting.
    if (composition === "SOLO") {
      if (peopleCount !== 1) setPeopleCount(1);
      return;
    }
    // If user comes from SOLO and had 1, bump to a reasonable default.
    if (peopleCount === 1 && (composition === "COUPLE" || composition === "FRIENDS")) {
      setPeopleCount(2);
    }
  }, [composition, peopleCount]);

  const [hotelName, setHotelName] = useState("");
  const [hotelArea, setHotelArea] = useState("");
  const [freeText, setFreeText] = useState("");
  const [includeDirections, setIncludeDirections] = useState(false);
  const [transportPreference, setTransportPreference] =
    useState<TransportPreference>("PUBLIC_TRANSPORT");

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

  const tripDayCount = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return 0;
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return diff + 1;
  }, [startDate, endDate]);

  const selectDir = isHebrew ? "rtl" : "ltr";

  function validate(): string | null {
    if (!city.trim() && !country.trim()) return t("validation.destinationRequired");
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

    const destination = [city.trim(), country.trim()].filter(Boolean).join(", ");

    const displayLanguage: DisplayLanguage = isHebrew ? "HEBREW" : "ENGLISH";

    const transportPreferences =
      transportPreference === "PUBLIC_TRANSPORT" ? "PUBLIC_TRANPORT" : transportPreference;

    const req: PlanTripRequest = {
      destination,
      startDate,
      endDate,
      tripGroup: { composition, peopleCount, genderMix, minAge, maxAge },
      travelStyle,
      budgetLevel,
      interests,
      constraints,
      hotelName: hotelName.trim() || undefined,
      hotelAddressOrArea: hotelArea.trim() || undefined,
      freeText: freeText.trim() || undefined,
      includeDirections,
      transportPreferences,
      displayLanguage,
    };

    try {
      const created = await planTrip(req);
      onResult(created);
      onStatus?.(`${t("tripResult.status")}: ${created.tripStatus}`);
    } catch (e: any) {
      console.error("PLAN TRIP FAILED:", e);
      setError(e?.message ?? t("common.error"));
      onStatus?.(t("status.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="card mx-auto w-full max-w-2xl p-6 sm:p-8"
    >
      <div className="space-y-6">
        <Section
          title={t("tripDetails.title")}
          subtitle={t("tripDetails.subtitle")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("tripDetails.country")}
              hint={t("tripDetails.countryHint")}
            >
              <input
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t("tripDetails.countryPlaceholder")}
              />
            </Field>

            <Field
              label={t("tripDetails.city")}
              hint={t("tripDetails.cityHint")}
            >
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("tripDetails.cityPlaceholder")}
              />
            </Field>

            <Field label={t("tripDetails.startDate")}>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Immediately guide the user to the end date field.
                  requestAnimationFrame(() => endDateRef.current?.focus());
                }}
                required
              />
            </Field>

            <Field label={t("tripDetails.endDate")}>
              <input
                ref={endDateRef}
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Field>

            {tripDayCount > 0 ? (
              <div className="sm:col-span-2 rounded-xl bg-brand-50/80 px-3 py-2 text-sm text-brand-800 ring-1 ring-brand-100">
                <p className="font-medium">{t("tripDetails.tripLength", { count: tripDayCount })}</p>
                {tripDayCount > 9 ? (
                  <p className="mt-0.5 text-xs text-brand-700">{t("tripDetails.longTripHint")}</p>
                ) : null}
              </div>
            ) : null}

            <Field
              label={t("tripDetails.budget")}
              hint={`${budgetHint} · ${t("tripDetails.budgetSelected", {
                amount: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(budgetUsd),
              })}`}
            >
              <input
                type="range"
                min={500}
                max={100000}
                step={500}
                value={budgetUsd}
                onChange={(e) => setBudgetUsd(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>$500</span>
                <span>$100,000</span>
              </div>
            </Field>

            <Field label={t("tripDetails.travelStyle")} hint={travelStyleHint}>
              <select
                className="input"
                dir={selectDir}
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
              >
                <option value="RELAXED">{t("tripDetails.styles.relaxed")}</option>
                <option value="BALANCED">{t("tripDetails.styles.balanced")}</option>
                <option value="INTENSE">{t("tripDetails.styles.intense")}</option>
              </select>
              <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                {travelStyle === "RELAXED"
                  ? t("tripDetails.styles.relaxedMoreInfo")
                  : travelStyle === "INTENSE"
                    ? t("tripDetails.styles.intenseMoreInfo")
                    : t("tripDetails.styles.balancedMoreInfo")}
              </div>
            </Field>
          </div>
        </Section>

        <Section
          title={t("groupDetails.title")}
          subtitle={t("groupDetails.subtitle")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("groupDetails.groupType")}>
              <select
                className="input"
                dir={selectDir}
                value={composition}
                onChange={(e) => setComposition(e.target.value as GroupComposition)}
              >
                <option value="SOLO">{t("groupDetails.compositions.solo")}</option>
                <option value="COUPLE">{t("groupDetails.compositions.couple")}</option>
                <option value="FRIENDS">{t("groupDetails.compositions.friends")}</option>
                <option value="FAMILY_WITH_KIDS">
                  {t("groupDetails.compositions.familyWithKids")}
                </option>
                <option value="FAMILY_NO_KIDS">
                  {t("groupDetails.compositions.familyNoKids")}
                </option>
                <option value="OTHER">{t("groupDetails.compositions.other")}</option>
              </select>
            </Field>

            <Field label={t("groupDetails.people")}>
              <input
                type="number"
                min={composition === "SOLO" ? 1 : 1}
                max={20}
                className="input"
                value={peopleCount}
                onChange={(e) => setPeopleCount(Number(e.target.value))}
                disabled={composition === "SOLO"}
              />
            </Field>

            <Field
              label={t("groupDetails.genderMix")}
              hint={t("groupDetails.genderMixHint")}
            >
              <select
                className="input"
                dir={selectDir}
                value={genderMix}
                onChange={(e) => setGenderMix(e.target.value as GenderMix)}
              >
                <option value="MIXED">{t("groupDetails.genderMixes.mixed")}</option>
                <option value="FEMALE_ONLY">
                  {t("groupDetails.genderMixes.femaleOnly")}
                </option>
                <option value="MALE_ONLY">
                  {t("groupDetails.genderMixes.maleOnly")}
                </option>
                <option value="UNKNOWN">
                  {t("groupDetails.genderMixes.unknown")}
                </option>
              </select>
            </Field>

            <Field
              label={t("groupDetails.ageRange")}
              hint={t("groupDetails.ageRangeHint")}
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  className="input"
                  value={minAge}
                  onChange={(e) => setMinAge(Number(e.target.value))}
                />
                <span className="text-slate-500">{t("common.to")}</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  className="input"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Number(e.target.value))}
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section
          title={t("preferences.title")}
          subtitle={t("preferences.subtitle")}
        >
          <div>
            <div className="text-sm font-medium text-slate-700">
              {t("preferences.interests")}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_KEYS.map((key) => (
                <Chip
                  key={key}
                  active={interests.includes(key)}
                  label={t(`preferences.interestOptions.${key}`)}
                  onClick={() => setInterests((prev) => toggleInterest(prev, key))}
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("preferences.interestsHint")}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-medium text-slate-700">
              {t("preferences.constraints")}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONSTRAINT_KEYS.map((key) => (
                <Chip
                  key={key}
                  active={constraints.includes(key)}
                  label={t(`preferences.constraintOptions.${CONSTRAINT_TRANSLATION_KEY[key]}`)}
                  onClick={() => setConstraints((prev) => toggle(prev, key))}
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t("preferences.constraintsHint")}
            </div>
          </div>
        </Section>

        <Section
          title={t("optionalDetails.title")}
          subtitle={t("optionalDetails.subtitle")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("optionalDetails.hotelName")}
              hint={t("optionalDetails.hotelNameHint")}
            >
              <input
                className="input"
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
                className="input"
                value={hotelArea}
                onChange={(e) => setHotelArea(e.target.value)}
                placeholder={t("optionalDetails.hotelAreaPlaceholder")}
              />
            </Field>

            <Field
              label={t("optionalDetails.transportPreference")}
              hint={t("optionalDetails.transportPreferenceHint")}
            >
              <select
                className="input"
                dir={selectDir}
                value={transportPreference}
                onChange={(e) =>
                  setTransportPreference(e.target.value as TransportPreference)
                }
              >
                <option value="WALKING">
                  {t("optionalDetails.transportOptions.walking")}
                </option>
                <option value="PUBLIC_TRANSPORT">
                  {t("optionalDetails.transportOptions.publicTransport")}
                </option>
                <option value="TAXI">{t("optionalDetails.transportOptions.taxi")}</option>
                <option value="CAR">{t("optionalDetails.transportOptions.car")}</option>
                <option value="MIXED">
                  {t("optionalDetails.transportOptions.mixed")}
                </option>
              </select>
            </Field>

            <Field label={t("optionalDetails.directions")}>
              <label
                htmlFor="includeDirections"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition hover:border-brand-300"
              >
                <input
                  id="includeDirections"
                  type="checkbox"
                  checked={includeDirections}
                  onChange={(e) => setIncludeDirections(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                />
                <span>{t("optionalDetails.includeDirections")}</span>
              </label>
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
                  className={cn("input min-h-[100px] resize-y")}
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
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base sm:w-auto sm:min-w-[16rem]"
          >
            {loading ? t("planTrip.generating") : t("planTrip.generateTrip")}
          </button>
          <div className="text-xs text-slate-500">{t("planTrip.dayByDayPlan")}</div>
        </div>
      </div>
    </form>
  );
}
