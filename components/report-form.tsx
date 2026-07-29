"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { reportReview } from "@/lib/api/endpoints";
import { errorCopy } from "@/lib/api/errors";
import "@/lib/api/mock-transport";

/**
 * POST /reviews/:id/report — `{reason, detail, evidence_media_id?}`, §8.5.
 * Evidence would go through the media upload first; that endpoint isn't in the
 * spec's public surface yet, so the file picker collects it and the request
 * carries the text while `docs/api-additions.md` §5 proposes the upload.
 */
const REASONS = [
  {
    value: "not_a_real_visit",
    label: "This didn't happen",
    hint: "The reviewer was never a customer.",
  },
  {
    value: "paid_or_incentivised",
    label: "Paid or incentivised",
    hint: "Someone was given money, a discount or a gift for this.",
  },
  {
    value: "personal_details",
    label: "Names a person's private details",
    hint: "A staff member's phone number, address, or medical information.",
  },
  {
    value: "hate_or_harassment",
    label: "Hate or harassment",
    hint: "Targets someone for who they are.",
  },
  {
    value: "wrong_business",
    label: "Wrong business",
    hint: "This is about a different place.",
  },
  {
    value: "conflict_of_interest",
    label: "Conflict of interest",
    hint: "Written by a competitor, an employee, or the owner.",
  },
];

export function ReportForm({ reviewId }: { reviewId: string }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mt-8 rounded-card border border-seal/40 bg-seal-tint/50 p-6">
        <p className="font-display text-lg">Report received.</p>
        <p className="mt-2 text-sm text-ink-muted">
          A moderator will read it and, where there is one, the receipt behind
          the review. You&apos;ll get an email with the outcome either way — we
          won&apos;t tell you who wrote the review.
        </p>
      </div>
    );
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!reason) {
      setError("Pick a reason so a moderator knows what to check.");
      return;
    }
    if (!reviewId) {
      setError("We don't know which review this is about. Open it and report from there.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await reportReview(reviewId, { reason, detail: detail || undefined });
      setSent(true);
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={submit} noValidate>
      <fieldset>
        <legend className="text-sm font-medium">Why are you reporting it?</legend>
        <div className="mt-3 space-y-2">
          {REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer gap-3 rounded-input border border-rule bg-surface p-4 has-[:checked]:border-seal has-[:checked]:bg-seal-tint/40 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link"
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => {
                  setReason(r.value);
                  setError("");
                }}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-acc-blue)]"
              />
              <span>
                <span className="block text-sm font-medium">{r.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {r.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="text-sm font-medium">What should we know?</span>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={5}
          maxLength={1500}
          placeholder="Anything specific that helps a moderator check this quickly."
          className="mt-1.5 w-full rounded-input border border-rule bg-surface p-3 text-sm"
        />
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-medium">Evidence</span>
        <span className="mt-0.5 block text-xs text-ink-muted">
          Screenshots, an email, a message asking for the review. Optional.
        </span>
        <input
          type="file"
          name="evidence"
          multiple
          accept="image/*,application/pdf"
          className="mt-2 block w-full text-xs file:mr-3 file:min-h-11 file:rounded-input file:border file:border-rule file:bg-sunk file:px-4 file:text-sm"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-input border-l-2 border-alert bg-alert-tint/60 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="mt-7" disabled={busy}>
        {busy ? "Sending…" : "Send report"}
      </Button>
    </form>
  );
}
