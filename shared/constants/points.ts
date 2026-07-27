/**
 * How many points a given server-verified event is worth.
 *
 * NO LONGER THE ENFORCEMENT POINT (migration 027). Each amount is now
 * duplicated inside the security-definer function that actually pays it
 * out, because that function is the only thing that can write
 * `profiles.points` at all — a client session is refused with 42501.
 * There is no shared source of truth across TS and SQL, so **if you
 * change a number here you must change it in the matching function too**:
 *   LESSON_COMPLETE -> award_lesson_points()   (027)
 *   QUIZ_COMPLETE   -> award_quiz_points()     (013, extended in 027)
 *
 * The four reasons below with no function next to them have **no verified
 * award path** and therefore cannot currently be paid out at all. They are
 * kept as the agreed values for when the events that earn them are built;
 * each will need its own event check, exactly like the two above.
 *
 * The original rule still stands and is now enforced in the database:
 * never accept a point amount — or a bare reason — from a client.
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
