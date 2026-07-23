# RBAC.md — WOW Complete Actors & Roles Model (Final)

Status: **APPROVED — migration 003 finalized.** Run order: 001 → 002 → 003
in the Supabase SQL editor. This document is the single source of truth;
any future role/permission change updates this file in the same PR.

## Account status (final-review addition)
`profiles.status`: `active` · `suspended` (temporary, support_lead+) ·
`banned` (admin+) · `deleted` (**soft** delete — data retained, account
inert). Real erasure happens only through the `data.hard_delete`
permission (super_admin). **Enforcement note:** middleware and RLS must
treat any non-`active` status as unauthenticated for app access — wire
this check into `middleware.ts` in the next sprint that touches auth.

## Government entities (coverage note — no new structure needed)
A government employment authority = `organization (company)` with
`hiring` + `training_consumer` capabilities. A government accreditation
body = `certification_body`. Deliberately covered by the existing model;
recorded here so it is never mistaken for a gap.

## Minors policy (required before public launch — policy, not structure)
Students may be minors. The data model is unaffected, but a minimum-age /
guardian-consent policy (and its jurisdiction requirements) MUST be
decided and implemented before real public sign-ups. Tracked as a launch
blocker in ROADMAP.md.

## تحديث حرج على سياسة القاصرين (2026-07-23)
المالك اتخذ قراراً واعياً ومؤجَّلاً عمداً: **جمع العمر الدقيق من كل
المستخدمين عند التسجيل الآن**، بلا حظر تسجيل لمن هم دون 18 سنة، وبلا
طلب موافقة ولي أمر في هذه المرحلة. هذا ليس إغلاقاً لبند "سياسة
القاصرين" أعلاه — القرار النهائي (حظر/سماح مشروط/موافقة ولي أمر) ما
زال معلّقاً ومطلوباً قبل أي إطلاق عام حقيقي.

**تحذير صريح**: العمر بيانات حساسة تُعامَل بنفس صرامة **T4** في
DOMAIN_CONTRACTS.md — لا تُعرض لأي منظمة أو صاحب عمل تحت أي ظرف، عبر
أي نطاق موافقة (`career_consents.scope`). أي كود أو تصميم مستقبلي يمرر
العمر (أو مشتقاته كالفئة العمرية) إلى واجهة أو استعلام تراه منظمة خارجية
يُعتبر خرقاً مباشراً لهذا الميثاق.

**بمجرد جمع هذا الحقل فعلياً، "مانع إطلاق القاصرين" يتحول من خطر نظري
إلى خطر تشغيلي فعلي قائم في قاعدة البيانات** — يوجد الآن حسابات حقيقية
لقاصرين محتملين بلا أي حماية إضافية مطبّقة بعد. يجب حسم هذا البند نهائياً
(الحظر أو الموافقة أو أي بديل قانوني) قبل أي توسّع Beta حقيقي يتجاوز
دائرة الاختبار المغلقة الحالية.

## The one principle
We never describe *the person* with a role — we describe *each relationship*
they have. One human can simultaneously be: a learner, a freelancer, an
instructor at an institute, and a viewer inside a company. Nothing in this
model prevents that.

## Layer 1 — Platform staff (`profiles.role` + atomic permissions)

| Role | Gets | Explicitly cannot |
|---|---|---|
| `user` | default | — |
| `support_agent` | tickets.read/respond | roles, finance, deletion |
| `support_lead` | + escalate, temp suspend, small refunds, **disputes.resolve** | roles, full finance |
| `moderator` | content.moderate | everything else |
| `accountant` | finance.read | executing payouts, editing rates |
| `finance_manager` | + approve payouts, edit rates, large refunds | user/role management |
| `tech_support` | observability, job re-runs | user content, finance, roles |
| `admin` | users.manage, content.manage, roles.assign, audit.read | financial settings, promoting super_admin |
| `super_admin` | everything + roles.assign_super, settings.financial, data.hard_delete | — |

Rules: checks are done against **permissions** (`has_permission('finance.read')`),
never role names. Only a super_admin can promote a super_admin (DB trigger
enforces it). Every staff action writes to the `audit_log` **table** (003
upgrades the stdout-only hook). Staff roles are never granted through
organization membership, and vice versa.

