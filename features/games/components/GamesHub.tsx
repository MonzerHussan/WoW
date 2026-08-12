"use client";

import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { GameShell } from "@/features/games/components/GameShell";
import { GameField } from "@/features/games/components/GameField";
import { GAME_DEFS, GAME_KEY_ORDER } from "@/features/games/constants";

/**
 * Games — the generic variant only (project-variant games live under
 * Projects, never duplicated here — item 3 of the navigation batch,
 * confirmed unchanged from 037-039). A permanent top-level screen, always
 * reachable.
 *
 * Owner-reversed (042, navigation-restructuring batch item 9): generic
 * games used to require a passed Level 1 final quiz (038-040's
 * `quiz_not_passed` gate) — that requirement was deliberately removed by
 * explicit owner decision, not a bug. This screen no longer receives or
 * checks an `unlocked` prop at all; play_game() (042) accepts every
 * generic-variant attempt regardless of quiz history. See 042's migration
 * header and DOMAIN_CONTRACTS.md for the full record.
 */
export function GamesHub({
  walletBalance,
  agentChosenName,
  initialLang,
}: {
  walletBalance: number;
  agentChosenName: string;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);

  return (
    <AppShell active="games" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-10 max-w-2xl mx-auto">
        <h1 className="font-display font-black text-2xl text-navy mb-1">{t("games.hubTitle")}</h1>
        <p className="text-sm text-ink-soft mb-6">{t("games.hubIntro")}</p>

        <div className="flex flex-col gap-4">
          {GAME_KEY_ORDER.map((gameKey) => {
            const def = GAME_DEFS[gameKey];
            return (
              <GameShell
                key={gameKey}
                gameKey={gameKey}
                variant="generic"
                lang={lang}
                titleKey={def.titleKey}
                descKey={def.descKey}
                badgeNameKey={def.badgeNameKey}
                renderField={({ scenarioId, submitting, onSubmit }) => (
                  <GameField
                    gameKey={gameKey}
                    variant="generic"
                    scenarioId={scenarioId}
                    lang={lang}
                    submitting={submitting}
                    onSubmit={onSubmit}
                  />
                )}
              />
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
