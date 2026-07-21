import { TranslationKey } from "@/shared/i18n/translations";
import { AccountType } from "@/shared/types";

export type LandingStage = "edu" | "hire" | "promote";

export type LandingPersona = {
  id: "student" | "seeker" | "freelancer" | "employee" | "company" | "instructor" | "institute";
  /** Tab label reuses the matching ACCOUNT_TYPES entry (single source). */
  accountType: AccountType;
  titleKey: TranslationKey;
  subKey: TranslationKey;
  ctaKey: TranslationKey;
  stage: LandingStage;
};

export const LANDING_PERSONAS: LandingPersona[] = [
  {
    id: "student",
    accountType: "student",
    titleKey: "landing.personaStudentTitle",
    subKey: "landing.personaStudentSub",
    ctaKey: "landing.personaStudentCta",
    stage: "edu",
  },
  {
    id: "seeker",
    accountType: "job_seeker",
    titleKey: "landing.personaSeekerTitle",
    subKey: "landing.personaSeekerSub",
    ctaKey: "landing.personaSeekerCta",
    stage: "hire",
  },
  {
    id: "freelancer",
    accountType: "freelancer",
    titleKey: "landing.personaFreelancerTitle",
    subKey: "landing.personaFreelancerSub",
    ctaKey: "landing.personaFreelancerCta",
    stage: "hire",
  },
  {
    id: "employee",
    accountType: "employee",
    titleKey: "landing.personaEmployeeTitle",
    subKey: "landing.personaEmployeeSub",
    ctaKey: "landing.personaEmployeeCta",
    stage: "promote",
  },
  {
    id: "company",
    accountType: "company",
    titleKey: "landing.personaCompanyTitle",
    subKey: "landing.personaCompanySub",
    ctaKey: "landing.personaCompanyCta",
    stage: "edu",
  },
  {
    id: "instructor",
    accountType: "instructor",
    titleKey: "landing.personaInstructorTitle",
    subKey: "landing.personaInstructorSub",
    ctaKey: "landing.personaInstructorCta",
    stage: "edu",
  },
  {
    id: "institute",
    accountType: "institute",
    titleKey: "landing.personaInstituteTitle",
    subKey: "landing.personaInstituteSub",
    ctaKey: "landing.personaInstituteCta",
    stage: "edu",
  },
];

export const JOURNEY_CARDS: {
  stage: LandingStage;
  icon: string;
  iconBg: string;
  titleColor: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  featKeys: TranslationKey[];
}[] = [
  {
    stage: "edu",
    icon: "📘",
    iconBg: "bg-navy",
    titleColor: "text-navy",
    titleKey: "landing.eduTitle",
    descKey: "landing.eduDesc",
    featKeys: ["landing.eduF1", "landing.eduF2", "landing.eduF3"],
  },
  {
    stage: "hire",
    icon: "💼",
    iconBg: "bg-orange",
    titleColor: "text-orange-dark",
    titleKey: "landing.hireTitle",
    descKey: "landing.hireDesc",
    featKeys: ["landing.hireF1", "landing.hireF2", "landing.hireF3"],
  },
  {
    stage: "promote",
    icon: "📈",
    iconBg: "bg-purple",
    titleColor: "text-purple",
    titleKey: "landing.promoteTitle",
    descKey: "landing.promoteDesc",
    featKeys: ["landing.promoteF1", "landing.promoteF2", "landing.promoteF3"],
  },
];

export const AUDIENCE_CARDS: { tagKey: TranslationKey; descKey: TranslationKey }[] = [
  { tagKey: "landing.audStudentTag", descKey: "landing.audStudentDesc" },
  { tagKey: "landing.audSeekerTag", descKey: "landing.audSeekerDesc" },
  { tagKey: "landing.audFreelancerTag", descKey: "landing.audFreelancerDesc" },
  { tagKey: "landing.audEmployeeTag", descKey: "landing.audEmployeeDesc" },
  { tagKey: "landing.audCompanyTag", descKey: "landing.audCompanyDesc" },
];

export const LANDING_STATS: { value: string; labelKey: TranslationKey }[] = [
  { value: "+42K", labelKey: "landing.stat1" },
  { value: "+680", labelKey: "landing.stat2" },
  { value: "+9,300", labelKey: "landing.stat3" },
  { value: "+3,100", labelKey: "landing.stat4" },
];

export const COMPANY_STEPS: { titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { titleKey: "landing.comp1T", descKey: "landing.comp1D" },
  { titleKey: "landing.comp2T", descKey: "landing.comp2D" },
  { titleKey: "landing.comp3T", descKey: "landing.comp3D" },
];

export const PANEL_CANDIDATES: {
  nameKey: TranslationKey;
  infoKey: TranslationKey;
  matchKey: TranslationKey;
}[] = [
  { nameKey: "landing.cand1Name", infoKey: "landing.cand1", matchKey: "landing.match1" },
  { nameKey: "landing.cand2Name", infoKey: "landing.cand2", matchKey: "landing.match2" },
  { nameKey: "landing.cand3Name", infoKey: "landing.cand3", matchKey: "landing.match3" },
];
