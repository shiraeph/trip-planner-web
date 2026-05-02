import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSearchHistory } from "../api/tripApi";
import type { SearchHistoryResponse } from "../types/tripTypes";

type Props = {
    onSelect: (item: SearchHistoryResponse) => void;
};

const DISPLAY_LIMIT = 10;

export default function RecentSearches({ onSelect }: Props) {
    const { t } = useTranslation();
    const [items, setItems] = useState<SearchHistoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getSearchHistory()
            .then((data) => {
                if (!cancelled) setItems((data ?? []).slice(0, DISPLAY_LIMIT));
            })
            .catch((e) => {
                if (!cancelled) setError(e?.message ?? t("common.error"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [t]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                {t("common.loading")}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                {error}
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">{t("recentSearches.title")}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{t("recentSearches.hint")}</p>
            <ul className="mt-3 space-y-1.5">
                {items.map((item) => (
                    <li key={item.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(item)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow"
                        >
                            <span className="font-medium text-slate-900">
                                {item.queryText || t("recentSearches.noFilters")}
                            </span>
                            {item.destination && (
                                <span className="ml-2 text-slate-500">
                                    • {item.destination}
                                    {item.startDate && item.endDate && ` · ${item.startDate} → ${item.endDate}`}
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
