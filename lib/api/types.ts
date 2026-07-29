/**
 * Wire types — these mirror `verifiedviews-backend-api-spec.md` §4 and §8
 * exactly. Conventions from §7 hold throughout:
 *
 *   · JSON only, `snake_case` keys
 *   · UTC ISO-8601 timestamps
 *   · amounts as integer **paise** (4230000 = ₹42,300.00) to avoid float drift
 *   · cursor pagination: { data, next_cursor, has_more }
 *
 * Nothing in `components/` touches these — `lib/api/adapters.ts` maps them into
 * the view models in `lib/types.ts`, so a wire change stops at that boundary.
 */

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/* -------------------------------------------------------------------------- */

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    field?: string;
    request_id: string;
    docs?: string;
    /** Present on `business_mismatch` — §8.4. */
    suggested_business?: {
      id: string;
      name: string;
      slug?: string;
      confidence: number;
    };
  };
}

/** §7 — the complete code list. Exhaustive so `switch` stays checked. */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "rate_limited"
  | "receipt_duplicate"
  | "receipt_unreadable"
  | "business_mismatch"
  | "review_exists"
  | "content_rejected"
  | "conflict"
  | "internal";

/* -------------------------------------------------------------------------- */
/* Auth — §8.1                                                                 */
/* -------------------------------------------------------------------------- */

export interface OtpRequestBody {
  phone: string;
}

export interface OtpRequestResponse {
  request_id: string;
  expires_in: number;
  /** Non-production only; a real deployment omits this. */
  dev_code?: string;
}

export interface OtpVerifyBody {
  request_id: string;
  code: string;
  device: {
    device_id: string;
    platform: "web" | "android" | "ios";
    app_version: string;
  };
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  /** Seconds until the access token expires — 15 minutes per §3. */
  expires_in: number;
}

export interface OtpVerifyResponse extends TokenPair {
  is_new_user: boolean;
  user: MeDto;
}

/* -------------------------------------------------------------------------- */
/* Users — §8.2                                                                */
/* -------------------------------------------------------------------------- */

export interface MeDto {
  id: string;
  phone_e164: string;
  display_name: string | null;
  locale: string;
  trust_level: number;
  verified_review_count: number;
  status: "active" | "suspended" | "deleted";
}

export interface PublicUserDto {
  id: string;
  display_name: string | null;
  trust_level: number;
  verified_review_count: number;
}

/* -------------------------------------------------------------------------- */
/* Taxonomy — §8.3 GET /categories                                             */
/* -------------------------------------------------------------------------- */

export type CategoryFieldType =
  | "text"
  | "number"
  | "currency"
  | "select"
  | "boolean"
  /**
   * The three-level treatment picker. Its options come from `GET /treatments`
   * rather than the field's own `options`, and it writes three keys into
   * `structured` — see `lib/treatments.ts`.
   */
  | "treatment";

export interface CategoryAspectDto {
  key: string;
  label: string;
  sort_order: number;
  weight: number;
}

