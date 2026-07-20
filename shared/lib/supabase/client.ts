import { createBrowserClient } from "@supabase/ssr";

/**
 * Use this inside Client Components ("use client").
 * Reads the public URL/anon key from env — safe to expose to the browser.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
