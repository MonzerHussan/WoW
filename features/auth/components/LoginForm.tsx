"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { AuthLayout } from "@/shared/components/AuthLayout";
import { FormField, Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { loginSchema } from "@/shared/schemas/auth.schema";
import { signIn } from "@/features/auth/services/auth.service";

export function LoginForm() {
  const router = useRouter();
  const { lang, setLang, dir, t } = useLang("ar");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // /auth/callback redirects here with ?auth_error=cancelled|failed when the
  // OAuth round-trip breaks (user closed Google's consent screen, bad code...).
  // Read it from window.location instead of useSearchParams so the page stays
  // statically renderable without a Suspense boundary.
  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("auth_error");
    if (!authError) return;
    setError(t(authError === "cancelled" ? "authErrors.oauthCancelled" : "authErrors.oauthFailed"));
    window.history.replaceState(null, "", window.location.pathname);
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("auth.errFields"));
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await signIn(parsed.data);
      if (signInError) {
        setError(translateAuthError(signInError, lang));
        return;
      }
      router.push("/dashboard");
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
      eyebrow={t("auth.loginEyebrow")}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <p className="text-sm text-center text-ink-soft mt-6">
          {t("auth.noAccount")}{" "}
          <a href="/signup" className="text-navy font-bold">
            {t("auth.signup")}
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
        <FormField label={t("auth.email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </FormField>

        <FormField label={t("auth.password")}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </FormField>

        <Button type="submit" disabled={loading}>
          {loading ? t("auth.submittingLogin") : t("auth.submitLogin")}
        </Button>
      </form>
    </AuthLayout>
  );
}
