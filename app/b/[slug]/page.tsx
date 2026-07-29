import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AspectBars } from "@/components/aspect-bars";
import { CostDistribution } from "@/components/cost-distribution";
import { RatingDistribution } from "@/components/rating-distribution";
import { EmptyState } from "@/components/empty-state";
import { JsonLd } from "@/components/json-ld";
import { ReviewCard } from "@/components/review-card";
import { ScoreBlock } from "@/components/score-block";
import { Seal } from "@/components/seal";
import { ButtonLink, Card, Chip, PhotoBlock } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { getBusiness, getBusinesses, getReviews } from "@/lib/data";
import { costBand, formatNumber, formatRupeesShort } from "@/lib/format";
import { SITE } from "@/lib/site";
import { hasPublishableScore, type Business, type Review } from "@/lib/types";

export async function generateStaticParams() {
  const businesses = await getBusinesses();
  return businesses.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata(
  props: PageProps<"/b/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const business = await getBusiness(slug);
  if (!business) return {};

  const scored = hasPublishableScore(business);
  const title = scored
    ? `${business.name}, ${business.area} — ${business.verifiedScore.toFixed(1)} from ${formatNumber(business.verifiedCount)} verified bills`
    : `${business.name}, ${business.area} — verified reviews`;
  const description = `${business.name} in ${business.city}: reviews from people who uploaded their bill. Typical verified bill ${formatRupeesShort(business.costP25)}–${formatRupeesShort(business.costP75)}.`;

  return {
    title,
    description,
    alternates: { canonical: `/b/${business.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function BusinessProfilePage(
  props: PageProps<"/b/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const showAll = searchParams.tab === "all";

  const business = await getBusiness(slug);
  if (!business) notFound();

  const category = await getCategory(business.categorySlug);
  const reviews = await getReviews(slug, showAll ? "all" : "verified");
  const verifiedForMarkup = (await getReviews(slug, "verified")).filter(
    (r) => r.tier === "verified",
  );
  const scored = hasPublishableScore(business);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <JsonLd data={buildJsonLd(business, verifiedForMarkup, scored)} />

      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link
          href={`/c/${business.categorySlug}/${business.city.toLowerCase()}`}
          className="hover:underline"
        >
          {category?.plural} in {business.city}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{business.name}</span>
      </nav>

      <div className="reveal-scale-stagger mt-4 grid gap-3 sm:grid-cols-4">
        <PhotoBlock
          seed={business.photoSeed}
          className="h-44 sm:col-span-2 sm:h-56"
          label={`Photo of ${business.name}`}
        />
        <PhotoBlock seed={business.photoSeed + 3} className="hidden h-56 sm:block" />
        <PhotoBlock seed={business.photoSeed + 7} className="hidden h-56 sm:block" />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        {/* ---------------------------------------------------------------- */}
        {/* Left column — the record                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0">
          <h1 className="text-2xl">{business.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {business.kind} · {business.area}, {business.city}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {business.claimed ? (
              <Chip>Claimed by owner</Chip>
            ) : (
              <Chip>Unclaimed listing</Chip>
            )}
            {business.solicitsReviews && (
              <Chip>This business asked customers for reviews</Chip>
            )}
            {business.specialities.slice(0, 3).map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <ScoreBlock
                verifiedScore={business.verifiedScore}
                verifiedCount={business.verifiedCount}
                unverifiedScore={business.unverifiedScore}
                unverifiedCount={business.unverifiedCount}
              />
              <p className="mt-3 max-w-xs text-2xs text-ink-muted">
                The headline score counts verified reviews only.{" "}
                <Link href="/trust" className="text-link hover:underline">
                  Why
                </Link>
              </p>
            </div>

            <div>
              <p className="text-2xs uppercase tracking-wider text-ink-muted">
                Typical bill
              </p>
              <p className="ledger mt-1 text-lg">
                {formatRupeesShort(business.costP25)} –{" "}
                {formatRupeesShort(business.costP75)}
              </p>
              <p className="mt-1 text-2xs text-ink-muted">
                middle half of {formatNumber(business.costBasedOnReceipts)}{" "}
                verified bills · band{" "}
                <span className="ledger">{costBand(business.costBandLevel)}</span>
              </p>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-base font-semibold">How it scores</h2>
            <div className="mt-4">
              <AspectBars
                categorySlug={business.categorySlug}
                scores={business.aspectScores}
              />
            </div>
          </section>

          <div className="reveal-scale-stagger mt-10 grid gap-4 lg:grid-cols-2">
            {business.verifiedDistribution && business.verifiedCount > 0 && (
              <section className="rounded-card border border-rule bg-surface p-5">
                <RatingDistribution
                  distribution={business.verifiedDistribution}
                  total={business.verifiedCount}
                />
              </section>
            )}
            {business.costBasedOnReceipts > 0 && (
              <section className="rounded-card border border-rule bg-surface p-5">
                <CostDistribution business={business} />
              </section>
            )}
          </div>

          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
              <h2 className="text-base font-semibold">Reviews</h2>
              <div
                className="flex gap-1 rounded-pill border border-rule bg-surface p-1"
                role="tablist"
                aria-label="Review filter"
              >
                <Tab href={`/b/${slug}`} active={!showAll}>
                  <Seal size={14} className="stamp" />
                  Verified {formatNumber(business.verifiedCount)}
                </Tab>
                <Tab href={`/b/${slug}?tab=all`} active={showAll}>
                  All{" "}
                  {formatNumber(
                    business.verifiedCount + business.unverifiedCount,
                  )}
                </Tab>
              </div>
            </div>

            {!showAll && (
              <p className="mt-3 text-xs text-ink-muted">
                Showing reviews with a bill attached. Unverified reviews are on
                the All tab and count for nothing in the score.
              </p>
            )}

            {reviews.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No verified reviews yet."
                  body="Be the first — upload your bill and set the record."
                  action={<ButtonLink href="/write">Write a review</ButtonLink>}
                />
              </div>
            ) : (
              <div className="mt-2">
                {reviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    categorySlug={business.categorySlug}
                    href={`/b/${slug}/reviews/${r.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right rail — sticky, per §8.2                                     */}
        {/* ---------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            {business.canReview ? (
              <>
                <ButtonLink href={`/write?place=${slug}`} className="w-full">
                  <Seal size={16} filled />
                  Write a review
                </ButtonLink>
                <p className="mt-3 text-2xs text-ink-muted">
                  You&apos;ll need {category?.receipt.expects}, and a phone
                  number we can send a code to. About two minutes.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Reviews are closed on this listing while it&apos;s under review.
              </p>
            )}

            <dl className="mt-6 space-y-4 border-t border-rule pt-5 text-sm">
              <div>
                <dt className="text-2xs uppercase tracking-wider text-ink-muted">
                  Address
                </dt>
                <dd className="mt-1">
                  {business.addressLine}
                  <br />
                  {business.city} <span className="ledger">{business.pincode}</span>
                </dd>
              </div>
              {business.phone && (
                <div>
                  <dt className="text-2xs uppercase tracking-wider text-ink-muted">
                    Phone
                  </dt>
                  <dd className="ledger mt-1">
                    <a
                      href={`tel:${business.phone.replace(/\s/g, "")}`}
                      className="hover:underline"
                    >
                      {business.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-2xs uppercase tracking-wider text-ink-muted">
                  Hours
                </dt>
                <dd className="mt-1">{business.hours}</dd>
              </div>
            </dl>

            <div
              className="mt-5 h-32 rounded-image border border-rule bg-sunk"
              role="img"
              aria-label={`Map showing ${business.name} in ${business.area}, ${business.city}`}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, #E2DED4 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, #E2DED4 0 1px, transparent 1px 24px)",
              }}
            />
          </Card>

          {!business.claimed && (
            <Card className="mt-4 p-5">
              <p className="text-sm font-semibold">Is this your business?</p>
              <p className="mt-1 text-xs text-ink-muted">
                Claim the listing to reply publicly and dispute reviews with
                evidence. You can never delete or reorder them.
              </p>
              <ButtonLink
                href="/for-business#claim"
                variant="secondary"
                className="mt-4 w-full"
              >
                Claim this business
              </ButtonLink>
            </Card>
          )}

          <Card className="mt-4 p-5">
            <div className="flex items-start gap-3">
              <Seal size={22} className="stamp shrink-0 text-seal" />
              <div>
                <p className="text-sm font-semibold">
                  What the seal means here
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  A bill matched this business, this date and this amount —
                  within ±
                  {Math.round((category?.receipt.amountTolerance ?? 0) * 100)}%
                  — and the bill can only ever be used once.
                </p>
                <Link
                  href="/trust"
                  className="mt-2 inline-block text-xs text-link hover:underline"
                >
                  How verification works
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-medium transition-colors duration-[120ms] ease-[var(--ease-out-quiet)] ${
        active ? "bg-seal-tint text-seal" : "text-ink-muted hover:bg-rule/40"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * §8.2 — AggregateRating and Review markup carry *verified* reviews only.
 * Publishing the unverified average as structured data would hand Google the
 * exact number the product exists to replace. And below the §6 threshold there
 * is no aggregate at all, so none is emitted either.
 */
function buildJsonLd(
  business: Business,
  verified: Review[],
  scored: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.addressLine,
      addressLocality: business.city,
      postalCode: business.pincode,
      addressCountry: "IN",
    },
    telephone: business.phone || undefined,
    url: `${SITE.url}/b/${business.slug}`,
    priceRange: costBand(business.costBandLevel),
    review: verified.map((r) => ({
      "@type": "Review",
      "@id": `${SITE.url}/b/${business.slug}/reviews/${r.id}`,
      name: r.title,
      reviewBody: r.text,
      datePublished: r.postedDate,
      author: {
        "@type": "Person",
        name: r.authorName ?? "Anonymous verified reviewer",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.overall,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };

  if (scored) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.verifiedScore,
      reviewCount: business.verifiedCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return base;
}
