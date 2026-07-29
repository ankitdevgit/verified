import Link from "next/link";
import { VerificationBadge } from "./verification-badge";
import { Stars } from "./stars";
import { HelpfulButton } from "./helpful-button";
import { getCategory, labelFor } from "@/lib/categories";
import { formatAge, formatDate, formatRupees } from "@/lib/format";
import { formatTreatment, readTreatment } from "@/lib/treatments";
import type { Review } from "@/lib/types";

/**
 * §9.3 review card order: badge row → amount/date in ledger → stars → text →
 * actions → reply thread. The bill metadata shown is the amount and date and
 * nothing else — the image never leaves the vault (§4 assumption A4).
 */
export async function ReviewCard({
  review,
  categorySlug,
  href,
  clamp = true,
}: {
  review: Review;
  categorySlug: string;
  href?: string;
  clamp?: boolean;
}) {
  const category = await getCategory(categorySlug);
  const structured = (category?.fields ?? [])
    .flatMap((f) => {
      // The amount already has a home in the ledger row above.
      if (f.type === "currency") return [];
      // A treatment answer lives across three keys — the card shows the one
      // line that reads like an answer, and the full triple is on the detail.
      if (f.type === "treatment") {
        const answer = readTreatment(review.fields, f.key);
        return answer
          ? [{ key: f.key, label: f.label, value: formatTreatment(answer) }]
          : [];
      }
      const value = review.fields[f.key];
      if (value === undefined) return [];
      return [
        {
          key: f.key,
          label: f.label,
          value: `${formatFieldValue(value)}${f.suffix ? ` ${f.suffix}` : ""}`,
        },
      ];
    })
    .slice(0, 3);

  return (
    <article className="border-b border-rule py-6 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <VerificationBadge tier={review.tier} />
        {review.billAmount !== null && (
          <span className="ledger text-xs text-ink">
            {formatRupees(review.billAmount)}
          </span>
        )}
        <span className="ledger text-xs text-ink-muted">
          {formatDate(review.visitDate)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span className="font-medium text-ink">
          {review.authorName ?? "Posted anonymously"}
        </span>
        {review.authorName && (
          <span title="Reviewer trust level, earned by verified reviews">
            Level {review.authorLevel}
          </span>
        )}
        <span aria-hidden="true">·</span>
        <span>{formatAge(review.postedDate)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Stars
          value={review.overall}
          suffix={review.tier === "verified" ? "verified bill" : undefined}
        />
      </div>

      <h3 className="mt-2 text-base font-semibold">
        {href ? (
          <Link href={href} className="hover:underline">
            {review.title}
          </Link>
        ) : (
          review.title
        )}
      </h3>

      <p
        className={`mt-1.5 text-sm text-ink/90 ${clamp ? "line-clamp-4" : ""}`}
      >
        {review.text}
      </p>

      {structured.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-2xs text-ink-muted">
          {structured.map((f) => (
            <div key={f.key} className="flex gap-1.5">
              <dt>{f.label}</dt>
              <dd className="ledger text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {review.pendingReason && (
        <p className="mt-3 rounded-input border-l-2 border-flag bg-flag-tint/60 px-3 py-2 text-xs text-ink">
          {review.pendingReason}
        </p>
      )}

      {review.aspects.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-xs font-medium text-link hover:underline">
            Aspect breakdown
          </summary>
          <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {review.aspects.map((a) => (
              <div
                key={a.key}
                className="flex justify-between border-b border-rule/60 py-1 text-xs"
              >
                <dt className="text-ink-muted">
                  {labelFor(category, a.key)}
                </dt>
                <dd className="ledger">{a.score}/5</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <HelpfulButton reviewId={review.id} initial={review.helpfulVotes} />
        <Link
          href={`/report?review=${review.id}`}
          className="btn-lift inline-flex min-h-9 items-center rounded-pill px-3 text-xs text-ink-muted hover:bg-rule/40 hover:text-ink"
        >
          Report
        </Link>
        {href && (
          <Link
            href={href}
            className="inline-flex min-h-9 items-center rounded-pill px-3 text-xs text-link hover:underline"
          >
            Permalink
          </Link>
        )}
      </div>

      {review.reply && (
        <div className="mt-4 border-l-2 border-rule pl-4">
          <p className="text-xs font-medium">
            Reply from {review.reply.author}{" "}
            <span className="ledger font-normal text-ink-muted">
              {formatDate(review.reply.date)}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink/90">{review.reply.text}</p>
        </div>
      )}
    </article>
  );
}

function formatFieldValue(value: string | number | boolean | undefined): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}
