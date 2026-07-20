# WOW — World of Work

منصة تعليمية مهنية تجمع بين **التعليم المهني + التوظيف + التطوير الوظيفي**، مع تركيز خاص على برنامج **PMP** (4 مستويات)، ومرافقة من وكيل ذكاء اصطناعي شخصي اسمه **Nova**.

## 🧱 Tech Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend / DB / Auth | Supabase (Postgres + Auth + Storage + RLS) |
| AI | OpenAI GPT-4o (Nova agent) + ElevenLabs (voice, optional) |
| Design | Navy Blue (#0B1E4D) + Orange (#F2841C), RTL (Arabic) + LTR (English) |

## 📁 Folder Structure

```
wow-platform/
├── README.md
├── package.json
├── tailwind.config.ts
├── .gitignore
├── .env.local.example
├── middleware.ts                       # Protects /dashboard + /onboarding, guards /login + /signup
├── app/
│   ├── layout.tsx                      # Root layout (lang/dir switching)
│   ├── globals.css                     # Tailwind base + design tokens
│   ├── (auth)/
│   │   ├── signup/
│   │   │   └── page.tsx                # Sign Up page (multi account-type)
│   │   └── login/
│   │       └── page.tsx                # Login page
│   ├── onboarding/
│   │   └── page.tsx                    # Onboarding Wizard (4 steps)
│   ├── api/
│   │   ├── nova/
│   │   │   └── route.ts                # Nova chat endpoint (GPT-4o)
│   │   └── points/award/
│   │       └── route.ts                # Award points / unlock badges
│   └── dashboard/
│       └── page.tsx                    # Dashboard: profile, points/level, badges, Nova chat
├── components/
│   ├── onboarding/
│   │   └── StepIndicator.tsx           # Step progress UI
│   ├── nova/
│   │   └── NovaChat.tsx                # Chat widget calling /api/nova
│   └── LogoutButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   └── server.ts                   # Server Supabase client (cookies)
│   ├── points.ts                       # Points/level/badge logic
│   └── nova-prompt.ts                  # Nova system prompt (TS constant)
├── supabase/
│   └── schema.sql                      # Full DB schema + RLS + triggers
└── ai/
    └── nova-system-prompt.md           # Nova system prompt (readable doc)
```

## 📤 Push to your GitHub repo

This project targets `https://github.com/MonzerHussan/WoW`. From inside the
`wow-platform` folder:

```bash
git init
git add .
git commit -m "WOW platform: signup, onboarding, Nova agent, points system"
git branch -M main
git remote add origin https://github.com/MonzerHussan/WoW.git
git push -u origin main
```

If the repo already has commits (e.g. a README created on GitHub), pull first:
```bash
git pull origin main --allow-unrelated-histories
```
then resolve any conflicts and push.

## 🚀 Setup

```bash
npx create-next-app@14 wow-platform --typescript --tailwind --app
cd wow-platform
npm install @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge class-variance-authority
# (optional) shadcn/ui primitives
npx shadcn-ui@latest init
```

Add environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

Run the schema in the Supabase SQL editor:
```
supabase/schema.sql
```

## 🧩 Account Types
`student` · `job_seeker` · `freelancer` · `employee` · `company`

Each type drives a different onboarding flow and a different default "goal" surfaced by Nova.

## 🎮 Gamification (already modeled in schema)
- `points` + `level` on `profiles`
- `badges` / `user_badges`
- Leaderboard view sorted by points
- `horizon_episodes` — unlockable episodes of the "Project Horizon" learning series, gated by `unlock_points`

## 🤖 Nova
See `ai/nova-system-prompt.md`. Nova is called server-side (never expose the OpenAI key client-side) — wire it behind an API route such as `app/api/nova/route.ts` (not included yet — next milestone) that forwards the system prompt + conversation history + the user's `profiles` row as context.

## 🌐 Bilingual (AR/EN)
The Sign Up and Onboarding pages accept a `lang: 'ar' | 'en'` and flip `dir` accordingly. For a production build, swap the inline dictionaries for `next-intl` or `next-i18next`.
