/** §9.6 — Indian digit grouping throughout: ₹1,84,220, not ₹184,220. */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPlain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatRupees(amount: number): string {
  return inr.format(amount);
}

export function formatNumber(n: number): string {
  return inrPlain.format(n);
}

/**
 * Short form for cost bands and headline figures: ₹18k, ₹1.4L, ₹2.3Cr.
 * Lakh/crore rather than K/M — the audience reads in lakhs.
 */
export function formatRupeesShort(amount: number): string {
  if (amount >= 1_00_00_000) {
    return `₹${trim(amount / 1_00_00_000)}Cr`;
  }
  if (amount >= 1_00_000) {
    return `₹${trim(amount / 1_00_000)}L`;
  }
  if (amount >= 1_000) {
    return `₹${trim(amount / 1_000)}k`;
  }
  return `₹${amount}`;
}

function trim(n: number): string {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

// Pinned to UTC so a server in any timezone renders the same day as the client.
const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}

/** "Mar 26" style, used in dense review headers. */
export function formatMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${monthFmt.format(d)} ${String(d.getUTCFullYear()).slice(2)}`;
}

/**
 * Relative age against a fixed "today" so server and client agree and
 * prerendered pages don't drift. Real deployments pass the request time in.
 */
export function formatAge(iso: string, now: Date = TODAY): string {
  const days = Math.round(
    (now.getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 31) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** The dataset's reference date. Everything relative hangs off this. */
export const TODAY = new Date("2026-07-26T00:00:00Z");

/**
 * §9.3 — cost band, ₹ to ₹₹₹₹. The level is computed server-side from the p50
 * of verified receipts against category quartiles (§6 of the backend spec), so
 * this only renders it.
 */
export function costBand(level: number): string {
  return "₹".repeat(Math.min(Math.max(Math.round(level), 1), 4));
}

export function scoreText(score: number): string {
  return score.toFixed(1);
}
