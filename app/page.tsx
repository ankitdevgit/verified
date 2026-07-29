import Link from "next/link";
import type { CSSProperties } from "react";
import { SearchBox } from "@/components/search-box";
import { BusinessRow } from "@/components/business-row";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Seal } from "@/components/seal";
import { Stars } from "@/components/stars";
import { VerificationBadge } from "@/components/verification-badge";
import { ButtonLink, Card, SectionHeading } from "@/components/ui";
import { accentFor } from "@/lib/accents";
import { getCategories } from "@/lib/categories";
import {
  getBusinessesByCategory,
  getTopVerifiedReviews,
  getVerifiedStats,
} from "@/lib/data";
import { formatNumber, formatRupees } from "@/lib/format";
import { SITE } from "@/lib/site";

export default async function HomePage() {
  const [stats, nearby, topReviews, categories] = await Promise.all([
    getVerifiedStats(),
    getBusinessesByCategory("hospitals", SITE.launchCity),
    getTopVerifiedReviews(3),
    getCategories(),
  ]);

  const featured = [...nearby]
    .sort((a, b) => b.verifiedCount - a.verifiedCount)
    .slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden border-b border-rule bg-surface">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          {/* Brand line above the positioning line — what we stand for, then
              what we do. The h1 stays the searchable one. */}
          <p className="font-display text-sm font-bold text-acc-blue sm:text-base">
            {SITE.brandTagline}
          </p>
          {/* Colour lands on the one word the whole product turns on. */}
          <h1 className="mt-2 max-w-2xl text-2xl leading-tight sm:text-3xl">
            Ratings backed by <span className="brand-gradient">receipts.</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">
            Every verified review here is attached to a real bill, for a real
            amount, at a real place, on a real date.
          </p>

          <div className="mt-7 max-w-3xl">
            <SearchBox />
          </div>

          {/* Each count stays glued to its label — the numbers are tabular and
              wide, so a plain inline run breaks between "1,02,884" and
              "reviews" on a phone. Stack the two stats instead. */}
          <p className="ledger mt-5 flex flex-col gap-y-1 text-sm text-ink-muted sm:flex-row sm:items-center sm:gap-x-3">
            <span>{formatNumber(stats.billsVerified)} bills verified</span>
            <span className="hidden text-rule sm:inline" aria-hidden="true">
              ·
            </span>
            <span>{formatNumber(stats.reviewsPublished)} reviews</span>
          </p>

          {/* The pitch is a contrast, so the hero is a contrast. §8.1 */}
          <div className="reveal-scale-stagger mt-12 grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
            <ContrastCard
              heading="On other sites"
              question="“Did you visit?”"
              muted
            >
              <div className="flex items-center gap-2">
                <Stars value={5} />
                <span className="text-xs text-ink-muted">Anonymous</span>
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                “Best hospital in the city!!! Highly recommend to everyone.”
              </p>
              <p className="mt-4 text-2xs text-ink-muted">
                No bill. No amount. No date. No way to check.
              </p>
            </ContrastCard>

            <ContrastCard
              heading={`On ${SITE.name}`}
              question="“Can you prove it?”"
              href="/trust"
              linkLabel="How verification works"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={3} suffix="verified bill" />
                <VerificationBadge tier="verified" size="sm" linked={false} />
              </div>
              <p className="ledger mt-3 text-sm">
                {formatRupees(42_300)} · Cardiology · 14 Mar 2026
              </p>
              <p className="mt-2 text-sm">
                “Angioplasty went smoothly, but discharge took six hours.”
              </p>
            </ContrastCard>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="reveal">
          <SectionHeading>Browse</SectionHeading>
          <ul className="reveal-stagger flex flex-wrap gap-2">
            {categories.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}/${SITE.launchCity.toLowerCase()}`}
                  style={{ "--chip": accentFor(i) } as CSSProperties}
                  className="chip-accent btn-lift inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-medium"
                >
                  {c.plural}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="reveal mt-14">
          <SectionHeading
            action={
              <Link
                href={`/c/hospitals/${SITE.launchCity.toLowerCase()}`}
                className="text-xs text-link hover:underline"
              >
                All hospitals in {SITE.launchCity}
              </Link>
            }
          >
            Most verified in {SITE.launchCity}
          </SectionHeading>
          <ul>
            {featured.map((b) => (
              <BusinessRow key={b.id} business={b} />
            ))}
          </ul>
        </section>

        {/* The proof-of-life counter — the cheapest honest trust signal there is. */}
        <section className="mt-14">
          <Card className="reveal-scale perforated border-y-0 bg-gradient-to-br from-acc-blue-tint/60 via-surface to-acc-teal-tint/60 px-6 py-8 text-center">
            <p className="text-2xs uppercase tracking-wider text-ink-muted">
              This week
            </p>
            <p className="ledger mt-2 font-display text-2xl font-bold text-seal">
              {formatNumber(stats.thisWeekInCity)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              bills verified in {stats.thisWeekCity}
            </p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeading>Most helpful this month</SectionHeading>
          <ul className="reveal-scale-stagger grid gap-4 md:grid-cols-3">
            {topReviews.map((r, i) => (
              <li key={r.id}>
                {/* The whole card is the target — see .stretch-link. The
                    group is what lets the inner link underline when the
                    cursor is anywhere on the card rather than only on the
                    words themselves. */}
                <Card
                  className="card-lift group relative flex h-full flex-col border-t-4 p-5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-link"
                  style={{ borderTopColor: accentFor(i) }}
                >
                  <div>
                    <VerificationBadge tier={r.tier} size="sm" linked={false} />
                  </div>
                  {r.billAmount !== null && (
                    <p className="ledger mt-3 text-sm">
                      {formatRupees(r.billAmount)}
                    </p>
                  )}
                  <h3 className="mt-2 text-sm font-semibold">{r.title}</h3>
                  <p className="mt-1.5 line-clamp-3 text-xs text-ink-muted">
                    {r.text}
                  </p>
                  <Link
                    href={`/b/${r.businessSlug}/reviews/${r.id}`}
                    className="stretch-link mt-4 text-xs text-link outline-none group-hover:underline"
                  >
                    Read the full review
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="reveal-scale mt-14 rounded-card border border-rule bg-gradient-to-br from-acc-blue-tint/60 via-surface to-acc-emerald-tint/60 p-8 shadow-paper sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-lg">
              <h2 className="text-xl">Got a bill from last week?</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Upload it first and the rest fills itself in — place, date and
                amount come straight off the receipt. Your bill is never shown
                publicly; only the seal is.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Seal size={40} className="stamp text-seal" />
              <ButtonLink href="/write">Write a review</ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function ContrastCard({
  heading,
  question,
  muted = false,
  href,
  linkLabel,
  children,
}: {
  heading: string;
  question: string;
  muted?: boolean;
  /** Makes the whole card a click target via the stretched link below. */
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-card border p-5 ${
        muted
          ? "border-dashed border-rule bg-sunk"
          : "border-seal/30 bg-surface shadow-paper"
      } ${
        href
          ? "card-lift group relative focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-link"
          : ""
      }`}
    >
      <p className="text-2xs uppercase tracking-wider text-ink-muted">
        {heading}
      </p>
      <p
        className={`mt-1 font-display text-lg ${muted ? "text-ink-muted" : "text-seal"}`}
      >
        {question}
      </p>
      <div className="mt-4">{children}</div>
      {href && (
        /* A named link rather than a bare wrapped card: the accessible name
           becomes "How verification works" instead of the card's entire
           contents read aloud as one run-on label. */
        <Link
          href={href}
          className="stretch-link mt-4 inline-flex items-center gap-1 text-xs font-medium text-link outline-none group-hover:underline"
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
