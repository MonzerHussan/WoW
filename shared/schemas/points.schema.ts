import { z } from "zod";
import { REASON_POINTS } from "@/shared/constants/points";

const REASON_KEYS = Object.keys(REASON_POINTS) as [string, ...string[]];

export const pointsAwardSchema = z.object({
  reason: z.enum(REASON_KEYS),
});
export type PointsAwardInput = z.infer<typeof pointsAwardSchema>;
