import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ReviewCard } from "@/components/review-card";
import { Seal } from "@/components/seal";
import { ButtonLink, Card } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { getBusiness, getReview, getReviews } from "@/lib/data";
import { formatDate, formatNumber, formatRupees } from "@/lib/format";
import { SITE } from "@/lib/site";
import { TREATMENT_LEVEL_LABELS, readTreatment } from "@/lib/treatments";

export async function generateMetadata(
  props: PageProps<"/b/[slug]/reviews/[id]">,
): Promise<Metadata> {
  const { slug, id } = await props.params;
  const [business, review] = await Promise.all([getBusiness(slug), getReview(id)]);
  if (!business || !review || review.businessSlug !== slug) return {};

  return {
    title: `“${review.title}” — ${business.name}`,
    description: review.text.slice(0, 155),
    alternates: { canonical: `/b/${slug}/reviews/${id}` },
    // Only verified reviews are worth putting in the index; the rest carry no
    // weight in the score and shouldn't compete for the business's queries.
    robots:
      review.tier === "verified"
        ? { index: true, follow: true }
        : { index: false, follow: true },
  };
}

export default async function ReviewPermalinkPage(
  props: PageProps<"/b/[slug]/reviews/[id]">,
) {
  const { slug, id } = await props.params;
  const [business, review] = await Promise.all([getBusiness(slug), getReview(id)]);

  if (!business || !review || review.businessSlug !== slug) notFound();

  const category = await getCategory(business.categorySlug);

  // The three levels in full — the card summarises them into one line, and
  // this is the page where the detail belongs.
  const treatmentField = category?.fields.find((f) => f.type === "treatment");
  const treatmentLabel = treatmentField?.label ?? "Treatment";
  const treatment = treatmentField
    ? readTreatment(review.fields, treatmentField.key)
    : null;

  const others = (await getReviews(slug))
    .filter((r) => r.id !== id && r.tier === "verified")
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {review.tier === "verified" && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Review",
            name: review.title,
            reviewBody: review.text,
            datePublished: review.postedDate,
            url: `${SITE.url}/b/${slug}/reviews/${id}`,
            itemReviewed: {
              "@type": "LocalBusiness",
              name: business.name,
              address: {
                "@type": "PostalAddress",
                streetAddress: business.addressLine,
                addressLocality: business.city,
                postalCode: business.pincode,
                addressCountry: "IN",
              },
            },
            author: {
              "@type": "Person",
              name: review.authorName ?? "Anonymous verified reviewer",
            },
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.overall,
              bestRating: 5,
              worstRating: 1,
            },
          }}
        />
      )}

      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href={`/b/${slug}`} className="hover:underline">
          {business.name}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink">Review</span>
      </nav>

      <Card className="mt-4 px-6 pb-2 pt-1">
        <ReviewCard
          review={review}
          categorySlug={business.categorySlug}
          clamp={false}
        />
      </Card>

      {/* Bill metadata is the amount and the date. The image is never here. */}
      {review.billAmount !== null && (
        <Card className="mt-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Seal size={18} className="stamp text-seal" />
            What we checked
          </h2>
          <dl className="reveal-scale-stagger mt-4 grid gap-3 sm:grid-cols-3">
            <Fact label="Bill amount" value={formatRupees(review.billAmount)} />
            <Fact label="Bill date" value={formatDate(review.visitDate)} />
            <Fact
              label="Amount tolerance"
              value={`±${Math.round((category?.receipt.amountTolerance ?? 0) * 100)}%`}
            />
          </dl>
          <p className="mt-4 border-t border-rule pt-3 text-xs text-ink-muted">
            The merchant name, date and total on the uploaded bill matched{" "}
            {business.name}, and the bill&apos;s hash had never been used before.
            The bill itself stays in the reviewer&apos;s private vault —{" "}
            {business.name} has never seen it, and neither has anyone else.
          </p>
        </Card>
      )}

      {treatment && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">{treatmentLabel}</h2>
          <dl className="reveal-scale-stagger mt-4 grid gap-3 sm:grid-cols-3">
            <Fact
              label={TREATMENT_LEVEL_LABELS.category}
              value={treatment.category || "—"}
            />
            <Fact
              label={TREATMENT_LEVEL_LABELS.speciality}
              value={treatment.speciality || "—"}
            />
            <Fact
              label={TREATMENT_LEVEL_LABELS.procedure}
              value={treatment.procedure || "—"}
            />
          </dl>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`/b/${slug}`} variant="secondary">
          All {formatNumber(business.verifiedCount)} verified reviews
        </ButtonLink>
        <ButtonLink href={`/write?place=${slug}`}>Write your own</ButtonLink>
      </div>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-rule pb-2 text-base font-semibold">
            More verified reviews of {business.name}
          </h2>
          <div className="mt-2">
            {others.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                categorySlug={business.categorySlug}
                href={`/b/${slug}/reviews/${r.id}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="ledger mt-1 text-sm">{value}</dd>
    </div>
  );
}
