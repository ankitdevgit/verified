/**
 * View models. These are what components consume — rupees rather than paise,
 * camelCase, and the four public verification states collapsed into one field.
 *
 * The wire shapes live in `lib/api/types.ts`; `lib/api/adapters.ts` is the only
 * thing that knows how to get from one to the other.
 *
 * One schema, many categories (§1, principle 4): nothing below is
 * vertical-specific.
 */

/** §3 verification model. The tier decides the badge *and* the rating weight. */
export type VerificationTier =
  | "verified"
  | "partial"
  | "unverified"
  | "disputed";

export const TIER_WEIGHT: Record<VerificationTier, number> = {
  verified: 1,
  partial: 0.5,
  unverified: 0,
  disputed: 0, // frozen pending outcome
};

/**
 * §6 of the backend spec — hide the headline score until there are enough
 * verified reviews to mean anything, and say so instead.
 */
export const MIN_VERIFIED_FOR_SCORE = 5;

export interface Aspect {
  key: string;
  label: string;
}

export type FieldType =
  | "text"
  | "number"
  | "currency"
  | "select"
  | "boolean"
  /** Three-level treatment picker, fed by `lib/treatments.ts`. */
  | "treatment";

export interface CategoryField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  suffix?: string;
}

export interface Category {
  slug: string;
  /** Singular, as used in a sentence. */
  name: string;
  /** Plural, as used in nav and chips. */
  plural: string;
  blurb: string;
  aspects: Aspect[];
  fields: CategoryField[];
  receipt: {
    expects: string;
    /** Amount match tolerance as a fraction. Hospitals ±10%, labs ±5%. */
    amountTolerance: number;
  };
}

/**
 * The treatment taxonomy — category → speciality → procedure. One review
 * answers all three, which is what makes "₹42,300 for an angioplasty" a
 * comparable number rather than a free-text string nobody can group by.
 */
export interface TreatmentSpeciality {
  name: string;
  procedures: string[];
}

export interface TreatmentCategory {
  name: string;
  specialities: TreatmentSpeciality[];
}

export interface AspectScore {
  key: string;
  score: number;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  city: string;
  area: string;
  addressLine: string;
  pincode: string;
  phone: string;
  hours: string;
  /** Short descriptor under the name, e.g. "Multispecialty". */
  kind: string;
  specialities: string[];
  /** Headline score — verified reviews only. This is the whole brand. */
  verifiedScore: number;
  verifiedCount: number;
  /** Star histogram 1★→5★ over verified reviews, when the API supplies one. */
  verifiedDistribution?: [number, number, number, number, number];
  /** Shown smaller, in muted ink. Never the headline. */
  unverifiedScore: number;
  unverifiedCount: number;
  aspectScores: AspectScore[];
  /** 1–4, rendered as ₹ … ₹₹₹₹. Computed from verified receipts only (§6). */
  costBandLevel: number;
  /** Rupees, from the verified-receipt percentiles. */
  costP25: number;
  costP50: number;
  costP75: number;
  costBasedOnReceipts: number;
  claimed: boolean;
  canReview: boolean;
  /** Set when solicitation is detected — §10, IS 19000:2022 practice. */
  solicitsReviews?: boolean;
  photoSeed: number;
}

export interface BusinessReply {
  author: string;
  date: string;
  text: string;
}

export interface Review {
  id: string;
  businessSlug: string;
  /** Null when posted anonymously — the badge survives, the name does not. */
  authorName: string | null;
  authorLevel: number;
  tier: VerificationTier;
  overall: number;
  aspects: AspectScore[];
  title: string;
  text: string;
  /** ISO date of the visit, taken from the bill when verified. */
  visitDate: string;
  postedDate: string;
  /** Rupees. Only ever the amount and date — never the bill image. §8.3 */
  billAmount: number | null;
  /** Category-specific structured answers, keyed by CategoryField.key. */
  fields: Record<string, string | number | boolean>;
  helpfulVotes: number;
  reply?: BusinessReply;
  language: "en" | "hi" | "mr";
  /** Why a review is partial or disputed, in the interface's voice. */
  pendingReason?: string;
}

export interface Receipt {
  id: string;
  businessName: string;
  businessSlug?: string;
  /** Rupees. */
  amount: number;
  date: string;
  status: "used" | "unused";
  reviewId?: string;
  /** ISO date the raw image is destroyed — §4 retention. */
  purgeAfter?: string;
}

/** Does this business have enough verified reviews to publish a score? */
export function hasPublishableScore(business: Business): boolean {
  return business.verifiedCount >= MIN_VERIFIED_FOR_SCORE;
}
