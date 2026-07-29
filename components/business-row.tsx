import Link from "next/link";
import { Seal } from "./seal";
import { PhotoBlock } from "./ui";
import { getCategory, labelFor } from "@/lib/categories";
import { costBand, formatNumber, formatRupeesShort, scoreText } from "@/lib/format";
import { hasPublishableScore, type Business } from "@/lib/types";

/**
 * §7.10 — row is photo, name, ★score + verified count, unverified score muted,
 * cost band, area, top aspect. The verified count sits in the result row rather
 * than only on the profile, so the filter is honest before you click.
 */
export async function BusinessRow({ business }: { business: Business }) {
  const category = await getCategory(business.categorySlug);
  const sorted = [...business.aspectScores].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const worst = sorted[sorted.length - 1];
  const scored = hasPublishableScore(business);

  return (
    <li className="border-b border-rule last:border-b-0">
      <Link
        href={`/b/${business.slug}`}
        className="row-lift group -mx-3 flex gap-4 rounded-card px-3 py-4 hover:bg-sunk"
      >
        <PhotoBlock
          seed={business.photoSeed}
          photo={business.photos[0]}
          sizes="96px"
          className="h-20 w-20 shrink-0 sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold group-hover:underline">
            {business.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {business.kind} · {business.area}
          </p>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {scored ? (
              <span className="flex items-baseline gap-1.5">
                <span className="font-display text-lg leading-none">
                  {scoreText(business.verifiedScore)}
                </span>
                <Seal size={15} className="stamp shrink-0 text-seal" />
                <span className="ledger text-2xs text-ink-muted">
                  {formatNumber(business.verifiedCount)} verified
                </span>
              </span>
            ) : (
              <span className="text-xs text-ink-muted">
                Not enough verified reviews yet ·{" "}
                <span className="ledger">{business.verifiedCount}</span> so far
              </span>
            )}
            <span className="ledger text-2xs text-ink-muted">
              {scoreText(business.unverifiedScore)} unverified
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-muted">
            <span
              className="ledger text-ink"
              title={`Verified bills: ${formatRupeesShort(
                business.costP25,
              )} – ${formatRupeesShort(business.costP75)} (middle half)`}
            >
              {costBand(business.costBandLevel)}
            </span>
            {top && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Best: {labelFor(category, top.key)}{" "}
                  <span className="ledger">{top.score.toFixed(1)}</span>
                </span>
              </>
            )}
            {worst && worst.key !== top?.key && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Worst: {labelFor(category, worst.key)}{" "}
                  <span className="ledger">{worst.score.toFixed(1)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
