# PERFORMANCE.md

## Server vs. Client Components
- `app/dashboard/page.tsx` is correctly a **Server Component** — it fetches
  the profile and badges directly on the server with no client-side
  waterfall. ✅
- `signup`, `login`, `onboarding` are Client Components out of necessity
  (interactive forms, local state, Supabase auth calls from the browser). ✅
- `NovaChat` is a Client Component, correctly isolated to just the chat
  widget rather than making its parent page a Client Component. ✅ This is
  the right pattern to keep repeating: push `"use client"` as far down the
  tree as possible.

## Current gaps
| Area | Finding | Recommendation |
|---|---|---|
| Data fetching | ~~Two sequential Supabase queries in the dashboard.~~ **Fixed in Sprint 1.5:** `DashboardView` now runs both reads via `Promise.all`. | Keep this pattern as the dashboard grows to more queries in later sprints. |
| Caching | No caching strategy anywhere — every dashboard visit re-reads Supabase. | Fine at current scale. Once `courses`/`badges` (largely static reference data) are read on more pages, consider `revalidate` on those specific queries or a short-lived cache. |
| Loading UX | ~~No `loading.tsx` for `/dashboard` or `/onboarding`.~~ **Fixed in Sprint 1.5:** both routes now render a lightweight loading state instead of a blank screen. | Extend the same pattern to new routes as they're added. |
| Bundle | No dynamic imports yet. Not a problem at 11 routes / a handful of components, but `NovaChat` (chat UI) is a good future candidate for `next/dynamic` once it grows (e.g. if a markdown renderer is added for Nova's replies). | Revisit once NovaChat's dependency list grows in Sprint 3. |
| Images | No `next/image` usage yet (no images in the UI currently). | Just a note to default to `next/image` once avatars/logos are added, rather than plain `<img>`. |
| Middleware | Middleware runs a Supabase `getUser()` call (a network round-trip) on every matched request. | Acceptable for now (4 matched path patterns). If more routes get added to the matcher, consider whether some can be checked via a cheaper JWT-decode instead of a full `getUser()` round trip. |

## Not a concern yet
Bundle size, render performance, and query complexity are all non-issues at
the current scope (roughly a dozen files, 2 real DB reads per page). This
section exists so it's tracked *before* it becomes a problem in Sprint 2+,
not because anything is currently slow.
