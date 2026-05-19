import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TripForm from "../components/TripForm";
import TripGeneratingGame from "../../../components/game/TripGeneratingGame";
import Page from "../../../app/layout/Page";
import type { TripPlanResponse } from "../types/tripTypes";

export default function PlanTripPage() {
  const { t } = useTranslation();
  const [statusText, setStatusText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleResult = (trip: TripPlanResponse) => {
    if (trip.id) navigate(`/trip/${trip.id}`);
  };

  const handleStatus = (status: string) => {
    setStatusText(status);
    const s = status.toLowerCase();
    setIsGenerating(s.includes("generating") || s.includes("submitting") || s.includes("מייצר") || s.includes("שולח"));
  };

  return (
    <Page maxWidth="max-w-3xl">
      <section className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {t("planTrip.aiBadge")}
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {t("planTrip.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
          {t("planTrip.description")}
        </p>
      </section>

      <TripForm onResult={handleResult} onStatus={handleStatus} />

      {isGenerating ? (
        <TripGeneratingGame
          title={t("planTrip.creatingAdventure")}
          subtitle={t("planTrip.hangTight")}
        />
      ) : statusText ? (
        <div className="mt-8 text-center text-sm font-semibold text-brand-600">
          {statusText}
        </div>
      ) : null}
    </Page>
  );
}
