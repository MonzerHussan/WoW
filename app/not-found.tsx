import Link from "next/link";

export default function NotFound() {
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md text-center bg-white border border-line rounded-wow p-8">
        <div className="font-display font-black text-4xl text-navy mb-2">404</div>
        <p className="text-ink-soft text-sm mb-6">هذه الصفحة غير موجودة.</p>
        <Link href="/dashboard" className="btn-primary inline-block">
          العودة للوحة التحكم
        </Link>
      </div>
    </main>
  );
}
