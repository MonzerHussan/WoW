"use client";

import { ReactNode } from "react";
import { Lang } from "@/shared/types";
import { Card } from "./Feedback";
import { LangToggle } from "./LangToggle";

export function AuthLayout({
  dir,
  lang,
  onLangChange,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  dir: "rtl" | "ltr";
  lang: Lang;
  onLangChange: (l: Lang) => void;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-5 py-16">
      <Card className="w-full max-w-md shadow-xl shadow-navy/5 p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="inline-block text-xs font-bold text-orange-dark bg-orange/10 rounded-full px-3 py-1">
            {eyebrow}
          </span>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>

        <h1 className="font-display font-black text-2xl text-navy mb-1">{title}</h1>
        <p className="text-ink-soft text-sm mb-6">{subtitle}</p>

        {children}

        {footer}
      </Card>
    </main>
  );
}
