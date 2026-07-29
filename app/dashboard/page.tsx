import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AspectBars } from "@/components/aspect-bars";
import { Seal } from "@/components/seal";
import { VerificationBadge } from "@/components/verification-badge";
import { Button, Card } from "@/components/ui";
import { toBusiness, toReview } from "@/lib/api/adapters";
import {
  getBusinessInsights,
  getBusinessOverview,
  getBusinessReviewsForOwner,
} from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";
import { getCategory } from "@/lib/categories";
import { DASHBOARD_BUSINESS } from "@/lib/dashboard";
import { readTreatment } from "@/lib/treatments";
import { formatAge, formatNumber, formatRupees, scoreText } from "@/lib/format";
import { MIN_VERIFIED_FOR_SCORE } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardOverviewPage() {
  // §8.6 — overview, insights and the needs-reply queue are three calls, and
  // none of them can return a receipt image or reviewer PII.
  const [overview, insights, needsReplyPage] = await Promise.all([
    getBusinessOverview(DASHBOARD_BUSINESS).catch(() => null),
    getBusinessInsights(DASHBOARD_BUSINESS, "90d").catch(() => null),
    getBusinessReviewsForOwner(DASHBOARD_BUSINESS, { needs_reply: true }).catch(
      () => null,
    ),
  ]);

  if (!overview) notFound();

  const business = toBusiness(overview.business);
  const needsReply = (needsReplyPage?.data ?? []).map(toReview);

  // The speciality a complaint came from is the first thing an owner triages
  // on, so it goes in the row header — read off the treatment answer.
  const category = await getCategory(business.categorySlug);
  const treatmentKey = category?.fields.find((f) => f.type === "treatment")?.key;
  const trends = insights?.aspect_trends ?? [];
  const biggestDrop = [...trends].sort(
    (a, b) => a.to - a.from - (b.to - b.from),
  )[0];

  return (
    <div>
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-2xs uppercase tracking-wider text-ink-muted">
            Verified score
          </p>
          {business.verifiedCount >= MIN_VERIFIED_FOR_SCORE ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold">
                {scoreText(business.verifiedScore)}
              </span>
              <Seal size={18} className="stamp text-seal" />
              <Delta value={overview.deltas.verified_score} />
            </p>
          ) : (
            <p className="mt-1 text-sm">Not enough verified reviews yet</p>
          )}
          <p className="ledger mt-1 text-2xs text-ink-muted">
            {formatNumber(overview.counts.verified)} verified ·{" "}
            {formatNumber(overview.counts.new_this_week)} new this week
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-2xs uppercase tracking-wider text-ink-muted">
            Unverified score
          </p>
          <p className="mt-1 font-display text-2xl text-ink-muted">
            {scoreText(business.unverifiedScore)}
          </p>
          <p className="ledger mt-1 text-2xs text-ink-muted">
            {formatNumber(overview.counts.unverified)} reviews · not in your
            score
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-2xs uppercase tracking-wider text-ink-muted">
            Needs your reply
          </p>
          <p className="ledger mt-1 font-display text-2xl">
            {overview.counts.unanswered}
          </p>
          <p className="mt-1 text-2xs text-ink-muted">
            Replies appear publicly under the review.
          </p>
        </Card>
      </section>

      {trends.length > 0 && (
        <section className="mt-8">
          <h2 className="border-b border-rule pb-2 text-base font-semibold">
            Aspect trend, last 90 days
          </h2>
          <div className="mt-4 space-y-2">
            {trends.map((t) => {
              const delta = t.to - t.from;
              return (
                <div
                  key={t.key}
                  className="flex items-center justify-between border-b border-rule/60 py-2 text-sm"
                >
                  <span>{t.label}</span>
                  <span className="ledger flex items-center gap-2 text-xs">
                    <span className="text-ink-muted">{t.from.toFixed(1)}</span>
                    <span aria-hidden="true">→</span>
                    <span>{t.to.toFixed(1)}</span>
                    <Delta value={delta} />
                  </span>
                </div>
              );
            })}
          </div>
          {biggestDrop && biggestDrop.to < biggestDrop.from && (
            <p className="mt-3 text-xs text-ink-muted">
              Biggest drop: <strong>{biggestDrop.label}</strong>. It is also the
              aspect your verified reviewers mention most often — this is the one
              to fix.
            </p>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="border-b border-rule pb-2 text-base font-semibold">
          Where you stand today
        </h2>
        <div className="mt-4">
          <AspectBars
            categorySlug={business.categorySlug}
            scores={business.aspectScores}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="border-b border-rule pb-2 text-base font-semibold">
          Needs your reply ({needsReply.length})
        </h2>
        <div className="mt-4 space-y-4">
          {needsReply.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <VerificationBadge tier={r.tier} size="sm" linked={false} />
                {r.billAmount !== null && (
                  <span className="ledger text-xs">
                    {formatRupees(r.billAmount)}
                  </span>
                )}
                <span className="text-xs text-ink-muted">
                  {(treatmentKey && readTreatment(r.fields, treatmentKey)
                    ?.speciality) ||
                    "—"}
                </span>
                <span className="ledger text-xs text-ink-muted">
                  {r.overall}/5
                </span>
                <span className="ml-auto text-xs text-ink-muted">
                  {formatAge(r.postedDate)}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">{r.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {r.text}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="min-h-10 px-4 text-xs">Reply</Button>
                <Button variant="secondary" className="min-h-10 px-4 text-xs">
                  Dispute
                </Button>
                <Button variant="ghost" className="min-h-10 px-4 text-xs">
                  Mark resolved
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <p className="mt-8 rounded-card border border-rule bg-surface p-5 text-xs text-ink-muted">
        You never see the receipt image, the reviewer&apos;s phone number, or
        their identity when a review is posted anonymously — including on a
        dispute. A moderator checks the receipt on your behalf.{" "}
        <Link href="/trust" className="text-link hover:underline">
          How verification works
        </Link>
      </p>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  if (!value) return null;
  const down = value < 0;
  return (
    <span
      className={down ? "text-alert" : "text-seal"}
      aria-label={`${down ? "down" : "up"} ${Math.abs(value).toFixed(1)}`}
    >
      {down ? "▼" : "▲"} {Math.abs(value).toFixed(1)}
    </span>
  );
}
