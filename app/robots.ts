import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Filtered and private surfaces: nothing here belongs in an index, and
      // the receipt vault must never be crawlable at all.
      disallow: ["/search", "/dashboard", "/account", "/report", "/write?"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
