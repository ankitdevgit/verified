import Link from "next/link";
import type { Metadata } from "next";
import { WriteFlow } from "@/components/write/write-flow";
import { Seal } from "@/components/seal";
import { getCategories } from "@/lib/categories";
import { getBusinesses } from "@/lib/data";
import { getTreatmentTaxonomy } from "@/lib/treatments";

export const metadata: Metadata = {
  title: "Write a review",
  description:
    "Upload your bill first — the place, date and amount come straight off it. Your receipt stays private; only the seal is public.",
  robots: { index: true, follow: true },
};

export default async function WritePage(props: PageProps<"/write">) {
  const params = await props.searchParams;
  const place = typeof params.place === "string" ? params.place : undefined;
  const [businesses, categories, treatments] = await Promise.all([
    getBusinesses(),
    getCategories(),
    getTreatmentTaxonomy(),
  ]);

  // max-w-6xl matches every other page's container. The prose below keeps its
  // own narrower cap — a 1,100px line of body copy is unreadable no matter how
  // much room the viewport has.
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl">Write a review</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        First we check your number — one person, one voice. Then the bill: we
        read it, redact it, and use it to fill in the place, date and amount, so
        you only have to write the part that matters.
      </p>

      {/* The rules move alongside the form on desktop rather than sitting
          below it, where nobody scrolls past a success screen to read them. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          <WriteFlow
            businesses={businesses}
            categories={categories}
            treatments={treatments}
            initialPlaceSlug={place}
          />
        </div>

        <aside className="rounded-card border border-rule bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Seal size={18} className="stamp text-seal" />
            One bill, one review
          </h2>
          <ul className="mt-3 space-y-2 text-xs text-ink-muted">
            <li>
              Every bill is hashed. Once it has been used for a review, it can
              never be used again — by you or anyone else.
            </li>
            <li>
              We never pay, discount or gift anything for a review. The moment
              reviews are bought, the badge is worthless.
            </li>
            <li>
              Three reviews a day, per account. We cap volume to keep review
              farms out.
            </li>
          </ul>
          <Link
            href="/trust"
            className="mt-4 inline-block text-xs text-link hover:underline"
          >
            How verification works
          </Link>
        </aside>
      </div>
    </div>
  );
}
