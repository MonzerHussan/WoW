import { dictionary } from "./dictionary";
import { Lang } from "@/shared/types";

type DotPath<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends { ar: string; en: string }
    ? `${Prefix}${K}`
    : T[K] extends Record<string, any>
    ? DotPath<T[K], `${Prefix}${K}.`>
    : never;
}[keyof T & string];

export type TranslationKey = DotPath<typeof dictionary>;

/**
 * Look up a bilingual string by dotted key, e.g. t("auth.signupTitle", lang).
 * Falls back to the key itself if not found, so a typo fails loudly instead
 * of silently rendering blank text.
 */
export function t(key: TranslationKey, lang: Lang): string {
  const parts = key.split(".");
  let node: any = dictionary;
  for (const part of parts) {
    node = node?.[part];
  }
  if (!node || typeof node[lang] !== "string") {
    return key;
  }
  return node[lang];
}
