"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { AuthLayout } from "@/shared/components/AuthLayout";
import { FormField, Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { ACCOUNT_TYPES } from "@/shared/constants/account-types";
import { signUpSchema } from "@/shared/schemas/auth.schema";
import { signUp } from "@/features/auth/services/auth.service";
import { AccountType } from "@/shared/types";

export function SignUpForm() {
  const router = useRouter();
  const { lang, setLang, dir, t } = useLang("ar");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse({ fullName, email, password, accountType });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("auth.errFields"));
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await signUp(parsed.data);
      if (signUpError) {
        setError(translateAuthError(signUpError, lang));
        return;
      }
      // With email confirmation enabled, Supabase "succeeds" for an already
      // registered email but returns a ghost user with zero identities
      // (anti-enumeration behavior) — surface it as a duplicate instead of
      // silently pushing the user into onboarding.
      if (data.user && data.user.identities?.length === 0) {
        setError(t("authErrors.userExists"));
        return;
      }
      router.push(`/onboarding?type=${accountType}`);
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
      eyebrow={t("auth.signupEyebrow")}
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <p className="text-sm text-center text-ink-soft mt-6">
          {t("auth.haveAccount")}{" "}
          <a href="/login" className="text-navy font-bold">
            {t("auth.login")}
          </a>
        </p>
      }
    >
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <GoogleButton label={t("auth.continueWithGoogle")} lang={lang} onError={setError} />

      <div className="flex items-center gap-3 my-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">{t("auth.orDivider")}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("auth.fullName")}>
          <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </FormField>

        <FormField label={t("auth.email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </FormField>

        <FormField label={t("auth.password")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </FormField>

        <FormField label={t("auth.accountType")}>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setAccountType(opt.value)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition
                  ${
                    accountType === opt.value
                      ? "border-navy bg-navy text-white"
                      : "border-line text-ink-soft hover:border-navy/40"
                  }`}
              >
                <span>{opt.icon}</span>
                <span>{lang === "ar" ? opt.ar : opt.en}</span>
              </button>
            ))}
          </div>
        </FormField>

        <Button type="submit" disabled={loading}>
          {loading ? t("auth.submittingSignup") : t("auth.submitSignup")}
        </Button>
      </form>

      <p className="text-xs text-ink-soft bg-bg rounded-lg px-3 py-2 mt-4 leading-relaxed">
        {t("auth.note")}
      </p>
    </AuthLayout>
  );
}
