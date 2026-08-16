"use client";

import { useEffect, useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";

/**
 * Non-blocking follow-up to a SUCCESSFUL login whose password is below
 * the current policy.
 *
 * Why a notice and not a login error: the sign-in genuinely succeeded —
 * Supabase returns a full session for an old weak password on purpose,
 * so that raising the policy never locks existing users out. Treating it
 * as a failure would show a red error for something that worked, and
 * (worse) leave the user logged in while telling them they aren't.
 *
 * Why it only appears now: the notice is only honest once there is
 * somewhere to act on it. Before the recovery flow existed, telling a
 * user "your password is weak" offered them nothing to do about it —
 * there was no way to change a password anywhere in the product.
 *
 * The flag is set by LoginForm in sessionStorage (not a query param, so
 * it survives the redirect without being shareable or bookmarkable) and
 * cleared on either action, so it shows once per sign-in rather than
 * nagging on every page.
 *
 * Lives in shared/ rather than features/auth/ so its host (the profile
 * screen, a different feature) can mount it without a sibling-feature
 * import — CLAUDE.md rule #1, the rule TECH_DEBT #14 already records two
 * existing violations of. It depends on nothing auth-specific: a
 * sessionStorage flag, a dictionary string and a link.
 */
const FLAG_KEY = "wow.weakPassword";

export function WeakPasswordNotice({ lang }: { lang: Lang }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShow(sessionStorage.getItem(FLAG_KEY) === "1");
  }, []);

  function dismiss() {
    sessionStorage.removeItem(FLAG_KEY);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="bg-orange/10 border border-orange/30 rounded-wow px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold text-orange-dark">{t("auth.weakPasswordNotice", lang)}</p>
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/forgot-password"
          onClick={dismiss}
          className="text-sm font-bold text-navy underline"
        >
          {t("auth.weakPasswordNoticeAction", lang)}
        </a>
        <button onClick={dismiss} className="text-xs text-ink-soft font-semibold">
          {t("auth.weakPasswordNoticeDismiss", lang)}
        </button>
      </div>
    </div>
  );
}