## Layer 2 — Individual capabilities (`user_capabilities`, many per user)

| Capability | Unlocks |
|---|---|
| `job_seeker` | applying to jobs |
| `freelancer` | offering services, taking projects |
| `client` | posting freelance projects as an individual |
| `learner` | enrolling in courses |
| `instructor` | creating courses, earning revenue |
| `mentor` | paid career-coaching sessions **+ guaranteed read access to the full published catalog (courses AND jobs) from day one**, so guidance plans reference real content and real openings |
| `assessor` | human grading / certification review |

**Assessment (decided): both automatic and human.** Every assessable unit
(quiz, PMP level exam, certification) carries an `assessment_mode`:
`auto` (system-graded, instant) · `human` (graded by an assessor /
certification_body) · `hybrid` (auto-graded first, human review required to
certify). The enum ships in migration 003 so Sprint 2's LMS tables build on
it from the start.

`instructor`, `mentor`, `assessor` each link to an `earner_profiles` row
(commission rate, payout account, verification) — one shared shape.
`profiles.account_type` is demoted to an onboarding hint that seeds initial
capabilities; it is no longer a permission source.

**Signup surface (migration 007):** the signup page also offers
`instructor` and `institute` as account-type hints. `instructor` seeds the
`instructor` capability after onboarding (earner verification comes later
via `earner_profiles`). `institute` follows the same path as `company`:
the founder signs up as an individual and is later directed to create an
`organizations` row of type `institute` (org-creation flow is a future
sprint). `workforce_partner`-style actors are NEVER a signup option —
granted administratively only (DOMAIN_CONTRACTS.md §7). Google OAuth
signups arrive with no account type; the onboarding wizard asks first and
`completeOnboarding` persists the choice + seeds capabilities.

## Layer 3 — Organizations & memberships

`organizations.type`: `company` | `institute` | `certification_body`
`organization_capabilities`: `hiring`, `freelance_hiring`,
`training_provider`, `training_consumer`, `certification`

A company that trains its own employees = `company` + `training_consumer`
(it is **not** an institute). PMP certification with human review =
`certification_body` org + individual `assessor` capability.

| org_role | Powers |
|---|---|
| `owner` | exactly one, irremovable (DB trigger), deletes/transfers org |
| `org_admin` | members, settings, billing |
| `recruiter` | post jobs/projects, contact candidates |
| `viewer` | read/filter only |
| `org_instructor` | own courses within the institute |
| `training_manager` | enroll employees, track progress |
| `member` | plain employee; visible in training reports |

## Cross-cutting rules
1. **Polymorphic ownership:** every listing (job, project, course) has
   `owner_type ('user'|'organization') + owner_id`. Individual instructors
   and institutes publish into the same tables. `enrollments.sponsor_org_id`
   (nullable) marks company-sponsored training visible to its
   `training_manager`.
2. **Guests (decided, not deferred):** unauthenticated visitors browse
   *published* catalog items only (courses, jobs, freelancer public
   profiles) via `is_published = true` anon SELECT policies. They can never
   apply, enroll, or contact.
3. **System actors:** Nova and schedulers act under `system_actors`
   identities; every automated write is auditable and never attributed to a
   human.
4. **Affiliates (decided now):** `affiliates` + `referrals` tables exist
   from day one so the commissions design never needs retrofitting.
5. **API partners (decided now):** external integrations use scoped hashed
   API keys (`api_partners`), never user roles.
6. **Disputes:** resolved by `support_lead` through the `disputes.resolve`
   permission — a permission, not a new role.

## Coverage check (every actor raised in review)
Platform: super_admin, admin, moderator, support (agent/lead), accountant,
finance manager, tech support ✅ — Employment: company layers
(owner/admin/recruiter/viewer/member), job seeker, freelancer, individual
client ✅ — Education: institute layers (owner/admin/org_instructor),
independent instructor, learner, corporate training
(training_consumer/manager/sponsored enrollment) ✅ — Plus: mentor,
assessor/certification body, guests, system actors, affiliates, API
partners, dispute handling ✅
