import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/categories";
import { CITIES, getBusinesses, getReviews } from "@/lib/data";
import { LEGAL_DOCS } from "@/lib/legal";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [businesses, categories] = await Promise.all([
    getBusinesses(),
    getCategories(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/trust`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/write`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${SITE.url}/for-business`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...LEGAL_DOCS.map((d) => ({
      url: `${SITE.url}/legal/${d.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const listings: MetadataRoute.Sitemap = categories.flatMap((c) =>
    CITIES.map((city) => ({
      url: `${SITE.url}/c/${c.slug}/${city.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  );

  const profiles: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: `${SITE.url}/b/${b.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Only verified reviews get their own indexable permalink — the unverified
  // ones carry no weight in the score and shouldn't compete for the business's
  // queries.
  const reviewPages = await Promise.all(
    businesses.map(async (b) => {
      const reviews = await getReviews(b.slug);
      return reviews
        .filter((r) => r.tier === "verified")
        .map((r) => ({
          url: `${SITE.url}/b/${b.slug}/reviews/${r.id}`,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        }));
    }),
  );

  return [...staticPages, ...listings, ...profiles, ...reviewPages.flat()];
}
