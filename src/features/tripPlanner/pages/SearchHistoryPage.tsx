import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMyTrips } from "../api/tripApi";
import type { TripPlanResponse } from "../types/tripTypes";
import { useAuth } from "../../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../../components/LanguageSwitcher";

export default function SearchHistoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TripPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-b from-indigo-200 via-white to-sky-200 flex flex-col items-center py-10 relative overflow-hidden">
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
        <header className="mb-7 text-center">
          <h1 className="text-4xl font-extrabold tracking-wide text-indigo-700 drop-shadow-glow animate-fade-in">
            {t("history.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-500 animate-fade-in delay-75">
            {t("history.subtitle")}
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-indigo-50/80 px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
            >
              {t("history.backToPlanner")}
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
            {t("common.loading")}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
            {t("history.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/trip/${item.id}`)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {item.destination || t("history.untitledTrip")}
                  {item.startDate && item.endDate ? ` · ${item.startDate} → ${item.endDate}` : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={
                      item.tripStatus === "READY"
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200"
                        : item.tripStatus === "GENERATING"
                          ? "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200"
                          : "rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-800 ring-1 ring-rose-200"
                    }
                  >
                    {item.tripStatus}
                  </span>
                  <span>{t("history.openItinerary")}</span>
                </div>
              </button>
            ))}
          </div>
        )}
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(24px);} to { opacity: 1; transform: none;} }
        `}
      </style>
    </div>
  );
}

