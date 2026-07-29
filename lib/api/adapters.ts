import type {
  BusinessDto,
  CategoryDto,
  ReviewDto,
  TreatmentCategoryDto,
  VaultReceiptDto,
} from "./types";
import type {
  Business,
  Category,
  Receipt,
  Review,
  TreatmentCategory,
  VerificationTier,
} from "@/lib/types";

/**
 * The wire → view boundary. Everything the spec calls a convention — paise,
 * snake_case, `status` separate from `verification_tier` — is resolved here so
 * no component has to know about any of it.
 */

/** §7 — amounts travel as integer paise. Rupees are a display concern. */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function toCategory(dto: CategoryDto): Category {
  return {
    slug: dto.slug,
    name: dto.name,
    plural: dto.plural ?? `${dto.name}s`,
    blurb: dto.blurb ?? "",
    aspects: [...dto.aspects]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({ key: a.key, label: a.label })),
    fields: dto.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options ?? undefined,
      suffix: f.suffix ?? undefined,
    })),
    receipt: {
      expects: dto.receipt?.expects ?? "a bill",
      amountTolerance: dto.receipt?.amount_tolerance ?? 0.05,
    },
  };
}

/** camelCase in, camelCase out — the wire's own naming stops at this line. */
export function toTreatmentCategory(dto: TreatmentCategoryDto): TreatmentCategory {
  return {
    name: dto.categoryName,
    specialities: dto.specialities.map((s) => ({
      name: s.specialityName,
      procedures: s.procedureName,
    })),
  };
}

export function toBusiness(dto: BusinessDto): Business {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    categorySlug: dto.category.slug,
    city: dto.address.city,
    area: dto.address.area ?? dto.address.city,
    addressLine: dto.address.line1,
    pincode: dto.address.pincode,
    phone: dto.phone ?? "",
    hours: dto.hours ?? "",
    kind: dto.descriptor ?? dto.category.name,
    specialities: dto.specialities ?? [],
    verifiedScore: dto.ratings.verified.score,
    verifiedCount: dto.ratings.verified.count,
    verifiedDistribution: dto.ratings.verified.distribution,
    unverifiedScore: dto.ratings.unverified.score,
    unverifiedCount: dto.ratings.unverified.count,
    aspectScores: dto.aspects.map((a) => ({ key: a.key, score: a.score })),
    costBandLevel: dto.cost.band,
    costP25: paiseToRupees(dto.cost.p25),
    costP50: paiseToRupees(dto.cost.p50),
    costP75: paiseToRupees(dto.cost.p75),
    costBasedOnReceipts: dto.cost.based_on_receipts,
    claimed: dto.status === "claimed",
    canReview: dto.can_review,
    solicitsReviews: dto.solicits_reviews,
    photoSeed: dto.photos?.[0]?.seed ?? 1,
    photos:
      dto.photos?.flatMap((p) =>
        p.url ? [{ url: p.url, fit: p.fit ?? ("cover" as const) }] : [],
      ) ?? [],
  };
}

/**
 * §3 of the design doc has four public states; the wire splits them across
 * `verification_tier` and `status`. A disputed review keeps whatever tier it
 * earned — it is frozen, not downgraded — so the label has to come from status
 * first.
 */
export function toTier(dto: ReviewDto): VerificationTier {
  if (dto.status === "disputed") return "disputed";
  if (dto.verification_tier === "partial" || dto.status === "under_review") {
    return "partial";
  }
  return dto.verification_tier;
}

export function toReview(dto: ReviewDto): Review {
  return {
    id: dto.id,
    businessSlug: dto.business_slug,
    authorName: dto.is_anonymous ? null : (dto.author?.display_name ?? null),
    authorLevel: dto.author?.trust_level ?? 1,
    tier: toTier(dto),
    overall: dto.rating,
    aspects: Object.entries(dto.aspect_ratings).map(([key, score]) => ({
      key,
      score,
    })),
    title: dto.title,
    text: dto.body,
    visitDate: dto.visit_date,
    postedDate: dto.published_at.slice(0, 10),
    billAmount: dto.bill_amount === null ? null : paiseToRupees(dto.bill_amount),
    fields: dto.structured,
    helpfulVotes: dto.helpful_count,
    reply: dto.reply
      ? {
          author: dto.reply.author_display_name,
          date: dto.reply.created_at.slice(0, 10),
          text: dto.reply.body,
        }
      : undefined,
    language: dto.language,
    pendingReason: dto.status_note ?? undefined,
  };
}

export function toReceipt(dto: VaultReceiptDto): Receipt {
  return {
    id: dto.id,
    businessName: dto.business?.name ?? "Unmatched bill",
    businessSlug: dto.business?.slug,
    amount: dto.total_amount === null ? 0 : paiseToRupees(dto.total_amount),
    date: dto.txn_date ?? "",
    status: dto.consumed_by_review_id ? "used" : "unused",
    reviewId: dto.consumed_by_review_id ?? undefined,
    purgeAfter: dto.purge_after ?? undefined,
  };
}
