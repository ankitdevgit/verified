import Link from "next/link";
import { Chip } from "@/components/ui";

/**
 * Disputes and deeper insights are Phase 2 per the scope in §12 — disputes are
 * handled over email at MVP — so they are absent here rather than stubbed.
 */
const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <h1 className="text-xl">Ruby Hall Clinic</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Sassoon Road, Pune · claimed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Chip>Plan: Free</Chip>
          <Link
            href="/for-business#pricing"
            className="text-xs text-link hover:underline"
          >
            Upgrade
          </Link>
        </div>
      </div>

      {/* No auth layer yet — this renders a fixed business so the surface can be
          reviewed. Wire it to the session before this ships. */}
      <p className="mt-4 rounded-input border-l-2 border-flag bg-flag-tint/60 px-4 py-2.5 text-xs">
        Preview. This dashboard isn&apos;t connected to sign-in yet, so it shows
        one example listing.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[11rem_1fr]">
        <nav aria-label="Dashboard" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="btn-lift inline-flex min-h-10 w-full items-center whitespace-nowrap rounded-input px-3 text-sm text-ink-muted hover:bg-rule/40 hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
