"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { ErrorState } from "@/shared/components/Feedback";
import { setAgentChosenName } from "@/features/agent/services/agent.client";
import { setAgentNameSchema } from "@/shared/schemas/agent.schema";
import { translateAuthError } from "@/shared/i18n/supabase-errors";

export function AgentNamePicker({ userId, onNamed }: { userId: string; onNamed: (name: string) => void }) {
  const { lang, t } = useLang("ar");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsed = setAgentNameSchema.safeParse({ chosenName: name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t("auth.errFields"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: saveError } = await setAgentChosenName(userId, parsed.data.chosenName);
      if (saveError) {
        setError(translateAuthError(saveError, lang));
        return;
      }
      onNamed(parsed.data.chosenName);
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display font-bold text-navy text-sm">{t("agent.namingTitle")}</h3>
      <p className="text-xs text-ink-soft">{t("agent.namingSub")}</p>
      {error && <ErrorState message={error} />}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("agent.namingPlaceholder")}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <Button onClick={handleSave} disabled={loading || !name.trim()}>
        {loading ? t("agent.namingSaving") : t("agent.namingSave")}
      </Button>
    </div>
  );
}
