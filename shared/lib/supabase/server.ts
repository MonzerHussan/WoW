import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Use this inside Server Components, Server Actions, and Route Handlers.
 * Never import this from a Client Component.
 */
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next.js only allows cookie writes from a Server Action or Route
          // Handler — a plain Server Component render (e.g. a page.tsx just
          // fetching data) throws here whenever the Supabase client tries to
          // refresh an aging session token mid-render. middleware.ts already
          // refreshes the session on every protected-route request, so this
          // failure is expected and safe to swallow (official Supabase
          // Next.js SSR guidance) rather than crashing the page.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}
