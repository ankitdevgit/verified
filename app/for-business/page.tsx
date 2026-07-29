import Link from "next/link";
import type { Metadata } from "next";
import { ClaimForm } from "@/components/claim-form";
import { Seal } from "@/components/seal";
import { ButtonLink, Card } from "@/components/ui";
import { getBusinesses } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "For business",
  description:
    "Claim your listing to reply publicly and dispute reviews with evidence. You can never delete or reorder them — and that is the point.",
  alternates: { canonical: "/for-business" },
};

export default async function ForBusinessPage() {
  const businesses = await getBusinesses();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl">Your customers brought receipts.</h1>
      <p className="mt-4 text-base text-ink-muted">
        Every verified review on your listing came from someone who uploaded the
        bill they paid you. That makes the criticism harder to dismiss — and it
        makes the praise worth something.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="#claim">Claim your listing</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">
          See a dashboard
        </ButtonLink>
      </div>

      <section className="reveal mt-14">
        <h2 className="border-b border-rule pb-2 text-lg">
          What you can do
        </h2>
        <div className="reveal-scale-stagger mt-5 grid gap-4 sm:grid-cols-2">
          <Can title="Reply publicly">
            Your reply sits under the review, attributed to you, permanently.
          </Can>
          <Can title="Dispute with evidence">
            Raise a dispute and a moderator checks the receipt. The review is
            labelled and frozen in your score while they do.
          </Can>
          <Can title="See your worst aspect">
            Aspect trends over 90 days, so you find out billing clarity is
            slipping before it costs you a star.
          </Can>
          <Can title="Fix your listing">
            Hours, address, phone, departments, photos.
          </Can>
        </div>
      </section>

      <section className="reveal mt-12">
        <h2 className="border-b border-rule pb-2 text-lg">
          What you can&apos;t do
        </h2>
        <ul className="mt-5 space-y-3 text-sm text-ink-muted">
          <li className="flex gap-3">
            <Cross /> Delete a review, reorder reviews, or pay to hide one.
          </li>
          <li className="flex gap-3">
            <Cross /> See the receipt image, the reviewer&apos;s phone number,
            or who they are when they post anonymously — not in the dashboard,
            not during a dispute, not on request.
          </li>
          <li className="flex gap-3">
            <Cross /> Buy a better score. There is no paid ranking, and there
            won&apos;t be.
          </li>
          <li className="flex gap-3">
            <Cross /> Solicit reviews quietly. If we detect it, your listing
            carries a &ldquo;this business asked customers for reviews&rdquo;
            label, following IS 19000:2022 practice.
          </li>
        </ul>
      </section>

      <section id="claim" className="mt-14 scroll-mt-24">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Seal size={28} className="stamp text-seal" />
            <h2 className="text-lg">Claim this business</h2>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Four steps, usually done inside a working day.
          </p>

          <ol className="mt-6 space-y-5">
            <Step n={1} title="Find your listing">
              Search for it. If it isn&apos;t there, tell us and we&apos;ll add
              it — listings are free, and we list businesses whether or not they
              have claimed a profile.
            </Step>
            <Step n={2} title="Prove the business is yours">
              GSTIN or registration number, plus an OTP to the phone or email
              already on the listing.
            </Step>
            <Step n={3} title="Upload a document if anything mismatches">
              Registration certificate, utility bill, or a letter on your
              letterhead.
            </Step>
            <Step n={4} title="A human approves it">
              Then you get dashboard access, and your replies start appearing
              under your name.
            </Step>
          </ol>

          <div className="mt-8">
            <ClaimForm businesses={businesses} />
          </div>
        </Card>
      </section>

      <section className="reveal mt-12">
        <h2 className="border-b border-rule pb-2 text-lg">Pricing</h2>
        <p className="mt-4 text-sm text-ink-muted">
          Claiming, replying, disputing and fixing your listing are free, and
          will stay free. A paid tier with deeper analytics and multi-branch
          management is coming later. There will never be a paid tier that
          changes what customers see about you.
        </p>
      </section>

      <p className="mt-10 text-xs text-ink-muted">
        Questions, or something on your listing that shouldn&apos;t be there?{" "}
        <Link href="/legal/grievance" className="text-link hover:underline">
          Contact our grievance officer
        </Link>{" "}
        — <span className="ledger">{SITE.grievanceEmail}</span>.
      </p>
    </div>
  );
}

function Can({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Seal size={16} className="stamp text-seal" />
        {title}
      </h3>
      <p className="mt-2 text-xs text-ink-muted">{children}</p>
    </Card>
  );
}

function Cross() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-alert"
    >
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="ledger mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-pill border border-rule text-xs">
        {n}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
