"use client";

import { ReactNode, useEffect, useState } from "react";
import { Lang } from "@/shared/types";
import { Card } from "./Feedback";
import { LangToggle } from "./LangToggle";
import { Logo } from "./Logo";

// Placeholder/random only, by explicit owner instruction — the real
// mechanism for picking an image by account type is a separate, later
// decision (navigation-restructuring batch, item 1). Plain CSS gradients
// rather than external image files: no asset dependency to swap out
// later, no broken-image risk, no hotlinking/CORS concern.
const PLACEHOLDER_PANELS = [
  { gradient: "linear-gradient(160deg, #1e3a5f 0%, #3d5a80 60%, #f4a261 130%)", emoji: "🎓" },
  { gradient: "linear-gradient(160deg, #2a4858 0%, #557a95 60%, #b8d8d8 130%)", emoji: "💼" },
  { gradient: "linear-gradient(160deg, #3d2c56 0%, #6f5a8f 60%, #f6ae2d 130%)", emoji: "🚀" },
  { gradient: "linear-gradient(160deg, #1b4332 0%, #40916c 60%, #d8f3dc 130%)", emoji: "🌍" },
];

/**
 * `splitImage` (login only, navigation-restructuring batch item 1):
 * half-screen form + half-screen illustration panel, the form's side
 * following `dir` automatically (plain flex row + the container's own
 * `dir` — no manual left/right branching needed, the browser flips flex
 * row order for RTL on its own). Signup keeps the original centered-card
 * layout unchanged — this is additive, not a shared behavior change.
 */
export function AuthLayout({
  dir,
  lang,
  onLangChange,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  splitImage,
}: {
  dir: "rtl" | "ltr";
  lang: Lang;
  onLangChange: (l: Lang) => void;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  splitImage?: boolean;
}) {
  // Deterministic on first render (server and client both render index 0,
  // so hydration matches exactly), randomized only after mount — picking
  // via Math.random() during render would make the server's pick and the
  // client's re-render pick disagree, a real hydration-mismatch error
  // (caught live: React logged mismatched emoji text on load).
  const [panelIndex, setPanelIndex] = useState(0);
  useEffect(() => {
    setPanelIndex(Math.floor(Math.random() * PLACEHOLDER_PANELS.length));
  }, []);
  const panel = PLACEHOLDER_PANELS[panelIndex];

  const formCard = (
    <Card className="w-full max-w-md shadow-xl shadow-navy/5 p-6 sm:p-8">
      <div className="flex justify-between items-center mb-4">
        <Logo className="h-10" />
        <LangToggle lang={lang} onChange={onLangChange} />
      </div>

      <span className="inline-block text-xs font-bold text-orange-dark bg-orange/10 rounded-full px-3 py-1 mb-3">
        {eyebrow}
      </span>

      <h1 className="font-display font-black text-2xl text-navy mb-1">{title}</h1>
      <p className="text-ink-soft text-sm mb-4">{subtitle}</p>

      {children}

      {footer}
    </Card>
  );

  if (splitImage) {
    // Fixed to the viewport (no page scroll, item 10) — the form column
    // keeps `overflow-y-auto` only as a safety net for unusually short
    // viewports, not as the expected normal case.
    return (
      <main dir={dir} className="h-screen overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 flex items-center justify-center px-5 py-4 overflow-y-auto">{formCard}</div>
        <div
          className="hidden md:flex flex-1 items-center justify-center text-6xl"
          style={{ background: panel.gradient }}
          aria-hidden="true"
        >
          {panel.emoji}
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-5 py-16">
      {formCard}
    </main>
  );
}
