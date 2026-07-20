"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO (Sprint 9): forward to an error-tracking service (e.g. Sentry)
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md text-center bg-white border border-line rounded-wow p-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="font-display font-black text-xl text-navy mb-2">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-ink-soft text-sm mb-6">
          واجهنا مشكلة أثناء تحميل هذه الصفحة. جرّب مرة أخرى.
        </p>
        <button onClick={() => reset()} className="btn-primary">
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
