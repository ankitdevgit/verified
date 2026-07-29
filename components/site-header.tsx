import Link from "next/link";
import type { CSSProperties } from "react";
import { Seal } from "./seal";
import { ButtonLink } from "./ui";
import { accentFor } from "@/lib/accents";
import { getCategories } from "@/lib/categories";
import { SITE } from "@/lib/site";

const NAV_SLUGS = ["hospitals", "clinics", "labs"];

export async function SiteHeader() {
  const categories = await getCategories();
  const nav = categories.filter((c) => NAV_SLUGS.includes(c.slug));
  return (
    <header className="rule-gradient sticky top-0 z-40 bg-paper/80 backdrop-blur-md">
      <div className="scroll-progress" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label={`${SITE.name} home`}
        >
          <Seal size={24} className="stamp text-seal" />
          <span className="brand-gradient font-display text-lg font-bold tracking-tight">
            {SITE.name}
          </span>
        </Link>

        <nav
          className="ml-2 hidden items-center gap-1 md:flex"
          aria-label="Categories"
        >
          {nav.map((c, i) => (
            <Link
              key={c.slug}
              href={`/c/${c.slug}/${SITE.launchCity.toLowerCase()}`}
              style={{ "--chip": accentFor(i) } as CSSProperties}
              className="nav-accent btn-lift rounded-pill px-3 py-2 text-sm text-ink-muted"
            >
              {c.plural}
            </Link>
          ))}
          <Link
            href="/trust"
            style={{ "--chip": accentFor(nav.length) } as CSSProperties}
            className="nav-accent btn-lift rounded-pill px-3 py-2 text-sm text-ink-muted"
          >
            How it works
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/for-business"
            style={{ "--chip": accentFor(nav.length + 1) } as CSSProperties}
            className="nav-accent btn-lift hidden rounded-pill px-3 py-2 text-sm text-ink-muted sm:inline-flex"
          >
            For business
          </Link>
          <ButtonLink href="/write" className="min-h-10 px-4">
            <Seal size={16} filled className="stamp" />
            Write a review
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
