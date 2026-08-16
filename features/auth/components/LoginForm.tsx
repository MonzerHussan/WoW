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
      const { data, error: signInError } = await signIn(parsed.data);
      if (signInError) {
        setError(translateAuthError(signInError, lang));
        return;
      }

      // A password below the CURRENT policy still logs in — that is
      // deliberate on Supabase's side and must stay that way, otherwise
      // raising the policy would lock out every existing user. GoTrue
      // signals it by returning the session together with a
      // `weak_password` field; supabase-js 2.110.7 does NOT surface that
      // as an error (its conversion runs only on non-2xx responses), so
      // until now it was read by nobody and the user was never told.
      //
      // Handled as a notice, never a failure: the login succeeded, so
      // blocking the redirect here would show a failure for something
      // that worked. The user is sent on to /profile and told there.
      const weak = (data?.user as { weak_password?: unknown } | undefined)?.weak_password;
      if (weak) {
        sessionStorage.setItem("wow.weakPassword", "1");
      }

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
      eyebrow={t("auth.loginEyebrow")}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      splitImage
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

        {/* Without this link the recovery flow exists and nobody can
            reach it — the exact shape of the 074 gap (a built backend
            with no door in the UI). */}
        <a href="/forgot-password" className="text-sm text-navy font-semibold text-center">
          {t("auth.forgotLink")}
        </a>
      </form>
    </AuthLayout>
  );
}
