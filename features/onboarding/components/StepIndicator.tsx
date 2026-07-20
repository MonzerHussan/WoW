"use client";

export default function StepIndicator({
  total,
  current,
}: {
  total: number;
  current: number; // 0-indexed
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i <= current ? "bg-navy" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}
