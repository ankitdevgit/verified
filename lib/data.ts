import { cache } from "react";
import {
  getBusiness as apiGetBusiness,
  getBusinessReviews as apiGetBusinessReviews,
  getMyReceipts,
  getReview as apiGetReview,
  search as apiSearch,
} from "./api/endpoints";
import { collect, request } from "./api/client";
import "./api/mock-transport";
import { toBusiness, toReceipt, toReview } from "./api/adapters";
import type { BusinessDto, Page, ReviewDto } from "./api/types";
import type { Business, Receipt, Review } from "./types";

/**
 * Everything the pages read goes through here. Each function is one call to the
 * JSON API in the backend spec, adapted into a view model — so swapping the
 * mock transport for a real base URL changes nothing above this file.
 *
 * Wrapped in React's `cache` so a page that needs the same business for both
 * `generateMetadata` and the body fetches it once per request (§14 of the Next
 * metadata docs, and it keeps us inside the p95 budget in §11 of the spec).
 */

export const CITIES = ["Pune", "Mumbai", "Nashik"] as const;

export const getBusinesses = cache(async (): Promise<Business[]> => {
  const businesses = await collect<BusinessDto>((cursor?: string) =>
    apiSearch({ limit: 100, cursor }),
  );
  return businesses.map(toBusiness);
});

export const getBusiness = cache(
  async (slug: string): Promise<Business | undefined> => {
    try {
      return toBusiness(await apiGetBusiness(slug));
    } catch {
      return undefined;
    }
  },
);

export const getBusinessesByCategory = cache(
  async (categorySlug: string, city?: string): Promise<Business[]> => {
    const page = await apiSearch({ category: categorySlug, city, limit: 100 });
    return page.data.map(toBusiness);
  },
);

/**
 * `tier: "all"` includes unverified reviews. The API defaults to verified-only
 * and so does this — the default is the product.
 */
export const getReviews = cache(
  async (
    businessSlug: string,
    tier: "verified" | "all" = "all",
  ): Promise<Review[]> => {
    const reviews = await collect<ReviewDto>((cursor?: string) =>
      apiGetBusinessReviews(businessSlug, { tier, limit: 100, cursor }),
    );
    return reviews.map(toReview);
  },
);

export const getReview = cache(
  async (id: string): Promise<Review | undefined> => {
    try {
      return toReview(await apiGetReview(id));
    } catch {
      return undefined;
    }
  },
);

/** Feeds the "most helpful verified reviews" strip on the home page. */
export const getTopVerifiedReviews = cache(
  async (limit = 3): Promise<Review[]> => {
    const page = await request<Page<ReviewDto>>("/reviews/featured", {
      query: { limit },
    });
    return page.data.map(toReview);
  },
);

export const getReceipts = cache(async (): Promise<Receipt[]> => {
  const page = await getMyReceipts();
  return page.data.map(toReceipt);
});

/**
 * The proof-of-life counter — §7.2 of the design doc. It is the cheapest, most
 * honest trust signal available, so it goes on the home page rather than in an
 * about page. Served by `GET /stats/platform` (see `docs/api-additions.md` §1).
 */
export const getVerifiedStats = cache(async () => {
  const stats = await request<{
    bills_verified: number;
    reviews_published: number;
    bills_verified_this_week: { city: string; count: number };
  }>("/stats/platform");

  return {
    billsVerified: stats.bills_verified,
    reviewsPublished: stats.reviews_published,
    thisWeekCity: stats.bills_verified_this_week.city,
    thisWeekInCity: stats.bills_verified_this_week.count,
  };
});

export async function searchBusinesses(
  query: string,
  opts: {
    city?: string;
    categorySlug?: string;
    minRating?: number;
    costBand?: number;
    speciality?: string;
    sort?: "verified" | "rating" | "cost_asc" | "cost_desc";
  } = {},
): Promise<Business[]> {
  const page = await apiSearch({
    q: query,
    city: opts.city,
    category: opts.categorySlug,
    min_rating: opts.minRating,
    cost_band: opts.costBand,
    speciality: opts.speciality,
    sort: opts.sort,
    limit: 100,
  });
  return page.data.map(toBusiness);
}
