# PROJECT_STRUCTURE.md

## Status: Feature-based migration completed in Sprint 1.5

The route-based structure proposed for migration in the Sprint 1 audit has
been executed. All routes are preserved; only the code *behind* each route
moved.

```
wow-platform/
├── app/                              # routing only — thin pages
│   ├── (auth)/{signup,login}/page.tsx
│   ├── onboarding/page.tsx
│   ├── dashboard/page.tsx
│   ├── api/{nova,points/award}/route.ts
│   ├── layout.tsx, error.tsx, not-found.tsx, globals.css
│
├── features/
│   ├── auth/
│   │   ├── components/{SignUpForm,LoginForm}.tsx
│   │   └── services/auth.service.ts     # signUp(), signIn(), signOut()
│   ├── onboarding/
│   │   └── components/{OnboardingWizard,StepIndicator}.tsx
│   ├── dashboard/
│   │   └── components/{DashboardView,PointsCard,BadgesList}.tsx
│   └── nova/
│       ├── components/NovaChat.tsx
│       ├── services/nova.client.ts       # fetch('/api/nova') wrapper
│       └── prompt.ts                     # NOVA_SYSTEM_PROMPT (server-safe constant)
│
├── shared/
│   ├── components/                  # Button, Input, FormField, Card, AuthLayout,
│   │                                 # SectionTitle, Loading, EmptyState, ErrorState,
│   │                                 # LangToggle, LogoutButton
│   ├── hooks/useLang.ts             # centralizes the AR/EN toggle (was duplicated 3x)
│   ├── lib/
│   │   ├── supabase/{client,server}.ts
│   │   ├── rate-limit.ts            # in-memory limiter (Nova protection)
│   │   └── logger.ts                # structured logger + auditLog()
│   ├── services/points.service.ts   # awardPoints() — moved from lib/points.ts
│   ├── constants/{account-types,onboarding,points}.ts
│   ├── types/index.ts               # AccountType, Lang, Profile, Badge, UserBadge
│   ├── schemas/{auth,onboarding,nova,points}.schema.ts   # zod
│   └── i18n/{dictionary,translations}.ts   # single source of truth for all UI strings
│
├── supabase/
│   ├── schema.sql                   # Sprint 0 initial schema (untouched)
│   └── migrations/002_rbac_and_indexes.sql
│
├── ai/nova-system-prompt.md         # human-readable copy of the same prompt (docs only)
├── tests/smoke.test.ts              # testing foundation — see TECH_DEBT.md
├── vitest.config.ts
└── middleware.ts
```

## What changed and why

| Old location | New location | Reason |
|---|---|---|
| `lib/supabase/{client,server}.ts` | `shared/lib/supabase/*` | Infra belongs in `shared/lib`, not a generic top-level `lib/`. |
| `lib/points.ts` | `shared/services/points.service.ts` | It's a service acting on Supabase, not a bare utility; also now reads amounts from `shared/constants/points.ts` instead of a private local map. |
| `lib/nova-prompt.ts` | `features/nova/prompt.ts` | Prompt is Nova-feature-specific, not shared infra. |
| `components/nova/NovaChat.tsx` | `features/nova/components/NovaChat.tsx` | Feature-owned UI. |
| `components/onboarding/StepIndicator.tsx` | `features/onboarding/components/StepIndicator.tsx` | Feature-owned UI. |
| `components/LogoutButton.tsx` | `shared/components/LogoutButton.tsx` | Genuinely feature-agnostic (used from the dashboard, could be used anywhere). |
| 3x inline `COPY` dictionaries (signup/login/onboarding) | `shared/i18n/dictionary.ts` + `translations.ts` | Was the single most duplicated pattern in the codebase — Sprint 1's TECH_DEBT #1. |
| Inline `ACCOUNT_TYPES`/`GOALS`/`PMP_LEVELS` arrays | `shared/constants/*` | Same data was independently defined in the signup page, the dashboard, and the onboarding page. |
| Ad hoc form markup (`<input className="...">` repeated everywhere) | `shared/components/{Input,Button,FormField,AuthLayout,...}` | Sprint 1's TECH_DEBT #2. |

## Import discipline going forward
- `app/*` files should only ever import from `features/*` (page composition),
  never reach into another feature's internals directly.
- `features/*` may import from `shared/*` freely, but not from a sibling
  feature (e.g. `features/onboarding` must not import from
  `features/dashboard`) — if two features need the same thing, that thing
  belongs in `shared/`.
- `shared/*` must never import from `features/*` (one-directional dependency
  graph, prevents circular imports).
