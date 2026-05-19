import type { ReactNode } from "react";
import Header from "./Header";

type Props = {
  children: ReactNode;
  /** Optional max width for the inner container (Tailwind class) */
  maxWidth?: "max-w-2xl" | "max-w-3xl" | "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
  /** Hide nav links / sign-out (for auth screen) */
  minimalHeader?: boolean;
};

export default function Page({
  children,
  maxWidth = "max-w-3xl",
  minimalHeader = false,
}: Props) {
  return (
    <div className="min-h-screen bg-aurora text-slate-900">
      <Header minimal={minimalHeader} />
      <main
        className={`mx-auto w-full ${maxWidth} animate-in px-4 py-8 sm:px-6 sm:py-12`}
      >
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6">
        © {new Date().getFullYear()} Travel Planner
      </footer>
    </div>
  );
}
