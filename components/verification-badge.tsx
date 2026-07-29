import Link from "next/link";
import { Seal } from "./seal";
import type { VerificationTier } from "@/lib/types";

/**
 * §9.3 / §9.5 — the badge is never colour-alone. Every variant carries a glyph
 * *and* the word, and every badge is tappable through to /trust, because a seal
 * nobody can interrogate is just decoration.
 */
const VARIANTS: Record<
  VerificationTier,
  { label: string; className: string; filled: boolean; glyph: "seal" | "flag" }
> = {
  verified: {
    label: "Verified bill",
    className: "bg-seal-tint text-seal",
    filled: true,
    glyph: "seal",
  },
  partial: {
    label: "Bill under review",
    className: "bg-flag-tint text-flag",
    filled: false,
    glyph: "seal",
  },
  unverified: {
    label: "No bill attached",
    className: "bg-transparent text-ink-muted",
    filled: false,
    glyph: "flag",
  },
  disputed: {
    label: "Disputed",
    className: "bg-flag-tint text-flag",
    filled: false,
    glyph: "flag",
  },
};

export function VerificationBadge({
  tier,
  size = "md",
  linked = true,
}: {
  tier: VerificationTier;
  size?: "sm" | "md";
  linked?: boolean;
}) {
  const v = VARIANTS[tier];
  const dims = size === "sm" ? "text-2xs px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";
  const glyphSize = size === "sm" ? 13 : 16;

  const inner = (
    <>
      {v.glyph === "seal" ? (
        <Seal size={glyphSize} filled={v.filled} className="stamp shrink-0" />
      ) : (
        <FlagGlyph size={glyphSize} />
      )}
      <span className="font-medium">{v.label}</span>
    </>
  );

  const className = `inline-flex items-center rounded-pill ${dims} ${v.className}`;

  if (!linked) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <Link
      href="/trust"
      className={`${className} transition-opacity duration-[120ms] ease-[var(--ease-out-quiet)] hover:opacity-80`}
      title="How verification works"
    >
      {inner}
    </Link>
  );
}

function FlagGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        d="M5 21V4.5h11l-1.6 3.4L16 11.3H5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
