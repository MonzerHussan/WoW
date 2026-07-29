import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { REASON_POINTS } from "@/shared/constants/points";
import { PRICING_KEYS } from "@/shared/services/pricing.service";
import { resolveLanguageTask, clip } from "@/features/lms/services/lesson.service";
import { selectNewBadges, BadgeCandidate } from "@/shared/services/points.service";

const MIGRATIONS = path.resolve(__dirname, "../supabase/migrations");

describe("resolveLanguageTask — which price a lesson is charged at", () => {
  it("maps the 023 root shape to the standard writing price", () => {
    const r = resolveLanguageTask({ language_task: { prompt: "Write 80 words." } });
    expect(r?.source).toBe("language_task");
    expect(r?.pricingKey).toBe(PRICING_KEYS.languageTaskWriting);
    expect(r?.taskText).toBe("Write 80 words.");
  });

  it("maps the original 009 shape to the module-closing price", () => {
    const r = resolveLanguageTask({ module_closing: { optional_language_task: "Wrap up." } });
    expect(r?.source).toBe("module_closing");
    expect(r?.pricingKey).toBe(PRICING_KEYS.languageTaskModuleClosing);
  });

  it("lets the root shape win when both are present, rather than leaving it to chance", () => {
    const r = resolveLanguageTask({
      language_task: { prompt: "root" },
      module_closing: { optional_language_task: "closing" },
    });
    expect(r?.source).toBe("language_task");
    expect(r?.taskText).toBe("root");
  });

  it("returns null when a lesson has no task at all", () => {
    expect(resolveLanguageTask({})).toBeNull();
    expect(resolveLanguageTask(null)).toBeNull();
    expect(resolveLanguageTask(undefined)).toBeNull();
    expect(resolveLanguageTask({ module_closing: { series_episode: "S1" } })).toBeNull();
  });

  /**
   * The point of migration 024. Before it, the number sitting in the
   * lesson jsonb decided what a learner was charged. It is still in the
   * data and must now decide nothing — if this ever regresses, an admin's
   * price change silently stops applying to old lessons.
   */
  it("ignores coin_cost embedded in the content entirely", () => {
    const r = resolveLanguageTask({ language_task: { prompt: "x", coin_cost: 999 } });
    expect(r).not.toBeNull();
    expect(JSON.stringify(r)).not.toContain("999");
    expect(r && "coinCost" in r).toBe(false);
  });

  it("still recognises a task whose content carries no coin_cost at all", () => {
    // Presence of a price is no longer part of "is there a task here?".
    expect(resolveLanguageTask({ module_closing: { optional_language_task: "t" } })).not.toBeNull();
  });
});

describe("clip — the lesson-context truncation caps (TECH_DEBT #19)", () => {
  it("leaves text at or under the cap untouched and unflagged", () => {
    expect(clip("short", 10)).toEqual({ value: "short", clipped: false });
    expect(clip("x".repeat(10), 10)).toEqual({ value: "x".repeat(10), clipped: false });
  });

  it("truncates past the cap and reports it", () => {
    const r = clip("x".repeat(11), 10);
    expect(r.clipped).toBe(true);
    expect(r.value).toBe("x".repeat(10) + "…");
  });

  it("treats empty and nullish input as absent, not as an empty string", () => {
    expect(clip(null, 10)).toEqual({ value: null, clipped: false });
    expect(clip(undefined, 10)).toEqual({ value: null, clipped: false });
    expect(clip("", 10)).toEqual({ value: null, clipped: false });
  });

  it("measures length after trimming, so padding does not trigger truncation", () => {
    expect(clip("   abc   ", 3)).toEqual({ value: "abc", clipped: false });
  });
});

describe("selectNewBadges", () => {
  const badges: BadgeCandidate[] = [
    { id: "a", name: "First steps", points_value: 10 },
    { id: "b", name: "Getting going", points_value: 50 },
    { id: "c", name: "Committed", points_value: 100 },
  ];

  it("awards every unearned badge at or below the current total", () => {
    expect(selectNewBadges(badges, new Set(), 50).map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("treats the threshold as inclusive", () => {
    expect(selectNewBadges(badges, new Set(), 10).map((b) => b.id)).toEqual(["a"]);
    expect(selectNewBadges(badges, new Set(), 9)).toEqual([]);
  });

  it("never re-awards a badge the user already holds", () => {
    expect(selectNewBadges(badges, new Set(["a"]), 50).map((b) => b.id)).toEqual(["b"]);
    expect(selectNewBadges(badges, new Set(["a", "b"]), 50)).toEqual([]);
  });

  /**
   * This is the behaviour that replaced the old before/after delta window:
   * a badge missed earlier (failed insert, badge added after the fact) is
   * picked up on the next award instead of being lost forever.
   */
  it("self-heals a badge that was missed at the time it was crossed", () => {
    expect(selectNewBadges(badges, new Set(["b"]), 100).map((b) => b.id)).toEqual(["a", "c"]);
  });
});

describe("REASON_POINTS", () => {
  it("holds only positive integers", () => {
    for (const [reason, amount] of Object.entries(REASON_POINTS)) {
      expect(Number.isInteger(amount), `${reason} must be an integer`).toBe(true);
      expect(amount, `${reason} must be positive`).toBeGreaterThan(0);
    }
  });

  /**
   * THE HAND-SYNC HAZARD, MADE AUTOMATIC.
   *
   * Migration 027 duplicates these amounts as SQL constants inside the
   * award functions, because the database is the only thing allowed to
   * write profiles.points and it cannot import TypeScript. Both 013 and
   * 027 say in a comment "keep the two in sync by hand if it ever
   * changes" — which is exactly the kind of instruction that gets missed.
   *
   * This reads the migration and compares. If someone edits one side and
   * not the other, CI fails instead of learners being paid the wrong
   * amount silently.
   */
  it("matches the constants hardcoded in migration 027's award functions", () => {
    const sql = fs.readFileSync(path.join(MIGRATIONS, "027_points_award_hardening.sql"), "utf8");

    const amounts = [...sql.matchAll(/v_points_amount\s+constant\s+int\s*:=\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(amounts.length, "expected both award functions to declare an amount").toBe(2);

    // award_lesson_points is declared first in the file, award_quiz_points second.
    const [lessonAmount, quizAmount] = amounts;
    expect(lessonAmount).toBe(REASON_POINTS.LESSON_COMPLETE);
    expect(quizAmount).toBe(REASON_POINTS.QUIZ_COMPLETE);
  });
});

describe("migration hygiene", () => {
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"));

  it("never leaves two migrations claiming the same identifier", () => {
    // A letter suffix is an intentional split of one logical migration
    // that had to run in separate transactions (007/007b, 015a-d), so the
    // identifier is number+suffix, not the number alone. A true collision
    // is two files claiming the exact same token.
    const ids = files.map((f) => (f.match(/^(\d{3}[a-z]?)/) || [])[1]).filter(Boolean);
    expect(ids.length, "every migration filename must start with a 3-digit number").toBe(files.length);
    const dupes = ids.filter((n, i) => ids.indexOf(n) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  /**
   * The answer key was moved out of the question jsonb in 028. If a future
   * migration or seed puts it back, the cheat that scored 100% works
   * again — and it would not show up in any UI.
   */
  it("has no migration after 028 reintroducing correct_index into question jsonb", () => {
    const offenders = files
      .filter((f) => Number(f.slice(0, 3)) > 28)
      .filter((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8").includes("'correct_index'"));
    expect(offenders).toEqual([]);
  });
});
