import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/search-box";
import { FilterBar } from "@/components/filter-bar";
import { BusinessRow } from "@/components/business-row";
import { EmptyState } from "@/components/empty-state";
import { toBusiness } from "@/lib/api/adapters";
import { search } from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";
import { parseFilters, specialitiesIn, toSearchQuery } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search",
  // Filtered result pages are not the SEO surface; the listings and profiles are.
  robots: { index: false, follow: true },
};

export default async function SearchPage(props: PageProps<"/search">) {
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const city = typeof params.city === "string" ? params.city : SITE.launchCity;
  const filters = parseFilters(params);

  // The search service applies the filters and the sort — §8.3. Doing it here
  // would only be right for the first page of results.
  const [results, unfiltered] = await Promise.all([
    search(toSearchQuery(filters, { q, city, limit: 100 })),
    search({ q, city, limit: 100 }),
  ]);

  const businesses = results.data.map(toBusiness);
  const specialities = specialitiesIn(unfiltered.data.map(toBusiness));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <SearchBox defaultQuery={q} defaultCity={city} size="sm" />

      <div className="mt-6">
        <FilterBar
          action="/search"
          filters={filters}
          specialities={specialities}
          hidden={{ q, city }}
        />
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        <span className="ledger text-ink">{formatNumber(businesses.length)}</span>{" "}
        {businesses.length === 1 ? "place" : "places"}
        {q ? (
          <>
            {" "}
            matching <span className="font-medium text-ink">{q}</span>
          </>
        ) : null}{" "}
        in {city}
        {results.has_more && " · showing the first 100"}
      </p>

      {businesses.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={
              q
                ? `Nothing matching “${q}” in ${city}.`
                : `Nothing here in ${city} yet.`
            }
            body={
              filters.verifiedOnly
                ? "Check the spelling, loosen the filters, or turn off “Verified only” to see places nobody has attached a bill to yet."
                : "Check the spelling, or add this business so someone can be the first to set the record."
            }
            action={
              <Link
                href={`/search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}&verified=0`}
                className="text-sm text-link hover:underline"
              >
                Search without the verified-only filter
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4">
          {businesses.map((b) => (
            <BusinessRow key={b.id} business={b} />
          ))}
        </ul>
      )}
    </div>
  );
}
