"use client";

import { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("bg-white border border-line rounded-wow", className)}>{children}</div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display font-black text-navy", className)}>{children}</h2>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft py-6 justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-line border-t-navy animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ message, icon = "📭" }: { message: string; icon?: string }) {
  return (
    <div className="text-center py-8 text-ink-soft text-sm">
      <div className="text-3xl mb-2">{icon}</div>
      {message}
    </div>
  );
}

export function ErrorState({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="text-sm font-semibold text-orange-dark bg-orange/10 rounded-lg px-3 py-3 flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-bold underline whitespace-nowrap">
          {retryLabel || "Retry"}
        </button>
      )}
    </div>
  );
}
