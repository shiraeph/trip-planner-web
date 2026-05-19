import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signin, signup } from "../api/authApi";
import { useAuth } from "../../../auth/AuthContext";
import Page from "../../../app/layout/Page";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function AuthPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "signup"
          ? await signup(email.trim(), password)
          : await signin(email.trim(), password);
      const token = typeof res?.token === "string" ? res.token.trim() : "";
      if (!token) {
        setError(t("auth.errorNoToken"));
        return;
      }
      login(token);
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? t("auth.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <Page maxWidth="max-w-5xl" minimalHeader>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
        <section className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t("planTrip.aiBadge")}
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {t("app.title")}
          </h1>
          <p className="mt-3 max-w-md text-base text-slate-600">
            {t("app.tagline")}
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <FeatureLi>{t("planTrip.dayByDayPlan")}</FeatureLi>
            <FeatureLi>{t("optionalDetails.directionsHint")}</FeatureLi>
            <FeatureLi>{t("preferences.interestsHint")}</FeatureLi>
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <div className="glass-card mx-auto w-full max-w-md p-6 sm:p-8">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {isSignup ? t("auth.signUpTitle") : t("auth.signInTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {isSignup ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
              </p>
            </div>

            <div
              role="tablist"
              className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1"
            >
              <TabButton
                active={!isSignup}
                onClick={() => setMode("signin")}
                label={t("auth.signIn")}
              />
              <TabButton
                active={isSignup}
                onClick={() => setMode("signup")}
                label={t("auth.signUp")}
              />
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {t("auth.email")}
                </span>
                <input
                  type="email"
                  className="input mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {t("auth.password")}
                </span>
                <input
                  type="password"
                  className="input mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  minLength={6}
                />
              </label>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cn("btn-primary w-full py-3 text-base")}
              >
                {loading
                  ? t("auth.loading")
                  : isSignup
                    ? t("auth.submitSignUp")
                    : t("auth.submitSignIn")}
              </button>

              <p className="text-center text-sm text-slate-500">
                {isSignup ? t("auth.switchToSignIn") : t("auth.switchToSignUp")}{" "}
                <button
                  type="button"
                  className="font-semibold text-brand-700 hover:underline"
                  onClick={() => setMode(isSignup ? "signin" : "signup")}
                >
                  {isSignup ? t("auth.signInLink") : t("auth.createOne")}
                </button>
              </p>
            </form>
          </div>
        </section>
      </div>
    </Page>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-white text-slate-900 shadow-soft"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
    </button>
  );
}

function FeatureLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M4 10.5l3.5 3.5L16 6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
