"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { AuthLayout } from "@/shared/components/AuthLayout";
import { FormField, Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { forgotPasswordSchema } from "@/shared/schemas/auth.schema";
import { requestPasswordReset } from "@/features/auth/services/auth.service";

/**
 * Step 1 of recovery: ask for the address, send the link.
 *
 * ACCOUNT ENUMERATION IS THE WHOLE DESIGN CONSTRAINT HERE. On success we
 * show one fixed message ("if an account exists...") and we show it
 * whether or not the address is registered — Supabase's
 * resetPasswordForEmail returns success either way precisely so this
 * screen cannot be used to test which emails have accounts. So the
 * success branch deliberately ignores what came back.
 *
 * Genuine transport failures (rate limit, offline, SMTP down) ARE shown,
 * because they say nothing about whether the account exists — they say
 * the request itself didn't go through, and hiding that would leave the
 * user waiting for an email that was never sent.
 */
export function ForgotPasswordForm() {
  const { lang, setLang, dir, t } = useLang("ar");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("auth.errFields"));
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await requestPasswordReset(parsed.data.email);

      // `email_address_invalid` is deliberately folded into the success
      // message rather than shown. Measured against the live endpoint:
      // an unregistered address returns 200 whether its domain is
      // deliverable or not, but a REGISTERED address on an undeliverable
      // domain returns 400 email_address_invalid — because Supabase only
      // attempts a send when an account exists. Surfacing that 400 would
      // therefore answer "does this account exist?" for exactly the
      // addresses where the answer is yes.
      //
      // The cost is real and accepted: a user whose account sits on an
      // address that genuinely cannot receive mail is told "check your
      // inbox" and will wait for nothing. That is the narrower harm, and
      // it is a symptom of `Confirm email` being disabled (TECH_DEBT #37)
      // — an address was never proven reachable at signup — not of this
      // screen. Fixing it here would mean re-opening the enumeration
      // oracle for every account.
      if (resetError && (resetError as { code?: string }).code !== "email_address_invalid") {
        setError(translateAuthError(resetError, lang));
        return;
      }
      setSent(true);
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
      eyebrow={t("auth.forgotEyebrow")}
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      splitImage
      footer={
        <p className="text-sm text-center text-ink-soft mt-6">
          <a href="/login" className="text-navy font-bold">
            {t("auth.backToLogin")}
          </a>
        </p>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      {sent ? (
        <div className="bg-navy/5 border border-navy/20 rounded-wow p-4">
          <p className="text-sm text-ink leading-relaxed">{t("auth.forgotSent")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label={t("auth.email")}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </FormField>

          <Button type="submit" disabled={loading}>
            {loading ? t("auth.forgotSubmitting") : t("auth.forgotSubmit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
