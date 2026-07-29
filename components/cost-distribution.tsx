import { costBuckets } from "@/lib/cost";
import { formatNumber, formatRupees, formatRupeesShort } from "@/lib/format";
import type { Business } from "@/lib/types";

/**
 * What every verified bill at this place actually cost. One series, one hue —
 * the bar length carries the count and nothing else needs a colour. Counts are
 * labelled at the tip, so the values never depend on reading the chart.
 *
 * Built from the verified-receipt percentiles the API returns (§8.3); §6 of the
 * spec guarantees they are computed from verified receipts only, never from
 * anything the business tells us.
 */
export function CostDistribution({ business }: { business: Business }) {
  const buckets = costBuckets(business);
  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <figure>
      <figcaption className="text-sm text-ink-muted">
        What {formatNumber(business.costBasedOnReceipts)} verified bills came to
        at {business.name}
      </figcaption>

      <div className="mt-4 space-y-2.5">
        {buckets.map((b) => (
          <div
            key={b.from}
            className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3"
            title={`${b.label}: ${formatNumber(b.count)} verified ${
              b.count === 1 ? "bill" : "bills"
            }`}
          >
            <span className="ledger text-2xs text-ink-muted">{b.label}</span>
            <span className="block h-2.5">
              <span
                className="block h-full rounded-r-[4px] bg-seal"
                style={{ width: `${Math.max((b.count / max) * 100, 1.5)}%` }}
              />
            </span>
            <span className="ledger text-right text-2xs tabular-nums text-ink-muted">
              {formatNumber(b.count)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-muted">
        Median{" "}
        <span className="ledger text-ink">{formatRupees(business.costP50)}</span>{" "}
        · middle half {formatRupeesShort(business.costP25)} –{" "}
        {formatRupeesShort(business.costP75)}. Amounts come off uploaded bills,
        never from the business.
      </p>
    </figure>
  );
}
