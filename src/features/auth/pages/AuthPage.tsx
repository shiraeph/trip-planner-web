import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signin, signup } from "../api/authApi";
import { setAuthToken } from "../../../shared/lib/auth";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "signup"
          ? await signup(email.trim(), password)
          : await signin(email.trim(), password);
      setAuthToken(res.token);
      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-200 via-white to-sky-200 flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-md w-full bg-white bg-opacity-80 rounded-3xl shadow-xl px-6 py-10 sm:px-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-wide text-indigo-700">
            Travel Planner
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "signup" ? "Create an account" : "Sign in to continue"}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold border transition",
              mode === "signin"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold border transition",
              mode === "signup"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            )}
          >
            Sign up
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <div className="text-sm font-medium text-slate-700">Email</div>
            <input
              className={cn(inputBase, "mt-1")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-slate-700">Password</div>
            <input
              type="password"
              className={cn(inputBase, "mt-1")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className={cn(
              "w-full rounded-2xl px-4 py-3 font-semibold shadow-sm transition",
              loading
                ? "cursor-not-allowed bg-slate-200 text-slate-700"
                : "bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700"
            )}
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

