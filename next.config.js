/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // `microphone=(self)`, not `microphone=()`: an empty allowlist denies the
  // feature to EVERY origin including our own, which silently breaks
  // getUserMedia for the site itself. That is what shipped from Sprint 1.5
  // until now, predating PronunciationPractice (021) — so the recording
  // half of that feature could never have obtained a microphone in any
  // browser enforcing Permissions-Policy. `(self)` grants it to this origin
  // only; no third-party frame inherits it. camera/geolocation stay fully
  // denied — nothing in this codebase asks for either.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  // NOTE: a strict Content-Security-Policy is intentionally deferred to
  // Sprint 9 — it needs testing against Google Fonts + Supabase + any
  // future analytics before enforcement, otherwise it silently breaks
  // styles/auth. Tracked in SECURITY.md.
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
