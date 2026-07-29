import Link from "next/link";
import { Seal } from "./seal";
import { accentFor } from "@/lib/accents";
import { getCategories } from "@/lib/categories";
import { SITE } from "@/lib/site";

interface FooterLink {
  label: string;
  href: string;
}

/** Everything that doesn't depend on the category list. */
const STATIC_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Proof",
    links: [
      { label: "How verification works", href: "/trust" },
      { label: "Write a review", href: "/write" },
      { label: "Report a review", href: "/report" },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "For business", href: "/for-business" },
      { label: "Claim your listing", href: "/for-business#claim" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Review policy", href: "/legal/review-policy" },
      { label: "Grievance officer", href: "/legal/grievance" },
    ],
  },
];

export async function SiteFooter() {
  const categories = await getCategories();
  const columns = [
    {
      title: "Browse",
      links: categories.map((c) => ({
        label: c.plural,
        href: `/c/${c.slug}/${SITE.launchCity.toLowerCase()}`,
      })),
    },
    ...STATIC_COLUMNS,
  ];

  return (
    <footer className="rule-gradient-top mt-16 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <Seal size={22} className="stamp text-seal" />
              <span className="brand-gradient font-display text-base font-bold">
                {SITE.name}
              </span>
            </div>
            <p className="mt-3 font-display text-sm font-bold text-acc-blue">
              {SITE.brandTagline}
            </p>
            <p className="mt-2 max-w-xs text-xs text-ink-muted">
              {SITE.tagline} We never pay for reviews, and we never let a
              business delete one.
            </p>
          </div>

          {columns.map((col, i) => (
            <div key={col.title}>
              <h2
                className="text-2xs font-semibold uppercase tracking-wider"
                style={{ color: accentFor(i) }}
              >
                {col.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-xs text-ink-muted transition-colors duration-[120ms] ease-[var(--ease-out-quiet)] hover:text-ink hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-rule pt-6 text-2xs text-ink-muted">
          © 2026 {SITE.name} · Grievance officer reachable at{" "}
          <span className="ledger">{SITE.grievanceEmail}</span> · Reviews are the
          opinions of their authors; verification confirms a bill, not a claim.
        </p>
      </div>
    </footer>
  );
}
