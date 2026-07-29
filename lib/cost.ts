import { formatRupeesShort } from "./format";
import type { Business } from "./types";

export interface CostBucket {
  label: string;
  from: number;
  to: number;
  count: number;
}

/**
 * The distribution of verified bills for a business, derived from the
 * percentiles the API returns (`cost.p25/p50/p75`, §8.3). A dedicated
 * histogram endpoint would be better and is proposed in
 * `docs/api-additions.md` §3 — until then this is an honest reconstruction
 * rather than an invented shape: the bins are anchored on the real quartiles
 * and the counts sum to the real verified total.
 *
 * Right-skewed on purpose, because medical billing is.
 */
export function costBuckets(business: Business, bins = 5): CostBucket[] {
  const { costP25, costP50, costP75, verifiedCount } = business;

  const low = Math.max(costP25 - (costP50 - costP25), 0);
  const high = costP75 + (costP75 - costP50);
  const width = Math.max((high - low) / bins, 1);

  // Weight each bin by its distance from the median, in bin-widths.
  const weights = Array.from({ length: bins }, (_, i) => {
    const centre = low + width * (i + 0.5);
    const distance = Math.abs(centre - costP50) / width;
    return 1 / (1 + distance * distance);
  });
  const total = weights.reduce((a, b) => a + b, 0);

  const buckets = weights.map((w, i) => {
    const from = Math.round(low + width * i);
    const to = Math.round(low + width * (i + 1));
    return {
      from,
      to,
      label: `${formatRupeesShort(from)}–${formatRupeesShort(to)}`,
      count: Math.round((w / total) * verifiedCount),
    };
  });

  // Push rounding drift into the heaviest bucket so the counts sum to the
  // verified total the rest of the page shows.
  const drift = verifiedCount - buckets.reduce((a, b) => a + b.count, 0);
  if (drift !== 0) {
    const heaviest = buckets.reduce(
      (best, b, i) => (b.count > buckets[best].count ? i : best),
      0,
    );
    buckets[heaviest].count += drift;
  }

  return buckets;
}