export interface CategoryFieldDto {
  key: string;
  label: string;
  type: CategoryFieldType;
  options: string[] | null;
  required: boolean;
  suffix?: string | null;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  plural?: string;
  blurb?: string;
  parent_id: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  aspects: CategoryAspectDto[];
  fields: CategoryFieldDto[];
  /** Receipt expectations per category — drives copy and the match tolerance. */
  receipt?: {
    expects: string;
    amount_tolerance: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Treatments — GET /treatments (see `docs/api-additions.md` §13)              */
/* -------------------------------------------------------------------------- */

/**
 * The one place in this file that isn't `snake_case`: the treatment taxonomy
 * is served in the shape the clinical-coding source already publishes, so it
 * is carried through verbatim rather than renamed in two systems. Everything
 * above `lib/api/adapters.ts` sees the camelCase view model instead.
 */
export interface TreatmentSpecialityDto {
  specialityName: string;
  procedureName: string[];
}

export interface TreatmentCategoryDto {
  categoryName: string;
  specialities: TreatmentSpecialityDto[];
}

/* -------------------------------------------------------------------------- */
/* Businesses — §8.3                                                           */
/* -------------------------------------------------------------------------- */

export interface RatingBucketDto {
  score: number;
  count: number;
  /** Star histogram, 1★ → 5★. Present on the verified bucket. */
  distribution?: [number, number, number, number, number];
}

export interface BusinessAspectDto {
  key: string;
  label: string;
  score: number;
}

export interface BusinessCostDto {
  /** 1–4, mapped to ₹ … ₹₹₹₹ for display. */
  band: number;
  currency: "INR";
  /** Paise. Computed only from verified receipts — §6. */
  p25: number;
  p50: number;
  p75: number;
  based_on_receipts: number;
}

export interface BusinessDto {
  id: string;
  slug: string;
  name: string;
  legal_name?: string | null;
  category: { id: string; slug: string; name: string };
  address: {
    line1: string;
    area?: string;
    city: string;
    state?: string;
    pincode: string;
  };
  geo: { lat: number; lng: number } | null;
  phone: string | null;
  website?: string | null;
  hours?: string | null;
  /** Short descriptor under the name, e.g. "Multispecialty". */
  descriptor?: string | null;
  specialities?: string[];
  status: "unclaimed" | "claimed" | "suspended";
  ratings: {
    verified: RatingBucketDto;
    unverified: RatingBucketDto;
  };
  aspects: BusinessAspectDto[];
  cost: BusinessCostDto;
  can_review: boolean;
  /** IS 19000:2022 solicitation disclosure — §10 of the design doc. */
  solicits_reviews?: boolean;
  photos?: {
    id: string;
    url: string | null;
    seed?: number;
    /** Logos need letterboxing; premises photos fill the frame. */
    fit?: "cover" | "contain";
  }[];
}

/* -------------------------------------------------------------------------- */
/* Reviews — §8.5                                                              */
/* -------------------------------------------------------------------------- */

export type VerificationTierDto = "verified" | "partial" | "unverified";

export type ReviewStatusDto =
  | "published"
  | "under_review"
  | "rejected"
  | "removed"
  | "disputed";

export interface ReviewReplyDto {
  id: string;
  business_id: string;
  author_display_name: string;
  body: string;
  created_at: string;
}

export interface ReviewDto {
  id: string;
  business_id: string;
  business_slug: string;
  /** Null when `is_anonymous` — the badge survives, the name does not. */
  author: PublicUserDto | null;
  rating: number;
  title: string;
  body: string;
  language: "en" | "hi" | "mr";
  aspect_ratings: Record<string, number>;
  structured: Record<string, string | number | boolean>;
  verification_tier: VerificationTierDto;
  weight: number;
  is_anonymous: boolean;
  status: ReviewStatusDto;
  helpful_count: number;
  report_count: number;
  visit_date: string;
  /** Paise, or null when no receipt is attached. */
  bill_amount: number | null;
  published_at: string;
  edited_at: string | null;
  reply: ReviewReplyDto | null;
  /**
   * Human-readable explanation for a `partial` tier or a `disputed` status.
   * See `docs/api-additions.md` — the spec has no field for this today.
   */
  status_note?: string | null;
}

export interface CreateReviewBody {
  business_id: string;
  receipt_id?: string;
  rating: number;
  aspect_ratings: Record<string, number>;
  title?: string;
  body: string;
  structured: Record<string, string | number | boolean>;
  media_ids?: string[];
  is_anonymous: boolean;
  language: "en" | "hi" | "mr";
}

export interface CreateReviewResponse {
  id: string;
  status: ReviewStatusDto;
  verification_tier: VerificationTierDto;
  weight: number;
  public_url: string;
}

export interface VoteBody {
  value: 1 | -1 | 0;
}

export interface ReportReviewBody {
  reason: string;
  detail?: string;
  evidence_media_id?: string;
}

/* -------------------------------------------------------------------------- */
/* Receipts — §8.4                                                             */
/* -------------------------------------------------------------------------- */

export interface UploadIntentBody {
  business_id: string;
  mime: string;
  byte_size: number;
}

export interface UploadIntentResponse {
  receipt_id: string;
  upload_url: string;
  headers: Record<string, string>;
  expires_in: number;
}

export interface ProcessReceiptResponse {
  receipt_id: string;
  status: "processing";
  poll_after_ms: number;
}

export type ReceiptStatusDto =
  | "processing"
  | "verified"
  | "partial"
  | "rejected"
  | "failed";

export interface ReceiptDto {
  id: string;
  status: ReceiptStatusDto;
  business_id: string | null;
  extracted: {
    merchant: string | null;
    txn_date: string | null;
    /** Paise. */
    total_amount: number | null;
    currency: "INR";
    invoice_no: string | null;
    gstin: string | null;
  } | null;
  match: { score: number; reasons: string[] } | null;
  redaction: {
    auto_boxes: number;
    /** Short-lived signed URL scoped to the owner. Never public. */
    preview_url: string | null;
    expires_in: number;
    /** See `docs/api-additions.md` — needed to label the redaction UI. */
    fields?: RedactionFieldDto[];
  } | null;
  can_review: boolean;
  /** Set when the object will be purged — §4 retention. */
  purge_after: string | null;
  consumed_by_review_id: string | null;
}

export interface RedactionFieldDto {
  key: string;
  label: string;
  /** What the extractor read, already masked when `redacted` is true. */
  value: string;
  redacted: boolean;
  /** False for merchant, date and total — those must stay legible to verify. */
  can_redact: boolean;
  box: { x: number; y: number; w: number; h: number } | null;
}

export interface RedactionsBody {
  boxes: { x: number; y: number; w: number; h: number }[];
}

export interface ConfirmReceiptBody {
  business_id: string;
  txn_date?: string;
  total_amount?: number;
}

/** GET /me/receipts — the private vault, §8.2. */
export interface VaultReceiptDto {
  id: string;
  business: { id: string; slug: string; name: string } | null;
  /** Paise. */
  total_amount: number | null;
  txn_date: string | null;
  status: ReceiptStatusDto;
  consumed_by_review_id: string | null;
  purge_after: string | null;
}

/* -------------------------------------------------------------------------- */
/* Business owner API — §8.6                                                   */
/* -------------------------------------------------------------------------- */

export interface BusinessOverviewDto {
  business: BusinessDto;
  deltas: { verified_score: number; unverified_score: number };
  counts: {
    verified: number;
    unverified: number;
    new_this_week: number;
    unanswered: number;
  };
}

export interface BusinessInsightsDto {
  range: string;
  aspect_trends: { key: string; label: string; from: number; to: number }[];
  /** Paise buckets over verified receipts. */
  cost_distribution: { from: number; to: number; count: number }[];
}

export interface CreateClaimBody {
  business_id: string;
  method: "gstin" | "phone" | "document";
  evidence?: { gstin?: string; registration_no?: string; media_id?: string };
  contact_email: string;
  contact_phone?: string;
  role?: string;
}

/* -------------------------------------------------------------------------- */
/* Search — §8.3                                                               */
/* -------------------------------------------------------------------------- */

export interface SearchQuery {
  q?: string;
  category?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  min_verified?: number;
  min_rating?: number;
  cost_band?: number;
  speciality?: string;
  sort?: "relevance" | "verified" | "rating" | "cost_asc" | "cost_desc";
  limit?: number;
  cursor?: string;
}
