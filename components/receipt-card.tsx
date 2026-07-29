import { formatDate, formatRupees } from "@/lib/format";
import type { Receipt } from "@/lib/types";

/**
 * §9.3 — perforated top and bottom edge, ledger type, status chip. The vault is
 * private (§7.9); nothing here is ever rendered on a public surface.
 */
export function ReceiptCard({
  receipt,
  action,
}: {
  receipt: Receipt;
  action?: React.ReactNode;
}) {
  return (
    <div className="perforated bg-surface shadow-paper">
      <div className="border-x border-rule px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {receipt.businessName}
            </p>
            <p className="ledger mt-1 text-xs text-ink-muted">
              {formatDate(receipt.date)}
            </p>
          </div>
          <p className="ledger shrink-0 text-base">
            {formatRupees(receipt.amount)}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-rule pt-3">
          <span
            className={`inline-flex items-center rounded-pill px-2 py-0.5 text-2xs font-medium ${
              receipt.status === "used"
                ? "bg-seal-tint text-seal"
                : "bg-sunk text-ink-muted"
            }`}
          >
            {receipt.status === "used" ? "Used for a review" : "Not used yet"}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}
