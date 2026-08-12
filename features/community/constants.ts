import { TranslationKey } from "@/shared/i18n/translations";

/**
 * Phase-1 visual mockup ONLY (owner instruction, navigation-restructuring
 * batch item 7): static content for a Facebook/LinkedIn-style Community
 * page. No table backs any of this — see CommunityContent.tsx.
 */
export const COMMUNITY_SHORTCUTS: { key: string; labelKey: TranslationKey; icon: string }[] = [
  { key: "network", labelKey: "community.shortcutNetwork", icon: "👥" },
  { key: "groups", labelKey: "community.shortcutGroups", icon: "🧩" },
  { key: "saved", labelKey: "community.shortcutSaved", icon: "🔖" },
  { key: "events", labelKey: "community.shortcutEvents", icon: "📅" },
];

export const COMMUNITY_POSTS: {
  id: string;
  authorKey: TranslationKey;
  roleKey: TranslationKey;
  timeKey: TranslationKey;
  tagKey: TranslationKey;
  bodyKey: TranslationKey;
  likes: number;
  comments: number;
}[] = [
  {
    id: "post1",
    authorKey: "community.post1Author",
    roleKey: "community.post1Role",
    timeKey: "community.post1Time",
    tagKey: "community.post1Tag",
    bodyKey: "community.post1Body",
    likes: 128,
    comments: 24,
  },
  {
    id: "post2",
    authorKey: "community.post2Author",
    roleKey: "community.post2Role",
    timeKey: "community.post2Time",
    tagKey: "community.post2Tag",
    bodyKey: "community.post2Body",
    likes: 46,
    comments: 31,
  },
  {
    id: "post3",
    authorKey: "community.post3Author",
    roleKey: "community.post3Role",
    timeKey: "community.post3Time",
    tagKey: "community.post3Tag",
    bodyKey: "community.post3Body",
    likes: 203,
    comments: 18,
  },
  {
    id: "post4",
    authorKey: "community.post4Author",
    roleKey: "community.post4Role",
    timeKey: "community.post4Time",
    tagKey: "community.post4Tag",
    bodyKey: "community.post4Body",
    likes: 97,
    comments: 12,
  },
];

export const COMMUNITY_CONNECTIONS: { id: string; nameKey: TranslationKey; fieldKey: TranslationKey }[] = [
  { id: "conn1", nameKey: "community.conn1Name", fieldKey: "community.conn1Field" },
  { id: "conn2", nameKey: "community.conn2Name", fieldKey: "community.conn2Field" },
  { id: "conn3", nameKey: "community.conn3Name", fieldKey: "community.conn3Field" },
  { id: "conn4", nameKey: "community.conn4Name", fieldKey: "community.conn4Field" },
];

export const COMMUNITY_TRENDING: TranslationKey[] = [
  "community.trend1",
  "community.trend2",
  "community.trend3",
  "community.trend4",
];

export const COMMUNITY_GROUPS: { id: string; nameKey: TranslationKey; members: number }[] = [
  { id: "group1", nameKey: "community.group1Name", members: 1840 },
  { id: "group2", nameKey: "community.group2Name", members: 612 },
  { id: "group3", nameKey: "community.group3Name", members: 2305 },
];
