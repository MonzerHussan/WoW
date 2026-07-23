export type AccountType =
  | "student"
  | "job_seeker"
  | "freelancer"
  | "employee"
  | "instructor"
  | "company"
  | "institute";

export type Lang = "ar" | "en";

export type AppRole = "user" | "moderator" | "admin";

export type Gender = "male" | "female" | "prefer_not_to_say";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  account_type: AccountType;
  role: AppRole;
  points: number;
  level: number;
  onboarding_completed: boolean;
  onboarding_goal: string | null;
  pmp_level_interest: number | null;
  age: number | null;
  gender: Gender | null;
}

export interface Badge {
  name: string;
  icon: string;
}

export interface UserBadge {
  earned_at: string;
  badges: Badge | null;
}
