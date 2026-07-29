import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LEGAL_DOCS, getLegalDoc } from "@/lib/legal";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata(
  props: PageProps<"/legal/[doc]">,
): Promise<Metadata> {
  const { doc } = await props.params;
  const legal = getLegalDoc(doc);
  if (!legal) return {};
  return {
    title: legal.title,
    description: legal.summary,
    alternates: { canonical: `/legal/${legal.slug}` },
  };
}

export default async function LegalPage(props: PageProps<"/legal/[doc]">) {
  const { doc } = await props.params;
  const legal = getLegalDoc(doc);
  if (!legal) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
        {LEGAL_DOCS.map((d) => (
          <Link
            key={d.slug}
            href={`/legal/${d.slug}`}
            aria-current={d.slug === legal.slug ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-pill border px-3 text-xs ${
              d.slug === legal.slug
                ? "border-seal bg-seal-tint text-seal"
                : "border-rule bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {d.title}
          </Link>
        ))}
      </nav>

      <h1 className="mt-8 text-2xl">{legal.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{legal.summary}</p>
      <p className="ledger mt-1 text-2xs text-ink-muted">
        Last updated {formatDate(legal.updated)}
      </p>

      <div className="mt-10 space-y-10">
        {legal.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="border-b border-rule pb-2 text-lg">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-3">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="text-sm text-ink/90">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-rule pt-6 text-xs text-ink-muted">
        Written to be read. If anything here is unclear, that is our problem —
        tell the{" "}
        <Link href="/legal/grievance" className="text-link hover:underline">
          grievance officer
        </Link>{" "}
        and we&apos;ll rewrite it.
      </p>
    </div>
  );
}
