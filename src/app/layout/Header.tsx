import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-soft">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2.5 12.5l8 1.5 9-9 2 2-9 9 1.5 8-2 1-3.5-6-4 4 .5 3-1.5 1-2-3.5L-.5 17l1-2 3 .5 4-4-5-3 2-1z"
            transform="translate(1 0)"
            fill="white"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
        Travel Planner
      </span>
    </span>
  );
}

type Props = {
  /** If true, no nav links / sign-out (useful for the auth screen) */
  minimal?: boolean;
};

export default function Header({ minimal = false }: Props) {
  const { t } = useTranslation();
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      isActive
        ? "bg-brand-50 text-brand-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(token ? "/" : "/auth")}
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          aria-label="Home"
        >
          <BrandMark />
        </button>

        {!minimal && token ? (
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/" className={navLinkClass} end>
              {t("nav.plan")}
            </NavLink>
            <NavLink to="/history" className={navLinkClass}>
              {t("nav.history")}
            </NavLink>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {!minimal && token ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/auth", { replace: true });
              }}
              className="btn-secondary !rounded-full !px-3 !py-1.5"
            >
              {t("auth.signOut")}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
