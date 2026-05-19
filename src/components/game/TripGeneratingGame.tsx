import { useTranslation } from "react-i18next";
import AirplaneGame from "./AirplaneGame";

type Props = {
  title: string;
  subtitle?: string;
  active?: boolean;
  className?: string;
};

export default function TripGeneratingGame({
  title,
  subtitle,
  active = true,
  className = "",
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={`mt-8 flex w-full flex-col items-center gap-4 ${className}`}
      aria-busy="true"
    >
      <div className="max-w-md text-center">
        <p className="text-base font-semibold text-slate-800">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>

      <div className="card w-full max-w-xl p-4 sm:p-5">
        <p className="mb-3 text-center text-xs font-medium text-brand-700">
          {t("waitingGame.playWhileWaiting")}
        </p>
        <AirplaneGame active={active} />
        <p className="mt-3 text-center text-xs text-slate-500">
          {t("waitingGame.controlsHint")}
        </p>
      </div>
    </div>
  );
}
