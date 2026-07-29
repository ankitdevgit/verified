import type { Metadata } from "next";
import { ReportForm } from "@/components/report-form";
import { Card } from "@/components/ui";
import { getReview } from "@/lib/data";

export const metadata: Metadata = {
  title: "Report a review",
  robots: { index: false, follow: false },
};

export default async function ReportPage(props: PageProps<"/report">) {
  const params = await props.searchParams;
  const reviewId = typeof params.review === "string" ? params.review : "";
  const review = reviewId ? await getReview(reviewId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl">Report a review</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Tell us what&apos;s wrong with it. Reports go into the same queue as our
        own fraud signals, ranked by risk rather than by arrival time.
      </p>

      {review && (
        <Card className="mt-6 p-5">
          <p className="text-2xs uppercase tracking-wider text-ink-muted">
            Reporting
          </p>
          <p className="mt-1 text-sm font-semibold">{review.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
            {review.text}
          </p>
        </Card>
      )}

      <ReportForm reviewId={reviewId} />

      <section className="mt-10 rounded-card border border-rule bg-surface p-5">
        <h2 className="text-sm font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2 text-xs text-ink-muted">
          <li>
            <span className="ledger">1.</span> A moderator reads the report and,
            where there is one, the receipt behind the review. Nobody at the
            business sees either.
          </li>
          <li>
            <span className="ledger">2.</span> If it breaks the review policy it
            comes down, and the reviewer is told exactly why.
          </li>
          <li>
            <span className="ledger">3.</span> Either way you get an email with
            the outcome. We don&apos;t tell you who wrote the review.
          </li>
          <li>
            <span className="ledger">4.</span> Reporting a review does not
            freeze it. Only a business dispute does that.
          </li>
        </ol>
      </section>
    </div>
  );
}
