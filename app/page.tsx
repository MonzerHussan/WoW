import { LandingPage } from "@/features/landing/components/LandingPage";

/**
 * The public landing page — now visible to signed-in users too (second
 * navigation-restructuring round, item 4: clicking the WOW logo from
 * anywhere in the app must actually land here, not bounce back to
 * /profile). This used to redirect a logged-in visitor straight to
 * /dashboard, which would have silently defeated that click — removed.
 * A signed-in visitor now sees the same marketing page a guest does;
 * getting back into the app is the same nav bar it always was.
 */
export default function HomePage() {
  return <LandingPage />;
}
