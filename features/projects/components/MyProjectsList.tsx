"use client";

import Link from "next/link";
import { useLang } from "@/shared/hooks/useLang";
import { Card, EmptyState } from "@/shared/components/Feedback";
import { AppShell } from "@/shared/components/AppShell";
import { ProjectSummary } from "@/features/projects/services/project.service";
import { Lang } from "@/shared/types";

export function MyProjectsList({
  projects,
  initialLang,
  walletBalance,
  agentChosenName,
}: {
  projects: ProjectSummary[];
  initialLang: Lang;
  walletBalance: number;
  agentChosenName: string;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <AppShell active="projects" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-black text-2xl text-navy">{t("projects.workspaceBack")}</h1>
          <Link
            href="/project/new"
            className="rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold hover:bg-navy-soft transition"
          >
            {t("projects.newProjectCta")}
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState message={t("projects.emptyProjectsBody")} icon="📁" />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/project/${p.id}`}>
                <Card className="p-5 hover:border-navy/40 transition">
                  <p className="font-bold text-navy">{p.name}</p>
                  <p className="text-sm text-ink-soft mt-1">
                    {[p.sector, p.country, p.organization].filter(Boolean).join(" · ") || "—"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
