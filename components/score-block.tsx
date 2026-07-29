import Link from "next/link";
import { Seal } from "./seal";
import { formatNumber, scoreText } from "@/lib/format";
import { MIN_VERIFIED_FOR_SCORE } from "@/lib/types";

/**
 * §3 of the design doc — the headline rating is verified reviews only, and the
 * unverified average sits below it at 60% size in muted ink.
 *
 * §6 of the backend spec adds the other half of the rule: below
 * MIN_VERIFIED_FOR_SCORE verified reviews there is no headline score at all.
 * Publishing "5.0 from one bill" would be exactly the kind of number this
 * product exists to stop.
 */
export function ScoreBlock({
  verifiedScore,
  verifiedCount,
  unverifiedScore,
  unverifiedCount,
}: {
  verifiedScore: number;
  verifiedCount: number;
  unverifiedScore: number;
  unverifiedCount: number;
}) {
  const publishable = verifiedCount >= MIN_VERIFIED_FOR_SCORE;

  return (
    <div>
      {publishable ? (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none font-bold">
            {scoreText(verifiedScore)}
          </span>
          <Seal size={22} className="stamp text-seal" />
          <span className="ledger text-xs text-ink-muted">
            from {formatNumber(verifiedCount)} verified
          </span>
        </div>
      ) : (
        <div>
          <p className="font-display text-lg leading-snug">
            Not enough verified reviews yet
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            <span className="ledger">{formatNumber(verifiedCount)}</span> of{" "}
            <span className="ledger">{MIN_VERIFIED_FOR_SCORE}</span> needed
            before we publish a score.{" "}
            <Link href="/write" className="text-link hover:underline">
              Add yours
            </Link>
          </p>
        </div>
      )}

      <div className="mt-2 flex items-baseline gap-2 text-ink-muted">
        <span className="font-display text-lg leading-none">
          {scoreText(unverifiedScore)}
        </span>
        <span className="ledger text-2xs">
          from {formatNumber(unverifiedCount)} unverified
        </span>
      </div>
    </div>
  );
}
