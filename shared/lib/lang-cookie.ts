/**
 * Client-safe half: just the cookie name, importable from both Server
 * and Client Components. The actual server-side read (`getServerLang`)
 * lives in `lang-cookie.server.ts`, which imports `next/headers` — that
 * import alone breaks any Client Component bundle that pulls it in
 * transitively (confirmed live: bundling it into `useLang.ts`, which
 * many "use client" components import, broke every page with a
 * "next/headers ... not supported in the pages/ directory" build error).
 * Splitting the two keeps `useLang.ts` importing only this file.
 */
export const LANG_COOKIE_NAME = "wow.lang";
