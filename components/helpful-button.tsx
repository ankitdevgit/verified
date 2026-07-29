"use client";

import { useState } from "react";
import { voteOnReview } from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";

/**
 * POST /reviews/:id/vote — `{value: 1 | 0}`, per §8.5. Optimistic, because a
 * helpful vote is cheap to get wrong and expensive to make people wait for;
 * a failure rolls the count back rather than leaving a lie on screen.
 */
export function HelpfulButton({
  reviewId,
  initial,
}: {
  reviewId: string;
  initial: number;
}) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(initial);

  async function toggle() {
    const next = !voted;
    setVoted(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const result = await voteOnReview(reviewId, next ? 1 : 0);
      setCount(result.helpful_count);
    } catch {
      setVoted(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={voted}
      className={`btn-lift inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium ${
        voted
          ? "border-seal bg-seal-tint text-seal"
          : "border-rule bg-surface text-ink-muted hover:bg-sunk"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M6 17V8.2l4-5.2c1.2 0 1.9.9 1.7 2.1L11.2 8h4.3c1.1 0 1.9 1 1.6 2.1l-1.4 5.4c-.2.9-1 1.5-1.9 1.5H6zM6 17H3V8.2h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      Helpful
      <span className="ledger">{count}</span>
    </button>
  );
}
