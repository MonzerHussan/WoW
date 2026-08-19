"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { AuthLayout } from "@/shared/components/AuthLayout";
import { FormField } from "@/shared/components/Input";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { Button } from "@/shared/components/Button";
import { ErrorState, Loading } from "@/shared/components/Feedback";
import { PasswordRules } from "@/features/auth/components/PasswordRules";
import { updatePasswordSchema } from "@/shared/schemas/auth.schema";
import {
  exchangeRecoveryCode,
  getCurrentSession,
  updatePassword,
} from "@/features/auth/services/auth.service";

type LinkState = "checking" | "ready" | "invalid";

/**
 * Step 2 of recovery: the page the emailed link lands on.
 *
 * The link must be turned into a real session BEFORE the form is usable —
 * `updateUser({password})` needs an authenticated user, and without the
 * exchange there isn't one. Doing it on mount (rather than at submit
 * time) is what lets a consumed/expired link say so immediately instead
 * of after the user has typed a new password twice.
 *
 * Two arrival shapes are handled because both exist in the wild:
 *   - `?code=...`  — PKCE, what @supabase/ssr's browser client issues.
 *   - already-established session — the implicit/hash flow, where
 *     supabase-js consumed the fragment during its own initialisation
 *     before this effect ran. Insisting on a `?code=` would break that
 *     case for no reason.
 *
 * This page is deliberately NOT in middleware's AUTH_PATHS: the recovery
 * exchange logs the user in, and AUTH_PATHS bounces logged-in users to
 * /profile — which would make the link unusable for exactly the people
 * it is for.
 */
export function UpdatePasswordForm() {
  const router = useRouter();
  const { lang, setLang, dir, t } = useLang("ar");

  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function establish() {
      const params = new URLSearchParams(window.location.search);

      // Supabase can bounce back with its own failure (expired/used link)
      // instead of a code — surface it as "bad link", not a blank form.
      if (params.get("error") || params.get("error_code")) {
        if (!cancelled) setLinkState("invalid");
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await exchangeRecoveryCode(code);
        if (cancelled) return;
        if (exchangeError) {
          console.error("[auth] recovery code exchange failed:", exchangeError);
          setLinkState("invalid");
          return;
        }
        // Strip the code so a refresh doesn't retry an already-consumed one.
        window.history.replaceState(null, "", window.location.pathname);
        setLinkState("ready");
        return;
      }

      const session = await getCurrentSession();
      if (cancelled) return;
      setLinkState(session ? "ready" : "invalid");
    }

    establish();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("auth.errFields"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await updatePassword(parsed.data.password);
      if (updateError) {
        // Includes the server's own weak_password refusal — translated,
        // never shown as the raw English policy string.
        setError(translateAuthError(updateError, lang));
        return;
      }
      setDone(true);
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      dir={dir}
      lang={lang}
      onLangChange={setLang}
      eyebrow={t("auth.updatePwEyebrow")}
      title={t("auth.updatePwTitle")}
      subtitle={t("auth.updatePwSubtitle")}
      splitImage
      footer={
        <p className="text-sm text-center text-ink-soft mt-6">
          <a href="/login" className="text-navy font-bold">
            {t("auth.backToLogin")}
          </a>
        </p>
      }
    >
      {linkState === "checking" && <Loading label={t("auth.updatePwVerifying")} />}

      {linkState === "invalid" && (
        <div className="flex flex-col gap-3">
          <ErrorState message={t("auth.updatePwBadLink")} />
          <a href="/forgot-password" className="text-navy font-bold text-sm text-center">
            {t("auth.requestNewLink")}
          </a>
        </div>
      )}

      {linkState === "ready" && (
        <>
          {error && (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          )}

          {done ? (
            <p className="text-sm font-semibold text-navy">{t("auth.updatePwDone")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FormField label={t("auth.newPassword")}>
                <PasswordInput
                  lang={lang}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </FormField>

              <PasswordRules value={password} lang={lang} />

              <FormField label={t("auth.confirmPassword")}>
                <PasswordInput
                  lang={lang}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </FormField>

              <Button type="submit" disabled={loading}>
                {loading ? t("auth.updatePwSubmitting") : t("auth.updatePwSubmit")}
              </Button>
            </form>
          )}
        </>
      )}
    </AuthLayout>
  );
}
