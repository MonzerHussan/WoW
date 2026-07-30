"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { SELF_SERVICE_CAPABILITIES } from "@/shared/constants/capabilities";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { translateAuthError } from "@/shared/i18n/supabase-errors";

/**
 * Only ever adds — never removes an existing capability (per Sprint 3
 * scope). Writes straight to user_capabilities via the client: RLS
 * ("Own capabilities: self-service insert", 034) scopes both which row
 * (own) and which capabilities (learner/job_seeker/freelancer/client
 * only) the caller may insert — instructor/mentor/assessor require a
 * staff grant (grant_capability, /admin/roles) and are deliberately
 * excluded from this list so the button never offers an option RLS will
 * refuse. Also logs to capability_activation_log
 * (activated_via='profile_self_service') — writable by the owner as of
 * migration 010; best-effort (a log-write failure doesn't roll back or
 * block the actual capability grant above).
 */
export function ActivateCapabilityButton({ userId, activeCapabilities }: { userId: string; activeCapabilities: string[] }) {
  const router = useRouter();
  const { lang, t } = useLang("ar");
  const [open, setOpen] = useState(false);
  const [loadingValue, setLoadingValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = SELF_SERVICE_CAPABILITIES.filter((c) => !activeCapabilities.includes(c.value));

  async function activate(value: string) {
    setLoadingValue(value);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error: insertError } = await supabase
        .from("user_capabilities")
        .upsert({ user_id: userId, capability: value }, { onConflict: "user_id,capability", ignoreDuplicates: true });
      if (insertError) {
        setError(translateAuthError(insertError, lang));
        return;
      }
      await supabase
        .from("capability_activation_log")
        .insert({ user_id: userId, capability: value, activated_via: "profile_self_service" });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setLoadingValue(null);
    }
  }

  if (available.length === 0) return null;

  return (
    <div>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {t("profile.activateCapability")}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((cap) => (
            <button
              key={cap.value}
              onClick={() => activate(cap.value)}
              disabled={loadingValue !== null}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-navy/40 disabled:opacity-60"
            >
              <span>{cap.icon}</span>
              <span>{loadingValue === cap.value ? t("profile.activating") : lang === "ar" ? cap.ar : cap.en}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
