"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { LangToggle } from "@/shared/components/LangToggle";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";
import { Input, FormField } from "@/shared/components/Input";
import { createProjectSchema } from "@/shared/schemas/project.schema";
import { createProject } from "@/features/projects/services/project.client";
import { getPricingUnit, PRICING_KEYS } from "@/shared/services/pricing.service";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { Lang } from "@/shared/types";

/**
 * "Moment of birth" (037) — the same page/flow for a trainee's 1st, 2nd,
 * or Nth project (owner decision: no cap, coin-gated every time). Price
 * is read fresh on mount rather than passed as a server prop, matching
 * PronunciationPractice's own "coinCost === null means hide the paid
 * action, never guess" rule.
 */
export function NewProjectForm({ initialLang }: { initialLang: Lang }) {
  const router = useRouter();
  const { lang, setLang, t } = useLang(initialLang);

  const [price, setPrice] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("");
  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPricingUnit(supabaseBrowser(), PRICING_KEYS.newProject).then(setPrice);
  }, []);

  async function handleCreate() {
    const parsed = createProjectSchema.safeParse({ name, sector, country, organization });
    if (!parsed.success) {
      setError(t("projects.errNameRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createProject(parsed.data);
      if (!result.allowed) {
        if (result.reason === "insufficient_balance") setError(t("projects.errInsufficientBalance"));
        else if (result.reason === "name_required") setError(t("projects.errNameRequired"));
        else setError(t("projects.errGeneric"));
        return;
      }
      router.push(`/project/${result.projectId}?created=1`);
    } catch {
      setError(t("projects.errGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 max-w-lg mx-auto">
      <div className="flex justify-end mb-2">
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-xl text-navy mb-2">{t("projects.newProjectModalTitle")}</h1>
      {price !== null && (
        <p className="text-xs text-ink-soft mb-5">
          {t("projects.costPrefix")} {price} {t("projects.coinsUnit")}
        </p>
      )}

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <FormField label={t("projects.fieldName")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </FormField>
        <FormField label={t("projects.fieldSector")}>
          <Input value={sector} onChange={(e) => setSector(e.target.value)} maxLength={80} />
        </FormField>
        <FormField label={t("projects.fieldCountry")}>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
        </FormField>
        <FormField label={t("projects.fieldOrganization")}>
          <Input value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={120} />
        </FormField>
      </div>

      <div className="flex gap-2 mt-6">
        <Button onClick={handleCreate} disabled={submitting || !name.trim() || price === null}>
          {submitting ? t("projects.creating") : t("projects.create")}
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={submitting}>
          {t("projects.cancel")}
        </Button>
      </div>
    </Card>
  );
}
