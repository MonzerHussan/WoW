/** Tiny classnames joiner — avoids pulling in clsx just for this. */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
