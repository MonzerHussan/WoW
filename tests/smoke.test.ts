import { describe, it, expect } from "vitest";
import { signUpSchema, loginSchema } from "@/shared/schemas/auth.schema";
import { pointsAwardSchema } from "@/shared/schemas/points.schema";
import { t } from "@/shared/i18n/translations";

/**
 * This is a SMOKE TEST, not a full suite (per Sprint 1.5 Task 8 — testing
 * folders/config/one example only). It exists to prove the test runner,
 * path aliases, and TypeScript config all work together correctly. Real
 * coverage (forms, API routes, RLS behavior) is Sprint 10's job.
 */
describe("testing foundation smoke test", () => {
  it("validates a correct sign-up payload", () => {
    const result = signUpSchema.safeParse({
      fullName: "Monzer Hussan",
      email: "test@example.com",
      password: "supersecret123",
      accountType: "student",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid login payload", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
  });

  it("only accepts known points reasons", () => {
    expect(pointsAwardSchema.safeParse({ reason: "LESSON_COMPLETE" }).success).toBe(true);
    expect(pointsAwardSchema.safeParse({ reason: "MADE_UP_REASON" }).success).toBe(false);
  });

  it("looks up a known translation key in both languages", () => {
    expect(t("auth.submitLogin", "ar")).toBe("تسجيل الدخول");
    expect(t("auth.submitLogin", "en")).toBe("Log in");
  });
});
