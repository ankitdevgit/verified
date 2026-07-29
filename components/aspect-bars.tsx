import { getCategory, labelFor } from "@/lib/categories";
import type { AspectScore } from "@/lib/types";

/**
 * §9.3 — sorted by score so the worst aspect is visible without scrolling.
 * "Billing clarity 2.9" is the kind of number only a receipt-backed platform
 * can credibly publish; burying it would waste the whole premise.
 *
 * One series, one hue. The bar length already encodes the score, so the fill is
 * not also ramped by value — the emphasis on the weakest aspect is carried by
 * the sort order and a text label, not by recolouring the mark.
 */
export async function AspectBars({
  categorySlug,
  scores,
}: {
  categorySlug: string;
  scores: AspectScore[];
}) {
  // Resolved once, then every label below is a synchronous lookup.
  const category = await getCategory(categorySlug);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const weakest = sorted[sorted.length - 1];

  return (
    <dl className="space-y-3">
      {sorted.map((a) => {
        const label = labelFor(category, a.key);
        const isWeakest = a.key === weakest?.key;
        return (
          <div
            key={a.key}
            className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3"
            title={`${label}: ${a.score.toFixed(1)} out of 5`}
          >
            <dt className="truncate text-xs text-ink-muted">
              {label}
              {isWeakest && (
                <span className="ml-1.5 text-2xs text-ink-muted/80">
                  lowest
                </span>
              )}
            </dt>
            {/* Track is a lighter step of the same hue; the fill is squared at
                the baseline and rounded 4px at the data end. */}
            <dd className="h-2 rounded-r-[4px] bg-seal-tint" aria-hidden="true">
              <div
                className="h-full rounded-r-[4px] bg-seal"
                style={{ width: `${(a.score / 5) * 100}%` }}
              />
            </dd>
            <dd className="ledger text-right text-xs tabular-nums">
              {a.score.toFixed(1)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
