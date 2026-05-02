/**
 * API requests use this helper so production works when:
 * - `VITE_API_URL` points at your backend (e.g. https://api.example.com), or
 * - it is unset and the SPA is served behind the same origin as `/api/*` (reverse proxy).
 */
function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function readEnvApiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Explicit backend origin only (scheme + host + port). No path. Empty in production = use same origin as the page.
 * In dev, defaults to http://localhost:8080 when VITE_API_URL is unset.
 */
export const API_BASE: string = import.meta.env.DEV
  ? trimTrailingSlash(readEnvApiBase() || "http://localhost:8080")
  : trimTrailingSlash(readEnvApiBase());

/** Origin used for API calls: configured base, or current page origin when API_BASE is empty (prod + same-host /api). */
export function resolveApiOrigin(): string {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * Absolute URL for a path such as `/api/auth/signin`.
 * Do not use `new URL(\`\${API_BASE}/api/...\`)` when API_BASE may be empty — it breaks in the browser.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = resolveApiOrigin();
  if (!origin) {
    throw new Error(
      "Cannot build API URL: set VITE_API_URL at build time, or load the app in a browser with same-origin /api routing."
    );
  }
  return `${trimTrailingSlash(origin)}${p}`;
}
