import { formatNumber } from "@/lib/format";

/**
 * The star histogram the API returns on the verified bucket
 * (`ratings.verified.distribution`, §8.3). Five ordered bins, one hue — the
 * order is already carried by the axis, so the fill doesn't ramp by value.
 */
export function RatingDistribution({
  distribution,
  total,
}: {
  distribution: [number, number, number, number, number];
  total: number;
}) {
  const max = Math.max(...distribution, 1);

  return (
    <figure>
      <figcaption className="text-sm text-ink-muted">
        How {formatNumber(total)} verified reviewers rated it
      </figcaption>
      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars - 1];
          const share = total ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={stars}
              className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-3"
              title={`${stars} stars: ${formatNumber(count)} reviews (${share}%)`}
            >
              <span className="ledger text-2xs text-ink-muted">{stars} ★</span>
              <span className="block h-2.5">
                <span
                  className="block h-full rounded-r-[4px] bg-seal"
                  style={{ width: `${Math.max((count / max) * 100, 1)}%` }}
                />
              </span>
              <span className="ledger text-right text-2xs tabular-nums text-ink-muted">
                {formatNumber(count)}
                <span className="ml-1 opacity-70">{share}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
