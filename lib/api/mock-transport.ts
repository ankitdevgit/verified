import { setTransport, USE_MOCK_API, type Transport } from "./client";
import {
  BUSINESS_DTOS,
  CATEGORY_DTOS,
  PLATFORM_STATS,
  REVIEW_DTOS,
  VAULT_DTOS,
} from "./seed";
import { TREATMENT_DTOS } from "./seed-treatments";
import type {
  ApiErrorBody,
  ApiErrorCode,
  BusinessDto,
  ReceiptDto,
  ReviewDto,
} from "./types";

/**
 * Serves the endpoints in §8 of the backend spec from the seed data, in the
 * spec's own JSON shapes. It exists so the whole site — including the write
 * funnel — runs before the backend does.
 *
 * Set `NEXT_PUBLIC_API_BASE_URL` and this file is never installed: `request()`
 * goes to `fetch` instead and every call site stays exactly as it is.
 */

const JSON_HEADERS = { "Content-Type": "application/json" };

function ok(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: Partial<ApiErrorBody["error"]> = {},
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      request_id: `mock_${code}`,
      docs: `https://docs.verifiedviews.in/errors/${code}`,
      ...extra,
    },
  };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function page<T>(items: T[], limit = 20, cursor?: string | null) {
  const start = cursor ? Number(cursor) : 0;
  const slice = items.slice(start, start + limit);
  const next = start + limit;
  return {
    data: slice,
    next_cursor: next < items.length ? String(next) : null,
    has_more: next < items.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Mutable state — mirrors what the server would persist                       */
/* -------------------------------------------------------------------------- */

const otpChallenges = new Map<string, { phone: string; code: string }>();
const otpAttemptsByPhone = new Map<string, number[]>();
const receipts = new Map<string, ReceiptDto & { _businessId: string }>();
const votes = new Map<string, number>();
let receiptSeq = 0;

/** §7 rate limits: OTP request is 5 per hour per phone. */
const OTP_LIMIT_PER_HOUR = 5;

function withinOtpLimit(phone: string): boolean {
  const now = Date.now();
  const recent = (otpAttemptsByPhone.get(phone) ?? []).filter(
    (t) => now - t < 3_600_000,
  );
  otpAttemptsByPhone.set(phone, [...recent, now]);
  return recent.length < OTP_LIMIT_PER_HOUR;
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                     */
/* -------------------------------------------------------------------------- */

const transport: Transport = async (path, init) => {
  const url = new URL(init.url);
  const q = url.searchParams;
  const method = (init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const segments = path.replace(/^\//, "").split("/");

  // A little latency, so loading and skeleton states are exercised for real.
  await new Promise((r) => setTimeout(r, 120));

  /* ---- §8.1 Auth ------------------------------------------------------- */

  if (method === "POST" && path === "/auth/otp/request") {
    const phone = String(body.phone ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return fail(
        422,
        "validation_failed",
        "That doesn't look like a mobile number. Ten digits, starting 6 to 9.",
        { field: "phone" },
      );
    }
    if (!withinOtpLimit(phone)) {
      return fail(
        429,
        "rate_limited",
        "Too many codes requested for this number. Try again in an hour.",
      );
    }
    const requestId = `otp_${phone}_${otpChallenges.size}`;
    // Deterministic so a resend doesn't invalidate what's already on screen.
    const seed = [...phone].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const code = String(Math.abs(seed) % 1_000_000).padStart(6, "0");
    otpChallenges.set(requestId, { phone, code });
    return ok({ request_id: requestId, expires_in: 300, dev_code: code });
  }

  if (method === "POST" && path === "/auth/otp/verify") {
    const challenge = otpChallenges.get(String(body.request_id));
    if (!challenge) {
      return fail(404, "not_found", "That code expired. Ask for a new one.");
    }
    if (String(body.code) !== challenge.code) {
      return fail(
        422,
        "validation_failed",
        "That code doesn't match. Check it and retry.",
        { field: "code" },
      );
    }
    return ok({
      access_token: `mock.access.${challenge.phone}`,
      refresh_token: `mock.refresh.${challenge.phone}`,
      expires_in: 900,
      is_new_user: true,
      user: {
        id: `u_${challenge.phone}`,
        phone_e164: `+91${challenge.phone}`,
        display_name: null,
        locale: "en-IN",
        trust_level: 1,
        verified_review_count: 0,
        status: "active",
      },
    });
  }

  /* ---- §8.3 Discovery -------------------------------------------------- */

  if (method === "GET" && path === "/categories") {
    return ok({ data: CATEGORY_DTOS });
  }

  if (method === "GET" && path === "/treatments") {
    return ok({ data: TREATMENT_DTOS });
  }

  if (method === "GET" && path === "/search") {
    const term = (q.get("q") ?? "").trim().toLowerCase();
    const city = q.get("city");
    const category = q.get("category");
    const minRating = Number(q.get("min_rating") ?? 0);
    const costBand = Number(q.get("cost_band") ?? 0);
    const speciality = q.get("speciality");
    const minVerified = Number(q.get("min_verified") ?? 0);
    const sort = q.get("sort") ?? "verified";

    let results = BUSINESS_DTOS.filter((b) => {
      if (city && b.address.city.toLowerCase() !== city.toLowerCase())
        return false;
      if (category && b.category.slug !== category) return false;
      if (minRating && b.ratings.verified.score < minRating) return false;
      if (costBand && b.cost.band !== costBand) return false;
      if (b.ratings.verified.count < minVerified) return false;
      if (
        speciality &&
        !(b.specialities ?? []).some(
          (s) => s.toLowerCase() === speciality.toLowerCase(),
        )
      ) {
        return false;
      }
      if (!term) return true;
      return [
        b.name,
        b.address.area ?? "",
        b.descriptor ?? "",
        ...(b.specialities ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    const sorters: Record<string, (a: BusinessDto, b: BusinessDto) => number> =
      {
        verified: (a, b) => b.ratings.verified.count - a.ratings.verified.count,
        rating: (a, b) => b.ratings.verified.score - a.ratings.verified.score,
        cost_asc: (a, b) => a.cost.p50 - b.cost.p50,
        cost_desc: (a, b) => b.cost.p50 - a.cost.p50,
        relevance: (a, b) =>
          b.ratings.verified.count - a.ratings.verified.count,
      };
    results = [...results].sort(sorters[sort] ?? sorters.verified);

    return ok(page(results, Number(q.get("limit") ?? 50), q.get("cursor")));
  }

  if (
    method === "GET" &&
    segments[0] === "businesses" &&
    segments.length === 2
  ) {
    const business = findBusiness(segments[1]);
    return business
      ? ok(business)
      : fail(404, "not_found", "We don't have a listing at that address.");
  }

  if (
    method === "GET" &&
    segments[0] === "businesses" &&
    segments[2] === "reviews"
  ) {
    const business = findBusiness(segments[1]);
    if (!business) {
      return fail(404, "not_found", "We don't have a listing at that address.");
    }
    const tier = q.get("tier") ?? "verified";
    const sort = q.get("sort") ?? "recent";

    let list = REVIEW_DTOS.filter((r) => r.business_id === business.id);
    // tier=verified means "has a bill" — verified and partial both qualify,
    // and a disputed review keeps its label rather than disappearing.
    if (tier === "verified") {
      list = list.filter((r) => r.verification_tier !== "unverified");
    }
    list = [...list].sort((a, b) =>
      sort === "helpful"
        ? b.helpful_count - a.helpful_count
        : sort === "rating"
          ? b.rating - a.rating
          : b.published_at.localeCompare(a.published_at),
    );
    return ok(page(list, Number(q.get("limit") ?? 50), q.get("cursor")));
  }

  /* ---- §8.5 Reviews ---------------------------------------------------- */

  // Matched before `/reviews/:id`, which would otherwise swallow it.
  if (method === "GET" && path === "/reviews/featured") {
    const featured = [...REVIEW_DTOS]
      .filter(
        (r) => r.verification_tier === "verified" && r.status === "published",
      )
      .sort((a, b) => b.helpful_count - a.helpful_count)
      .slice(0, Number(q.get("limit") ?? 3));
    return ok({ data: featured, next_cursor: null, has_more: false });
  }

  if (method === "GET" && segments[0] === "reviews" && segments.length === 2) {
    const review = REVIEW_DTOS.find((r) => r.id === segments[1]);
    return review
      ? ok(review)
      : fail(404, "not_found", "That review isn't here any more.");
  }

  if (
    method === "POST" &&
    segments[0] === "reviews" &&
    segments[2] === "vote"
  ) {
    const review = REVIEW_DTOS.find((r) => r.id === segments[1]);
    if (!review)
      return fail(404, "not_found", "That review isn't here any more.");
    const value = Number(body.value ?? 0);
    votes.set(review.id, value);
    return ok({ helpful_count: review.helpful_count + (value === 1 ? 1 : 0) });
  }

  if (
    method === "POST" &&
    segments[0] === "reviews" &&
    segments[2] === "report"
  ) {
    return ok({ id: `rep_${Date.now()}`, status: "received" }, 201);
  }

  if (method === "POST" && path === "/reviews") {
    const business = BUSINESS_DTOS.find((b) => b.id === body.business_id);
    if (!business) {
      return fail(422, "validation_failed", "Pick a place first.", {
        field: "business_id",
      });
    }
    // The written body is optional — a rating attached to a verified bill is
    // a complete review on its own. Only the upper bound is enforced.
    if (String(body.body ?? "").length > 2000) {
      return fail(
        422,
        "content_rejected",
        "Reviews cap out at 2,000 characters.",
        { field: "body" },
      );
    }
    const receipt = body.receipt_id ? receipts.get(body.receipt_id) : undefined;
    const tier: ReviewDto["verification_tier"] = receipt
      ? receipt.status === "verified"
        ? "verified"
        : "partial"
      : "unverified";

    return ok(
      {
        id: `01JB${Date.now()}`,
        status: tier === "partial" ? "under_review" : "published",
        verification_tier: tier,
        weight: tier === "verified" ? 1 : tier === "partial" ? 0.5 : 0,
        public_url: `https://verifiedviews.in/b/${business.slug}/reviews/01JB${Date.now()}`,
      },
      201,
    );
  }

  /* ---- §8.4 Receipts --------------------------------------------------- */

  if (method === "POST" && path === "/receipts/upload-intent") {
    const business = BUSINESS_DTOS.find((b) => b.id === body.business_id);
    if (!business) {
      return fail(422, "validation_failed", "Pick a place first.", {
        field: "business_id",
      });
    }
    if (Number(body.byte_size) > 12 * 1024 * 1024) {
      return fail(
        413,
        "validation_failed",
        "That file is over 12MB. Retake it, or upload a smaller photo.",
        { field: "byte_size" },
      );
    }
    if (
      !String(body.mime).startsWith("image/") &&
      body.mime !== "application/pdf"
    ) {
      return fail(
        415,
        "receipt_unreadable",
        "That isn't a photo or a PDF. Retake the bill, or upload a PDF.",
        { field: "mime" },
      );
    }

    const id = `01J9RC${++receiptSeq}${Date.now().toString(36)}`;
    receipts.set(id, {
      id,
      _businessId: business.id,
      status: "processing",
      business_id: business.id,
      extracted: null,
      match: null,
      redaction: null,
      can_review: false,
      purge_after: null,
      consumed_by_review_id: null,
    });
    // No object store here, so the PUT target is a data: URL the client can
    // "upload" to without a network hop.
    return ok(
      {
        receipt_id: id,
        upload_url: "data:text/plain,mock-upload",
        headers: { "Content-Type": String(body.mime) },
        expires_in: 900,
      },
      201,
    );
  }

  if (
    method === "POST" &&
    segments[0] === "receipts" &&
    segments[2] === "process"
  ) {
    const receipt = receipts.get(segments[1]);
    if (!receipt)
      return fail(404, "not_found", "That upload expired. Start again.");

    // Stands in for the OCR queue. §11 targets p90 under 45s; this settles fast
    // enough to work with, slow enough that the reading state is real.
    const business = BUSINESS_DTOS.find((b) => b.id === receipt._businessId)!;
    setTimeout(() => {
      const settled = receipts.get(receipt.id);
      if (!settled) return;
      settled.status = "verified";
      settled.extracted = {
        merchant: business.name.toUpperCase(),
        txn_date: "2026-07-21",
        total_amount: business.cost.p50,
        currency: "INR",
        invoice_no: `INV/26-27/${String(business.cost.p50).slice(0, 5)}`,
        gstin: "27AAACR5055K1Z7",
      };
      settled.match = {
        score: 0.94,
        reasons: ["gstin_exact", "name_fuzzy_0.91", "amount_in_range"],
      };
      settled.redaction = {
        auto_boxes: 3,
        preview_url: null,
        expires_in: 300,
        fields: [
          {
            key: "patient_name",
            label: "Patient name",
            value: "R**** M*****",
            redacted: true,
            can_redact: true,
            box: null,
          },
          {
            key: "uhid",
            label: "UHID",
            value: "RH-2026-88214",
            redacted: true,
            can_redact: true,
            box: null,
          },
          {
            key: "diagnosis",
            label: "Diagnosis",
            value: "Coronary artery disease",
            redacted: true,
            can_redact: true,
            box: null,
          },
          {
            key: "invoice_no",
            label: "Invoice number",
            value: `INV/26-27/${String(business.cost.p50).slice(0, 5)}`,
            redacted: false,
            can_redact: true,
            box: null,
          },
          {
            key: "gstin",
            label: "GSTIN",
            value: "27AAACR5055K1Z7",
            redacted: false,
            can_redact: true,
            box: null,
          },
          {
            key: "doctor_name",
            label: "Doctor's name",
            value: "Dr. A. Kulkarni",
            redacted: false,
            can_redact: true,
            box: null,
          },
          {
            key: "merchant",
            label: "Merchant",
            value: business.name.toUpperCase(),
            redacted: false,
            can_redact: false,
            box: null,
          },
          {
            key: "txn_date",
            label: "Date",
            value: "2026-07-21",
            redacted: false,
            can_redact: false,
            box: null,
          },
          {
            key: "total_amount",
            label: "Total",
            value: String(business.cost.p50),
            redacted: false,
            can_redact: false,
            box: null,
          },
        ],
      };
      settled.can_review = true;
      settled.purge_after = "2026-10-19";
    }, 1_600);

    return ok(
      { receipt_id: receipt.id, status: "processing", poll_after_ms: 1500 },
      202,
    );
  }

  if (method === "GET" && segments[0] === "receipts" && segments.length === 2) {
    const receipt = receipts.get(segments[1]);
    return receipt
      ? ok(stripInternal(receipt))
      : fail(404, "not_found", "That upload expired. Start again.");
  }

  if (
    method === "POST" &&
    segments[0] === "receipts" &&
    segments[2] === "redactions"
  ) {
    const receipt = receipts.get(segments[1]);
    if (!receipt)
      return fail(404, "not_found", "That upload expired. Start again.");
    return ok(stripInternal(receipt));
  }

  if (
    method === "POST" &&
    segments[0] === "receipts" &&
    segments[2] === "confirm"
  ) {
    const receipt = receipts.get(segments[1]);
    if (!receipt)
      return fail(404, "not_found", "That upload expired. Start again.");
    if (body.business_id && body.business_id !== receipt._businessId) {
      const billed = BUSINESS_DTOS.find((b) => b.id === receipt._businessId);
      const target = BUSINESS_DTOS.find((b) => b.id === body.business_id);
      return fail(
        409,
        "business_mismatch",
        `This bill looks like it's from ${billed?.name}, not ${target?.name}.`,
        {
          suggested_business: {
            id: billed?.id ?? "",
            name: billed?.name ?? "",
            slug: billed?.slug,
            confidence: 0.88,
          },
        },
      );
    }
    receipt.status = "verified";
    return ok(stripInternal(receipt));
  }

  if (
    method === "DELETE" &&
    segments[0] === "receipts" &&
    segments.length === 2
  ) {
    receipts.delete(segments[1]);
    return new Response(null, { status: 204 });
  }

  /* ---- §8.2 Users ------------------------------------------------------ */

  if (method === "GET" && path === "/me/receipts") {
    return ok(page(VAULT_DTOS, 50, q.get("cursor")));
  }

  /* ---- §8.6 Business owner --------------------------------------------- */

  if (method === "POST" && path === "/business/claims") {
    return ok({ id: `claim_${Date.now()}`, status: "pending_review" }, 201);
  }

  if (
    method === "GET" &&
    segments[0] === "business" &&
    segments[2] === "overview"
  ) {
    const business = findBusiness(segments[1]);
    if (!business) return fail(404, "not_found", "No such listing.");
    const list = REVIEW_DTOS.filter((r) => r.business_id === business.id);
    return ok({
      business,
      deltas: { verified_score: 0.1, unverified_score: -0.2 },
      counts: {
        verified: business.ratings.verified.count,
        unverified: business.ratings.unverified.count,
        new_this_week: 12,
        unanswered: list.filter(
          (r) => !r.reply && r.verification_tier !== "unverified",
        ).length,
      },
    });
  }

  if (
    method === "GET" &&
    segments[0] === "business" &&
    segments[2] === "reviews"
  ) {
    const business = findBusiness(segments[1]);
    if (!business) return fail(404, "not_found", "No such listing.");
    let list = REVIEW_DTOS.filter((r) => r.business_id === business.id);
    if (q.get("needs_reply") === "true") {
      list = list.filter(
        (r) => !r.reply && r.verification_tier !== "unverified",
      );
    }
    list = [...list].sort((a, b) =>
      b.published_at.localeCompare(a.published_at),
    );
    return ok(page(list, 50, q.get("cursor")));
  }

  if (
    method === "GET" &&
    segments[0] === "business" &&
    segments[2] === "insights"
  ) {
    const business = findBusiness(segments[1]);
    if (!business) return fail(404, "not_found", "No such listing.");
    return ok({
      range: q.get("range") ?? "90d",
      aspect_trends: [
        {
          key: "billing_transparency",
          label: "Billing clarity",
          from: 3.4,
          to: 2.9,
        },
        { key: "wait_time", label: "Wait time", from: 2.8, to: 3.2 },
        {
          key: "staff_behaviour",
          label: "Staff behaviour",
          from: 3.9,
          to: 3.7,
        },
        { key: "doctor_quality", label: "Doctor quality", from: 4.4, to: 4.5 },
      ],
      cost_distribution: costDistribution(business),
    });
  }

  /* ---- Additions (see docs/api-additions.md) ---------------------------- */

  if (method === "GET" && path === "/stats/platform") {
    return ok(PLATFORM_STATS);
  }

  if (method === "GET" && path === "/cities") {
    const cities = [
      ...new Set(BUSINESS_DTOS.map((b) => b.address.city)),
    ].sort();
    return ok({
      data: cities.map((name) => ({ name, slug: name.toLowerCase() })),
    });
  }

  return fail(404, "not_found", `No mock route for ${method} ${path}`);
};

function findBusiness(idOrSlug: string): BusinessDto | undefined {
  return BUSINESS_DTOS.find((b) => b.slug === idOrSlug || b.id === idOrSlug);
}

function stripInternal(
  receipt: ReceiptDto & { _businessId: string },
): ReceiptDto {
  const { _businessId, ...rest } = receipt;
  void _businessId;
  return rest;
}

/** Five paise buckets across p25→p75, weighted toward the median. */
function costDistribution(business: BusinessDto) {
  const { p25, p50, p75 } = business.cost;
  const low = Math.max(p25 - (p50 - p25), 0);
  const high = p75 + (p75 - p50);
  const width = (high - low) / 5;
  const total = business.ratings.verified.count;

  const weights = Array.from({ length: 5 }, (_, i) => {
    const centre = low + width * (i + 0.5);
    const distance = Math.abs(centre - p50) / width;
    return 1 / (1 + distance * distance);
  });
  const sum = weights.reduce((a, b) => a + b, 0);

  const buckets = weights.map((w, i) => ({
    from: Math.round(low + width * i),
    to: Math.round(low + width * (i + 1)),
    count: Math.round((w / sum) * total),
  }));

  const drift = total - buckets.reduce((a, b) => a + b.count, 0);
  if (drift !== 0) {
    const heaviest = buckets.reduce(
      (best, b, i) => (b.count > buckets[best].count ? i : best),
      0,
    );
    buckets[heaviest].count += drift;
  }
  return buckets;
}

if (USE_MOCK_API) {
  setTransport(transport);
}
