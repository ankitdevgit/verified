/**
 * Display stars. §9.3 — half-stars are off, and §9.5 requires a full
 * screen-reader label ("4 of 5 stars, verified bill") rather than a pile of
 * decorative glyphs.
 */
export function Stars({
  value,
  size = 16,
  suffix,
  className = "",
}: {
  value: number;
  size?: number;
  /** Appended to the accessible label, e.g. "verified bill". */
  suffix?: string;
  className?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rounded} of 5 stars${suffix ? `, ${suffix}` : ""}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} on={i <= rounded} />
      ))}
    </span>
  );
}

function Star({ size, on }: { size: number; on: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={on ? "text-ink" : "text-rule"}
    >
      <path
        d="M10 1.6l2.47 5.3 5.53.72-4.08 3.94 1.05 5.84L10 14.6l-4.97 2.8 1.05-5.84L2 7.62l5.53-.72L10 1.6z"
        fill="currentColor"
      />
    </svg>
  );
}
