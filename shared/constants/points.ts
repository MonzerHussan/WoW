/**
 * Single source of truth for how many points a given server-verified event
 * is worth. NEVER accept a point amount from a client request — only ever
 * look it up here by a known `reason` key. See SECURITY.md for why.
 */
export const REASON_POINTS = {
  LESSON_COMPLETE: 10,
  QUIZ_COMPLETE: 20,
  COURSE_COMPLETE: 50,
  PMP_LEVEL_COMPLETE: 100,
  FIRST_JOB_APPLICATION: 15,
  PROFILE_COMPLETED: 10,
} as const;

export type PointsReason = keyof typeof REASON_POINTS;
