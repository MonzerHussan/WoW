import { cookies } from "next/headers";
import { Lang } from "@/shared/types";
import { LANG_COOKIE_NAME } from "@/shared/lib/lang-cookie";

function isLang(value: unknown): value is Lang {
  return value === "ar" || value === "en";
}

/**
 * Server-side read only — this file imports `next/headers`, so only
 * Server Components (a page, or app/layout.tsx) may import it. Call
 * from a Server Component to get the caller's real persisted language
 * before the first byte is sent, eliminating the client-only-storage
 * flash `useLang()`'s own comment used to document as an accepted
 * tradeoff. Defaults to 'ar', matching the project-wide default.
 *
 * Only wired into the five highest-traffic pages so far (/dashboard,
 * /profile, /courses, /courses/[id], the lesson player) — every other
 * server page still hardcodes `lang = "ar"`, tracked explicitly as
 * TECH_DEBT #27 so the same gap doesn't reappear silently on the next
 * new page.
 */
export function getServerLang(): Lang {
  const value = cookies().get(LANG_COOKIE_NAME)?.value;
  return isLang(value) ? value : "ar";
}
