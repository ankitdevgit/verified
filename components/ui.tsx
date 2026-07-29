import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { PlaceholderMark } from "./placeholder-mark";

/* §9.3 — Primary (seal fill), Secondary (outline), Ghost, Destructive.
   48px minimum height everywhere, per the accessibility rules in §9.5. */

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANT: Record<Variant, string> = {
  primary: "btn-primary",
  secondary:
    "border border-rule bg-surface text-acc-blue hover:border-acc-blue hover:bg-acc-blue-tint",
  ghost: "text-ink hover:bg-acc-blue-tint hover:text-acc-blue",
  destructive: "border border-alert/40 text-alert hover:bg-alert-tint",
};

const BASE =
  "btn-lift inline-flex min-h-12 items-center justify-center gap-2 rounded-input px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link className={`${BASE} ${VARIANT[variant]} ${className}`} {...props} />
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  /** For per-instance accent colour, which can't be a static utility class. */
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-card border border-rule bg-surface shadow-paper ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Section heading with the gradient rule that runs through the whole product. */
export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rule-gradient mb-4 flex items-end justify-between gap-4 pb-2">
      <h2 className="text-lg">{children}</h2>
      {action}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-seal bg-seal-tint text-seal"
          : "border-rule bg-surface text-acc-blue"
      } ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Stand-in for business photography — the medical mark on a tinted field.
 *
 * The tint stays seed-derived and inside the brand's hue arc (green through
 * teal to blue), because a column of identical placeholders makes a list hard
 * to scan; the mark itself is constant so it always reads as "no photo yet"
 * rather than as a logo belonging to that particular business.
 */
export function PhotoBlock({
  seed,
  className = "",
  label,
}: {
  seed: number;
  className?: string;
  label?: string;
}) {
  const hue = 150 + ((seed * 37) % 76);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-image ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 48% 95%), hsl(${
          hue + 24
        } 44% 87%))`,
      }}
      role={label ? "img" : "presentation"}
      aria-label={label}
    >
      <PlaceholderMark className="h-[64%] w-[64%] text-acc-teal-bright" />
    </div>
  );
}

/** Reusable "what happens next" note, set apart from body copy. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-input border-l-[3px] border-acc-blue bg-acc-blue-tint px-4 py-3 text-sm text-ink">
      {children}
    </p>
  );
}
