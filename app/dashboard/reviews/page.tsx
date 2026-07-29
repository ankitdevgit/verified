import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VerificationBadge } from "@/components/verification-badge";
import { Stars } from "@/components/stars";
import { Button, Card } from "@/components/ui";
import { toBusiness, toReview } from "@/lib/api/adapters";
import { getBusinessReviewsForOwner, getBusiness as apiGetBusiness } from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";
import { DASHBOARD_BUSINESS } from "@/lib/dashboard";
import { formatAge, formatNumber, formatRupees } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reviews · Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardReviewsPage() {
  const [dto, page] = await Promise.all([
    apiGetBusiness(DASHBOARD_BUSINESS).catch(() => null),
    getBusinessReviewsForOwner(DASHBOARD_BUSINESS).catch(() => null),
  ]);
  if (!dto) notFound();

  const business = toBusiness(dto);
  const reviews = (page?.data ?? []).map(toReview);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
        <h2 className="text-base font-semibold">
          All reviews ({formatNumber(reviews.length)})
        </h2>
        <p className="text-xs text-ink-muted">
          Sorted newest first. You can reply to any of them; you can&apos;t
          reorder or remove them.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {reviews.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <VerificationBadge tier={r.tier} size="sm" linked={false} />
              {r.billAmount !== null && (
                <span className="ledger text-xs">
                  {formatRupees(r.billAmount)}
                </span>
              )}
              <Stars value={r.overall} size={14} />
              <span className="ml-auto text-xs text-ink-muted">
                {formatAge(r.postedDate)}
              </span>
            </div>

            <p className="mt-3 text-sm font-medium">{r.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{r.text}</p>

            <p className="mt-3 text-2xs text-ink-muted">
              {r.authorName ? (
                <>
                  {r.authorName} · Level {r.authorLevel}
                </>
              ) : (
                "Posted anonymously — you cannot see who wrote this, and neither can we show you."
              )}
            </p>

            {r.reply ? (
              <div className="mt-4 border-l-2 border-seal pl-4">
                <p className="text-xs font-medium text-seal">
                  Your reply · {formatAge(r.reply.date)}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{r.reply.text}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-link hover:underline"
                >
                  Edit reply
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="min-h-10 px-4 text-xs">Reply publicly</Button>
                <Button variant="secondary" className="min-h-10 px-4 text-xs">
                  Dispute with evidence
                </Button>
                <Link
                  href={`/b/${business.slug}/reviews/${r.id}`}
                  className="inline-flex min-h-10 items-center px-3 text-xs text-link hover:underline"
                >
                  View public page
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-8 rounded-card border border-rule bg-surface p-5 text-xs text-ink-muted">
        Disputes are handled over email while the console is being built — write
        to <span className="ledger">{SITE.grievanceEmail}</span> with the review
        URL and your evidence, and a moderator picks it up. The review is
        labelled and frozen in your score while they work.
      </p>
    </div>
  );
}
