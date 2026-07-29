import Link from "next/link";
import type { Metadata } from "next";
import { Seal } from "@/components/seal";
import { VerificationBadge } from "@/components/verification-badge";
import { ButtonLink, Card } from "@/components/ui";
import { getCategories } from "@/lib/categories";
import { SITE } from "@/lib/site";
import type { VerificationTier } from "@/lib/types";

export const metadata: Metadata = {
  title: "How verification works",
  description:
    "What the seal means, what we check, what we never do, and what a business can and cannot do about a review.",
  alternates: { canonical: "/trust" },
};

const TIERS: {
  tier: VerificationTier;
  requirement: string;
  weight: string;
}[] = [
  {
    tier: "verified",
    requirement:
      "The bill's merchant, date and amount all matched the listing, the bill's hash had never been seen before, and it passed our fraud checks.",
    weight: "Counts in full towards the headline score.",
  },
  {
    tier: "partial",
    requirement:
      "A bill was uploaded but one field didn't match — a blurred date, a merchant name we couldn't resolve. A human is looking at it.",
    weight:
      "Shown with an outline seal, and held out of the headline score until it resolves.",
  },
  {
    tier: "unverified",
    requirement: "No bill. Anyone can post one of these.",
    weight:
      "Counts for nothing in the headline score, and lives on a separate tab.",
  },
  {
    tier: "disputed",
    requirement:
      "The business has raised a dispute with evidence. A moderator reviews the receipt — the business never sees it.",
    weight: "Frozen in the score and publicly labelled until it is decided.",
  },
];

export default async function TrustPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Seal size={40} className="stamp text-seal" />
        <h1 className="text-2xl">How verification works</h1>
      </div>
      <p className="mt-4 font-display text-base font-bold text-seal">
        {SITE.brandTagline}
      </p>
      <p className="mt-3 max-w-3xl text-base text-ink-muted">
        Other sites ask whether you visited. We ask whether you can prove it. A
        verified badge on {SITE.name} means a real bill, for a real amount, at a
        real place, on a real date, was checked by the system — not by the
        business, and not by us taking your word for it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          The four states
        </h2>
        <div className="enter-stagger mt-5 grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <Card key={t.tier} className="p-5">
              <VerificationBadge tier={t.tier} linked={false} />
              <p className="mt-3 text-sm">{t.requirement}</p>
              <p className="mt-2 text-xs text-ink-muted">{t.weight}</p>
            </Card>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm text-ink-muted">
          The headline rating on every profile is built from verified reviews
          only. The unverified average is shown too, smaller and in grey,
          because hiding it would be its own kind of dishonesty.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          What we check
        </h2>
        <ol className="reveal-sequence mt-5 grid gap-4 md:grid-cols-2">
          <Check n={1} title="The merchant">
            The name on the bill has to resolve to the listing being reviewed.
            If it doesn&apos;t, we say so and offer to switch you to the place
            the bill actually came from.
          </Check>
          <Check n={2} title="The date">
            The bill date becomes the visit date on the review. You can&apos;t
            move it.
          </Check>
          <Check n={3} title="The amount">
            Matched within a per-category tolerance — tight where prices are
            exact, looser where they aren&apos;t.
            <dl className="ledger mt-3 grid gap-1 text-xs text-ink-muted">
              {categories.map((c) => (
                <div key={c.slug} className="flex gap-2">
                  <dt className="w-40 shrink-0">{c.plural}</dt>
                  <dd>±{Math.round(c.receipt.amountTolerance * 100)}%</dd>
                </div>
              ))}
            </dl>
          </Check>
          <Check n={4} title="The bill's fingerprint">
            Every bill is hashed. One bill, one review — once it has been used,
            it can never be used again, by anyone.
          </Check>
          <Check n={5} title="Everything around it">
            Device, velocity and pattern signals. Reviews that trip them go to a
            human queue ranked by fraud score, not by arrival time.
          </Check>
        </ol>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          What happens to your bill
        </h2>
        <ul className="reveal-stagger mt-5 grid gap-3 text-sm md:grid-cols-2 md:gap-x-10">
          <Bullet>
            We auto-redact your name, patient ID and diagnosis before you
            confirm anything — and you can blur more before it&apos;s stored.
          </Bullet>
          <Bullet>
            The image never appears on a public page. Reviews show the amount
            and the date, and nothing else off the bill.
          </Bullet>
          <Bullet>
            The business never sees the image, your phone number, or your
            identity when you post anonymously. Not through the dashboard, not
            through a dispute.
          </Bullet>
          <Bullet>
            Bills live in your private vault. You can delete any of them, or all
            of them, whenever you like.
          </Bullet>
          <Bullet>
            Bills naming a diagnosis are sensitive health data. We destroy the
            raw image after 90 days by default and keep only the extracted
            fields and the hash — and you can set that to immediate.
          </Bullet>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          What we never do
        </h2>
        <ul className="reveal-stagger mt-5 grid gap-3 text-sm md:grid-cols-2 md:gap-x-10">
          <Bullet>
            We never pay, discount, or gift anything in exchange for a review.
            The moment reviews are bought, the badge is worthless — so there is
            no incentive programme, and there never will be one.
          </Bullet>
          <Bullet>
            We never let a business delete a review, reorder reviews, or pay to
            hide one. A business can reply, and it can dispute with evidence.
            That is the whole list.
          </Bullet>
          <Bullet>
            We never sell reviewer identity, and we don&apos;t show phone
            numbers or email addresses on any public profile.
          </Bullet>
          <Bullet>
            We never optimise for review count. Five hundred verified reviews
            beat fifty thousand unverified ones.
          </Bullet>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="reveal mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          If a business disputes your review
        </h2>
        <p className="mt-4 max-w-3xl text-sm">
          The review gets an amber <strong>Disputed</strong> label and is frozen
          in the score while a moderator works through it. The moderator sees
          your receipt; the business does not. There are three outcomes: the
          dispute is upheld and the review comes down with a reason sent to you,
          the dispute is rejected and the label clears, or defamatory text is
          removed while your rating stands.
        </p>
        <p className="mt-3 max-w-3xl text-sm">
          If your review is removed and you think that&apos;s wrong, you can
          appeal, and a different moderator handles the appeal.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="reveal mt-12">
        <h2 className="reveal-rule border-b border-rule pb-2 text-lg">
          Reviewer levels
        </h2>
        <p className="mt-4 max-w-3xl text-sm">
          Levels 1 to 5, earned by publishing verified reviews over time. They
          can&apos;t be bought, and they don&apos;t change what a review is
          worth in the score — a Level 1 verified bill counts exactly as much as
          a Level 5 one. The level is context for the reader, not a thumb on the
          scale.
        </p>
      </section>

      <Card className="mt-12 p-6">
        <h2 className="text-base font-semibold">Still doesn&apos;t add up?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Report any review you think is fake and tell us why. Reports go to the
          same queue as our own fraud signals.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/report" variant="secondary">
            Report a review
          </ButtonLink>
          <ButtonLink href="/write">Write a verified review</ButtonLink>
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          Unhappy with how we handled something? Our grievance officer is
          reachable at{" "}
          <Link href="/legal/grievance" className="text-link hover:underline">
            {SITE.grievanceEmail}
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

function Check({
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
        <div className="mt-1 text-sm text-ink-muted">{children}</div>
      </div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Seal size={16} className="stamp mt-0.5 shrink-0 text-seal" />
      <span className="text-ink-muted">{children}</span>
    </li>
  );
}
