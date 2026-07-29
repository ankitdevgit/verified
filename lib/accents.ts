/**
 * The accent ramp, in the order the UI cycles through it.
 *
 * Categories are colour-coded by their position in the list rather than by
 * slug, so adding a category stays a config change — it picks up the next
 * accent without a code edit. Consumers set the value on a `--chip` custom
 * property, which `.chip-accent` / `.nav-accent` in globals.css read.
 */
export const ACCENTS = [
  "var(--color-acc-blue)",
  "var(--color-acc-indigo)",
  "var(--color-acc-cyan)",
  "var(--color-acc-teal)",
  "var(--color-acc-emerald)",
  "var(--color-seal)",
] as const;

export function accentFor(index: number): string {
  return ACCENTS[index % ACCENTS.length];
}
