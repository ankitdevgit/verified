import { cache } from "react";
import { toCategory } from "./api/adapters";
import { getCategories as apiGetCategories } from "./api/endpoints";
import "./api/mock-transport";
import type { Category } from "./types";

/**
 * §4 — a category defines its rating aspects, structured fields, receipt
 * expectations and profile layout. Adding one is a config change, not a
 * release, which is why these come from `GET /categories` rather than a
 * constant in the frontend.
 *
 * Fetched once per request via React's `cache`, and once per page at build
 * time for the statically generated routes. Inactive categories are dropped
 * and the rest keep the server's `sort_order`, so reordering the nav is also a
 * config change.
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  const res = await apiGetCategories();
  return res.data
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toCategory);
});

export const getCategory = cache(
  async (slug: string): Promise<Category | undefined> => {
    return (await getCategories()).find((c) => c.slug === slug);
  },
);

/**
 * Label lookup against an already-resolved category. Synchronous on purpose —
 * components fetch the category once at the top and then label many aspects,
 * rather than awaiting inside a render loop.
 */
export function labelFor(category: Category | undefined, key: string): string {
  return category?.aspects.find((a) => a.key === key)?.label ?? key;
}
