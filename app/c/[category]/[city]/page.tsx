import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessRow } from "@/components/business-row";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/empty-state";
import { Seal } from "@/components/seal";
import { getCategories, getCategory } from "@/lib/categories";
import { toBusiness } from "@/lib/api/adapters";
import { search } from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";
import { CITIES } from "@/lib/data";
import { parseFilters, specialitiesIn, toSearchQuery } from "@/lib/filters";
import { formatNumber, formatRupeesShort } from "@/lib/format";
import { SITE } from "@/lib/site";

/** Every category × city pair is a static SEO landing page. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.flatMap((c) =>
    CITIES.map((city) => ({ category: c.slug, city: city.toLowerCase() })),
  );
}

function titleCity(city: string): string {
  return CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) ?? city;
}

export async function generateMetadata(
  props: PageProps<"/c/[category]/[city]">,
): Promise<Metadata> {
  const { category, city } = await props.params;
  const cat = await getCategory(category);
  if (!cat) return {};
  const cityName = titleCity(city);

  return {
    title: `${cat.plural} in ${cityName}, rated on real bills`,
    description: `Verified ${cat.plural.toLowerCase()} reviews in ${cityName}. Every score here comes from a reviewer who uploaded ${cat.receipt.expects}.`,
    alternates: { canonical: `/c/${category}/${city.toLowerCase()}` },
  };
}

export default async function CategoryListingPage(
  props: PageProps<"/c/[category]/[city]">,
) {
  const { category, city } = await props.params;
  const params = await props.searchParams;

  const cat = await getCategory(category);
  if (!cat) notFound();

  const cityName = titleCity(city);
  const filters = parseFilters(params);

  const [filtered, everything] = await Promise.all([
    search(
      toSearchQuery(filters, { category, city: cityName, limit: 100 }),
    ),
    search({ category, city: cityName, limit: 100 }),
  ]);

  const results = filtered.data.map(toBusiness);
  const all = everything.data.map(toBusiness);

  const totalVerified = all.reduce((sum, b) => sum + b.verifiedCount, 0);
  const medianCost = all.length
    ? [...all].sort((a, b) => a.costP50 - b.costP50)[Math.floor(all.length / 2)]
        .costP50
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink">
          {cat.plural} in {cityName}
        </span>
      </nav>

      <h1 className="mt-3 text-2xl">
        {cat.plural} in {cityName}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">{cat.blurb}</p>

      <dl className="reveal-scale-stagger mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Verified reviews" value={formatNumber(totalVerified)} seal />
        <Stat label={`${cat.plural} listed`} value={formatNumber(all.length)} />
        <Stat
          label="Typical verified bill"
          value={medianCost ? formatRupeesShort(medianCost) : "—"}
        />
      </dl>

      <div className="mt-8">
        <FilterBar
          action={`/c/${category}/${city.toLowerCase()}`}
          filters={filters}
          specialities={specialitiesIn(all)}
          specialityLabel="Speciality"
        />
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Showing{" "}
        <span className="ledger text-ink">{formatNumber(results.length)}</span>{" "}
        of {formatNumber(all.length)}
        {filters.verifiedOnly ? " · verified only" : ""}
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No ${cat.plural.toLowerCase()} in ${cityName} match those filters.`}
            body="Loosen a filter and try again. Verified-only is on by default, which hides places nobody has attached a bill to yet."
            action={
              <Link
                href={`/c/${category}/${city.toLowerCase()}?verified=0`}
                className="text-sm text-link hover:underline"
              >
                Include unverified listings
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-2">
          {results.map((b) => (
            <BusinessRow key={b.id} business={b} />
          ))}
        </ul>
      )}

      <section className="reveal-scale mt-12 rounded-card border border-rule bg-surface p-6">
        <h2 className="text-base font-semibold">
          What a verified {cat.name.toLowerCase()} review means here
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          The reviewer uploaded {cat.receipt.expects}. We matched the merchant
          name, the date and the amount — within{" "}
          <span className="ledger">
            ±{Math.round(cat.receipt.amountTolerance * 100)}%
          </span>{" "}
          — against a hash that can only be used once. The bill itself stays
          private.{" "}
          <Link href="/trust" className="text-link hover:underline">
            How verification works
          </Link>
          .
        </p>
      </section>

      <nav className="mt-8" aria-label="Other cities">
        <h2 className="text-2xs uppercase tracking-wider text-ink-muted">
          {cat.plural} elsewhere
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CITIES.filter((c) => c.toLowerCase() !== city.toLowerCase()).map(
            (c) => (
              <li key={c}>
                <Link
                  href={`/c/${category}/${c.toLowerCase()}`}
                  className="btn-lift inline-flex min-h-10 items-center rounded-pill border border-rule bg-surface px-4 text-xs hover:border-seal hover:text-seal"
                >
                  {cat.plural} in {c}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>

      <p className="mt-8 text-xs text-ink-muted">
        Missing a place?{" "}
        <Link href="/for-business" className="text-link hover:underline">
          Add or claim a business
        </Link>{" "}
        — listings on {SITE.name} are free.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  seal = false,
}: {
  label: string;
  value: string;
  seal?: boolean;
}) {
  return (
    <div className="rounded-card border border-rule bg-surface px-4 py-3">
      <dt className="text-2xs uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="ledger mt-1 flex items-center gap-1.5 text-lg">
        {value}
        {seal && <Seal size={16} className="stamp text-seal" />}
      </dd>
    </div>
  );
}
