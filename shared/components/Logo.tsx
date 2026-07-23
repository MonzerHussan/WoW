import Image from "next/image";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";

/**
 * Single source of the WOW brand mark (public/images/logo.png) — the
 * wordmark + tagline are baked into the asset itself, so this
 * intentionally doesn't pair with a separate translated tagline string
 * the way the old CSS-circle + text lockup did.
 */
export function Logo({ className = "h-9", href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center">
      <Image
        src="/images/logo.png"
        alt="WOW — World of Work"
        width={165}
        height={100}
        className={cn("w-auto", className)}
        priority
      />
    </Link>
  );
}
