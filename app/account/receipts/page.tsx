import Link from "next/link";
import type { Metadata } from "next";
import { ReceiptCard } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ButtonLink, Card } from "@/components/ui";
import { getReceipts } from "@/lib/data";
import { formatRupees } from "@/lib/format";

export const metadata: Metadata = {
  title: "My receipts",
  robots: { index: false, follow: false },
};

export default async function ReceiptVaultPage() {
  const receipts = await getReceipts();
  const unused = receipts.filter((r) => r.status === "unused");
  const yearTotal = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl">My receipts</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Private. Only you see these — not the businesses, not other reviewers.
      </p>

      {receipts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Bills you upload stay here, private to you."
            body="Nothing yet."
            action={<ButtonLink href="/write">Write a review</ButtonLink>}
          />
        </div>
      ) : (
        <>
          {/* An unused receipt is the least annoying prompt there is. */}
          {unused.length > 0 && (
            <Card className="mt-6 p-5">
              <p className="text-sm font-semibold">
                {unused.length === 1
                  ? "One bill hasn't been used yet"
                  : `${unused.length} bills haven't been used yet`}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Each one is a verified review waiting to happen.
              </p>
            </Card>
          )}

          <div className="mt-6 space-y-5">
            {receipts.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                action={
                  r.status === "unused" ? (
                    <Link
                      href={
                        r.businessSlug
                          ? `/write?place=${r.businessSlug}`
                          : "/write"
                      }
                      className="text-xs text-link hover:underline"
                    >
                      Write a review
                    </Link>
                  ) : r.businessSlug && r.reviewId ? (
                    <Link
                      href={`/b/${r.businessSlug}/reviews/${r.reviewId}`}
                      className="text-xs text-link hover:underline"
                    >
                      View review
                    </Link>
                  ) : null
                }
              />
            ))}
          </div>

          <Card className="mt-8 p-5">
            <p className="text-2xs uppercase tracking-wider text-ink-muted">
              Spent via verified bills this year
            </p>
            <p className="ledger mt-1 font-display text-xl">
              {formatRupees(yearTotal)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-lift inline-flex min-h-11 items-center rounded-input border border-rule bg-surface px-4 text-sm hover:bg-sunk"
              >
                Export
              </button>
              <button
                type="button"
                className="btn-lift inline-flex min-h-11 items-center rounded-input border border-alert/40 px-4 text-sm text-alert hover:bg-alert-tint"
              >
                Delete all
              </button>
            </div>
          </Card>
        </>
      )}

      <p className="mt-8 text-xs text-ink-muted">
        Bills naming a diagnosis are sensitive health data. We destroy the raw
        image 90 days after extraction by default and keep only the extracted
        fields and the hash — you can set that to immediate in{" "}
        <Link href="/legal/privacy" className="text-link hover:underline">
          privacy settings
        </Link>
        .
      </p>
    </div>
  );
}
