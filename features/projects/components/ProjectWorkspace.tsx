"use client";

import { useState, ReactElement, cloneElement, isValidElement } from "react";
import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { AppShell } from "@/shared/components/AppShell";
import { Card } from "@/shared/components/Feedback";
import { ProjectDetail, ProjectCharter, DecisionLogEntry } from "@/features/projects/services/project.service";
import { BusinessCaseForm } from "@/features/projects/components/BusinessCaseForm";
import { CharterWizard } from "@/features/projects/components/CharterWizard";
import { DecisionLogPanel } from "@/features/projects/components/DecisionLogPanel";
import { TopRisksWidget } from "@/features/projects/components/TopRisksWidget";
import { Lang } from "@/shared/types";

type Tab = "overview" | "businessCase" | "charter" | "decisionLog" | "games";

/**
 * The workspace a project's five moving parts share (037 + 038): the
 * mini business case and charter are covered here directly — the
 * charter wizard IS the Charter Builder game's project variant, not a
 * placeholder for it (TASK_level1_living_project.md §1c).
 *
 * `gamesSlot` (features/games' <ProjectGamesPanel>) is built once at the
 * page level (app/project/[id]/page.tsx) and its `lang` overridden live
 * via cloneElement — same pattern ProfileView already uses for
 * `placementSlot` (features/agent), and for the same two reasons: a
 * Server Component cannot pass a plain function to a Client Component
 * prop (Next.js rejects it at runtime), and features/projects must not
 * import a sibling feature (PROJECT_STRUCTURE.md). cloneElement keeps
 * the same component instance across re-renders (its own internal game
 * state survives a language toggle) while still tracking this
 * workspace's one shared `lang`.
 */
export function ProjectWorkspace({
  project,
  charter,
  decisionLog,
  readinessPercent,
  initialLang,
  celebrate,
  gamesSlot,
  walletBalance,
  agentChosenName,
}: {
  project: ProjectDetail;
  charter: ProjectCharter;
  decisionLog: DecisionLogEntry[];
  readinessPercent: number;
  initialLang: Lang;
  celebrate: boolean;
  gamesSlot?: ReactElement<{ lang: Lang }>;
  walletBalance: number;
  agentChosenName: string;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const [tab, setTab] = useState<Tab>("overview");
  const [currentCharter, setCurrentCharter] = useState(charter);
  const [currentDecisionLog, setCurrentDecisionLog] = useState(decisionLog);
  const [currentReadiness, setCurrentReadiness] = useState(readinessPercent);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("projects.tabOverview") },
    { key: "businessCase", label: t("projects.tabBusinessCase") },
    { key: "charter", label: t("projects.tabCharter") },
    { key: "decisionLog", label: t("projects.tabDecisionLog") },
    { key: "games", label: t("projects.tabGames") },
  ];

  return (
    <AppShell active="projects" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
    <main className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
      <Link href="/project" className="text-sm text-ink-soft hover:text-navy mb-4 inline-block">
        ← {t("projects.workspaceBack")}
      </Link>

      {celebrate && (
        <Card className="p-4 mb-4 bg-orange/10 border-orange/30">
          <p className="text-sm font-bold text-navy">{t("projects.createdCelebration")}</p>
        </Card>
      )}

      <h1 className="font-display font-black text-2xl text-navy mb-1">{project.name}</h1>
      <p className="text-sm text-ink-soft mb-5">
        {[project.sector, project.country, project.organization].filter(Boolean).join(" · ") || "—"}
      </p>

      <Card className="p-4 mb-6 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">{t("projects.readinessLabel")}</span>
        <div className="flex items-center gap-2 flex-1 mx-4 max-w-[200px]">
          <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-navy transition-all" style={{ width: `${currentReadiness}%` }} />
          </div>
          <span className="text-xs font-bold text-navy tabular-nums">{currentReadiness}%</span>
        </div>
      </Card>

      <div className="flex gap-1 mb-6 border-b border-line overflow-x-auto">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition ${
              tab === tb.key ? "border-navy text-navy" : "border-transparent text-ink-soft hover:text-navy"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-soft leading-relaxed">{project.value_statement || "—"}</p>
          <TopRisksWidget projectId={project.id} lang={lang} />
        </div>
      )}

      {tab === "businessCase" && <BusinessCaseForm project={project} lang={lang} />}

      {tab === "charter" && (
        <CharterWizard
          projectId={project.id}
          charter={currentCharter}
          lang={lang}
          onApproved={(approvedAt) => {
            setCurrentCharter((c) => ({ ...c, is_approved: true, approved_at: approvedAt }));
            // The DB trigger (037's log_charter_approval) writes the real
            // decision_log row; this is only a client-side reflection so
            // the tab shows it immediately without a refetch.
            setCurrentDecisionLog((log) => [
              {
                id: `local-${Date.now()}`,
                situation: "charter_approved",
                decision: "charter_approved",
                reason: "charter_approved",
                category: "milestone",
                created_at: approvedAt,
              },
              ...log,
            ]);
            setCurrentReadiness((r) => Math.min(100, r + 30));
          }}
        />
      )}

      {tab === "decisionLog" && (
        <DecisionLogPanel
          projectId={project.id}
          entries={currentDecisionLog}
          lang={lang}
          onAdded={(entry) => {
            setCurrentDecisionLog((log) => [entry, ...log]);
            setCurrentReadiness((r) => (currentDecisionLog.length + 1 >= 5 ? Math.min(100, r) : r));
          }}
        />
      )}

      {tab === "games" && gamesSlot && isValidElement(gamesSlot) && cloneElement(gamesSlot, { lang })}
    </main>
    </AppShell>
  );
}
