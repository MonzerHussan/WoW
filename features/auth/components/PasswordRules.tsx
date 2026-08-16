"use client";

import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";

/**
 * The password policy, stated on screen BEFORE the user submits.
 *
 * The point is not decoration: Supabase enforces this server-side and
 * refuses with an English message describing the rules. Showing them up
 * front (and live-ticking them) means the common case never reaches that
 * refusal at all, and the rarer one is already understood when it does.
 *
 * Kept in sync by hand with `passwordPolicySchema` (auth.schema.ts) and
 * the dashboard setting — there is no API to read the live policy.
 */
const SYMBOL_RE = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export function PasswordRules({ value, lang }: { value: string; lang: Lang }) {
  const rules: { key: string; label: string; ok: boolean }[] = [
    { key: "length", label: t("auth.passwordRuleLength", lang), ok: value.length >= 10 },
    { key: "lower", label: t("auth.passwordRuleLower", lang), ok: /[a-z]/.test(value) },
    { key: "upper", label: t("auth.passwordRuleUpper", lang), ok: /[A-Z]/.test(value) },
    { key: "digit", label: t("auth.passwordRuleDigit", lang), ok: /[0-9]/.test(value) },
    { key: "symbol", label: t("auth.passwordRuleSymbol", lang), ok: SYMBOL_RE.test(value) },
  ];

  return (
    <div className="bg-bg rounded-lg p-3">
      <p className="text-xs font-semibold text-ink-soft mb-2">{t("auth.passwordRulesTitle", lang)}</p>
      <ul className="flex flex-col gap-1">
        {rules.map((r) => (
          <li
            key={r.key}
            className={`text-xs flex items-center gap-2 ${r.ok ? "text-navy font-semibold" : "text-ink-soft"}`}
          >
            <span aria-hidden="true">{r.ok ? "✓" : "○"}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
