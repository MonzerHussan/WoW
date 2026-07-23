"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { LangToggle } from "@/shared/components/LangToggle";
import { Button } from "@/shared/components/Button";
import { Card, ErrorState } from "@/shared/components/Feedback";
import { translateAuthError } from "@/shared/i18n/supabase-errors";
import { ACCOUNT_TYPES } from "@/shared/constants/account-types";
import { GOALS, GENDERS, PMP_LEVELS } from "@/shared/constants/onboarding";
import { onboardingCompleteSchema } from "@/shared/schemas/onboarding.schema";
import { completeOnboarding } from "@/features/onboarding/services/onboarding.service";
import { AccountType, Gender } from "@/shared/types";
import { Input, FormField } from "@/shared/components/Input";
import StepIndicator from "./StepIndicator";

const VALID_TYPES = ACCOUNT_TYPES.map((a) => a.value);

export function OnboardingWizard() {
  const router = useRouter();
  const params = useSearchParams();
  // Email signup passes ?type=…; OAuth (Google) arrives without it because
  // the provider doesn't know the account type — the wizard asks instead.
  const typeParam = params.get("type") as AccountType | null;
  const initialType = typeParam && VALID_TYPES.includes(typeParam) ? typeParam : null;

  const { lang, setLang, dir, t } = useLang("ar");

  const [accountType, setAccountType] = useState<AccountType | null>(initialType);
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [pmpLevel, setPmpLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageNum = Number(age);
  const ageValid = age.trim() !== "" && Number.isInteger(ageNum) && ageNum >= 5 && ageNum <= 120;

  async function finishOnboarding() {
    if (!accountType) return;
    const parsed = onboardingCompleteSchema.safeParse({ goal, pmpLevel, age: ageNum, gender });
    if (!parsed.success) {
      setError(t("onboarding.errAge"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await completeOnboarding(accountType, parsed.data);
      if (saveError) {
        setError(translateAuthError(saveError, lang));
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setSaving(false);
    }
  }

  const acc = accountType ? ACCOUNT_TYPES.find((a) => a.value === accountType)! : null;

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-5 py-16">
      <Card className="w-full max-w-lg shadow-xl shadow-navy/5 p-8">
        <div className="flex justify-between items-center mb-4">
          <span className="font-display font-black text-navy">WOW</span>
          <LangToggle lang={lang} onChange={setLang} />
        </div>

        <StepIndicator total={5} current={step} />

        {step === 0 && (
          <div className="flex flex-col gap-5">
            {initialType && acc ? (
              <>
                <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step1Title")}</h1>
                <div className="flex items-center gap-3 border border-navy bg-navy/5 rounded-xl px-4 py-3">
                  <span className="text-2xl">{acc.icon}</span>
                  <span className="font-bold text-navy">{lang === "ar" ? acc.ar : acc.en}</span>
                </div>
                <p className="text-sm text-ink-soft">{t("onboarding.step1Hint")}</p>
              </>
            ) : (
              <>
                <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step1ChooseTitle")}</h1>
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
                <p className="text-sm text-ink-soft">{t("onboarding.step1Hint")}</p>
              </>
            )}
            <Button disabled={!accountType} onClick={() => setStep(1)}>{t("common.next")}</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step1bTitle")}</h1>
            <p className="text-sm text-ink-soft -mt-2">{t("onboarding.step1bHint")}</p>
            <FormField label={t("onboarding.ageLabel")}>
              <Input
                type="number"
                min={5}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t("onboarding.agePlaceholder")}
              />
            </FormField>
            <FormField label={t("onboarding.genderLabel")}>
              <div className="flex flex-col gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`text-start rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      gender === g.value ? "border-navy bg-navy text-white" : "border-line text-ink-soft hover:border-navy/40"
                    }`}
                  >
                    {lang === "ar" ? g.ar : g.en}
                  </button>
                ))}
              </div>
            </FormField>
            {age.trim() !== "" && !ageValid && <ErrorState message={t("onboarding.errAge")} />}
            <div className="flex gap-3 mt-2">
              <Button variant="ghost" onClick={() => setStep(0)}>{t("common.back")}</Button>
              <Button disabled={!ageValid} onClick={() => setStep(2)}>{t("common.next")}</Button>
            </div>
          </div>
        )}

        {step === 2 && accountType && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step2Title")}</h1>
            <div className="flex flex-col gap-2">
              {GOALS[accountType].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`text-start rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    goal === g.value ? "border-navy bg-navy text-white" : "border-line text-ink-soft hover:border-navy/40"
                  }`}
                >
                  {lang === "ar" ? g.ar : g.en}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>{t("common.back")}</Button>
              <Button disabled={!goal} onClick={() => setStep(3)}>{t("common.next")}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step3Title")}</h1>
            <p className="text-sm text-ink-soft -mt-2">{t("onboarding.step3Sub")}</p>
            <div className="flex flex-col gap-2">
              {PMP_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => setPmpLevel(lvl.value)}
                  className={`text-start rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    pmpLevel === lvl.value ? "border-orange bg-orange/10 text-orange-dark" : "border-line text-ink-soft hover:border-orange/40"
                  }`}
                >
                  {lang === "ar" ? lvl.ar : lvl.en}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>{t("common.back")}</Button>
              <Button onClick={() => setStep(4)}>{t("common.next")}</Button>
            </div>
            <button
              className="text-xs text-ink-soft underline"
              onClick={() => {
                setPmpLevel(null);
                setStep(4);
              }}
            >
              {t("onboarding.notInterested")}
            </button>
          </div>
        )}

        {step === 4 && accountType && acc && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-black text-xl text-navy">{t("onboarding.step4Title")}</h1>
            <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-ink-soft">{t("onboarding.account")}</span>
                <span className="font-bold">{acc.icon} {lang === "ar" ? acc.ar : acc.en}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-ink-soft">{t("onboarding.age")}</span>
                <span className="font-bold">{age}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-ink-soft">{t("onboarding.gender")}</span>
                <span className="font-bold">
                  {gender ? (lang === "ar" ? GENDERS.find((g) => g.value === gender)?.ar : GENDERS.find((g) => g.value === gender)?.en) : t("onboarding.none")}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-ink-soft">{t("onboarding.goal")}</span>
                <span className="font-bold">
                  {goal
                    ? lang === "ar"
                      ? GOALS[accountType].find((g) => g.value === goal)?.ar
                      : GOALS[accountType].find((g) => g.value === goal)?.en
                    : t("onboarding.none")}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-ink-soft">{t("onboarding.pmp")}</span>
                <span className="font-bold">
                  {pmpLevel
                    ? lang === "ar"
                      ? PMP_LEVELS.find((l) => l.value === pmpLevel)?.ar
                      : PMP_LEVELS.find((l) => l.value === pmpLevel)?.en
                    : t("onboarding.none")}
                </span>
              </div>
            </div>
            {error && <ErrorState message={error} />}
            <Button disabled={saving} onClick={finishOnboarding}>
              {saving ? t("onboarding.finishing") : t("onboarding.finish")}
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
