import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TripForm from "../components/TripForm";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import type { TripPlanResponse } from "../types/tripTypes";
import { useAuth } from "../../../auth/AuthContext";

export default function PlanTripPage() {
    const { t } = useTranslation();
    const [statusText, setStatusText] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleResult = (trip: TripPlanResponse) => {
        if (trip.id) {
            navigate(`/trip/${trip.id}`);
        }
    };

    const handleStatus = (status: string) => {
        setStatusText(status);
        const statusLower = status.toLowerCase();
        setIsGenerating(
            statusLower.includes("generating") || statusLower.includes("submitting")
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-200 via-white to-sky-200 flex items-center justify-center relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute left-[-80px] top-[10%] w-52 h-52 bg-indigo-100 rounded-full z-0 blur-2xl opacity-70 animate-float" />
            <div className="absolute right-[-60px] bottom-[5%] w-36 h-36 bg-sky-100 rounded-full z-0 blur-2xl opacity-70 animate-float-slow" />
            <div className="absolute left-[42%] top-[78%] w-20 h-20 bg-yellow-100 rounded-full z-0 blur-lg opacity-60 animate-float-reverse" />

            <div className="relative z-10 mx-auto max-w-3xl w-full bg-white bg-opacity-75 rounded-3xl shadow-xl px-6 py-12 sm:px-10">
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
                        {t("app.title")}
                    </h1>
                    <p className="mt-3 text-lg text-gray-500 font-medium animate-fade-in delay-75">
                        {t("app.subtitle")}
                    </p>
                </header>

                <div className="mb-7 flex flex-col items-center animate-fade-in delay-150">
                    <div className="flex flex-row gap-3">
                        <span className="inline-block text-2xl">🌏</span>
                        <span className="inline-block text-2xl">🧳</span>
                        <span className="inline-block text-2xl">📍</span>
                        <span className="inline-block text-2xl">🏖️</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        {t("app.tagline")}
                    </div>
                </div>

                <div className="mb-6 flex justify-center animate-fade-in delay-150">
                    <button
                        type="button"
                        onClick={() => navigate("/history")}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-50/80 px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
                    >
                        {t("history.button")}
                    </button>
                </div>

                <TripForm
                    onResult={handleResult}
                    onStatus={handleStatus}
                />

                {isGenerating ? (
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 text-base text-gray-800">
                        <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500 shadow ring-2 ring-indigo-100" />
                        <span className="font-medium">
                            {t("planTrip.creatingAdventure")}<br/>
                            <span className="text-indigo-400 ">{t("planTrip.hangTight")}</span>
                        </span>
                    </div>
                ) : statusText ? (
                    <div className="mt-8 text-center text-base text-indigo-500 font-semibold animate-pulse">
                        {statusText}
                    </div>
                ) : null}
            </div>

            {/* Additional Animated Styles */}
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
