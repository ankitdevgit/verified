import type { SearchQuery } from "./api/types";
import type { Business } from "./types";

/**
 * Listing filters. These map one-to-one onto the query parameters
 * `GET /search` already accepts (§8.3), so filtering and sorting happen in the
 * search service rather than in the page — which is the only way the numbers
 * stay right once a listing is longer than one page.
 */

/** Matches the `sort` values the API accepts. */
export type SortKey = "verified" | "rating" | "cost_asc" | "cost_desc";

export interface Filters {
  /** §7.10 — verified-only is ON by default and visibly on. */
  verifiedOnly: boolean;
  minRating: number;
  /** Cost band level 1–4, as the API computes it from verified receipts. 0 = any. */
  band: number;
  speciality: string;
  sort: SortKey;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Last value wins. The verified-only checkbox is paired with a hidden "0"
 * field so that unchecking it submits something rather than nothing; the
 * checkbox's "1" is serialised after the hidden field, so reading the last
 * occurrence gives the true state either way.
 */
function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[v.length - 1] ?? "") : (v ?? "");
}

export function parseFilters(params: RawSearchParams): Filters {
  return {
    // Absent means default-on; only an explicit "0" turns it off, so a plain
    // link into a listing always lands on the verified view.
    verifiedOnly: one(params.verified) !== "0",
    minRating: Number(one(params.rating)) || 0,
    band: Number(one(params.band)) || 0,
    speciality: one(params.speciality),
    sort: (one(params.sort) || "verified") as SortKey,
  };
}

/** Filters → the wire query. */
export function toSearchQuery(
  filters: Filters,
  base: Pick<SearchQuery, "q" | "city" | "category" | "limit"> = {},
): SearchQuery {
  return {
    ...base,
    // "Verified only" means "someone has actually attached a bill here".
    min_verified: filters.verifiedOnly ? 1 : undefined,
    min_rating: filters.minRating || undefined,
    cost_band: filters.band || undefined,
    speciality: filters.speciality || undefined,
    sort: filters.sort,
  };
}

/** Every speciality present in the current result set, for the filter select. */
export function specialitiesIn(businesses: Business[]): string[] {
  return [...new Set(businesses.flatMap((b) => b.specialities))].sort();
}

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.verifiedOnly ? 1 : 0) +
    (filters.minRating ? 1 : 0) +
    (filters.band ? 1 : 0) +
    (filters.speciality ? 1 : 0)
  );
}
