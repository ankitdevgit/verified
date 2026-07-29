import { newIdempotencyKey, request } from "./client";
import type {
  BusinessDto,
  BusinessInsightsDto,
  BusinessOverviewDto,
  CategoryDto,
  ConfirmReceiptBody,
  CreateClaimBody,
  CreateReviewBody,
  CreateReviewResponse,
  MeDto,
  OtpRequestResponse,
  OtpVerifyResponse,
  Page,
  ProcessReceiptResponse,
  ReceiptDto,
  RedactionsBody,
  ReportReviewBody,
  ReviewDto,
  SearchQuery,
  TreatmentCategoryDto,
  UploadIntentBody,
  UploadIntentResponse,
  VaultReceiptDto,
  VoteBody,
} from "./types";
import { deviceId, APP_VERSION } from "./client";

/* ========================================================================== */
/* §8.1 Auth                                                                   */
/* ========================================================================== */

export function requestOtp(phone: string) {
  return request<OtpRequestResponse>("/auth/otp/request", {
    method: "POST",
    body: { phone },
    anonymous: true,
  });
}

export function verifyOtp(requestId: string, code: string) {
  return request<OtpVerifyResponse>("/auth/otp/verify", {
    method: "POST",
    anonymous: true,
    body: {
      request_id: requestId,
      code,
      device: {
        device_id: deviceId(),
        platform: "web" as const,
        app_version: APP_VERSION,
      },
    },
  });
}

export function refreshSession(refreshToken: string) {
  return request<OtpVerifyResponse>("/auth/refresh", {
    method: "POST",
    anonymous: true,
    body: { refresh_token: refreshToken },
  });
}

export function logout() {
  return request<void>("/auth/logout", { method: "POST" });
}

/* ========================================================================== */
/* §8.2 Users                                                                  */
/* ========================================================================== */

export function getMe() {
  return request<MeDto>("/me");
}

export function getMyReviews(cursor?: string) {
  return request<Page<ReviewDto>>("/me/reviews", { query: { cursor } });
}

export function getMyReceipts(cursor?: string) {
  return request<Page<VaultReceiptDto>>("/me/receipts", { query: { cursor } });
}

export function deleteMyReceipt(id: string) {
  return request<void>(`/me/receipts/${id}`, { method: "DELETE" });
}

/* ========================================================================== */
/* §8.3 Discovery                                                              */
/* ========================================================================== */

export function getCategories() {
  return request<{ data: CategoryDto[] }>("/categories");
}

/**
 * The treatment taxonomy behind the three-level picker in the write flow —
 * category → speciality → procedure. Served alongside the listings so the
 * labels a reviewer picks are the ones the backend already stores, rather
 * than a list frozen into a frontend release.
 */
export function getTreatments() {
  return request<{ data: TreatmentCategoryDto[] }>("/treatments");
}

export function search(query: SearchQuery) {
  return request<Page<BusinessDto>>("/search", {
    query: { ...query },
  });
}

export function getBusiness(idOrSlug: string) {
  return request<BusinessDto>(`/businesses/${idOrSlug}`);
}

export function getBusinessReviews(
  idOrSlug: string,
  params: {
    tier?: "verified" | "all";
    aspect?: string;
    sort?: "recent" | "helpful" | "rating";
    limit?: number;
    cursor?: string;
  } = {},
) {
  // §8.3 — the API defaults to tier=verified. Stated explicitly so a future
  // default change on the server can't quietly alter what this page shows.
  return request<Page<ReviewDto>>(`/businesses/${idOrSlug}/reviews`, {
    query: { tier: params.tier ?? "verified", ...params },
  });
}

/* ========================================================================== */
/* §8.4 Receipts                                                               */
/* ========================================================================== */

export function createUploadIntent(body: UploadIntentBody) {
  return request<UploadIntentResponse>("/receipts/upload-intent", {
    method: "POST",
    body,
    idempotencyKey: newIdempotencyKey(),
  });
}

/**
 * Bytes go straight to object storage — they never pass through this app, and
 * the bucket has no public ACL (§10). Not a JSON call, which is why it doesn't
 * use `request`.
 */
export async function uploadReceiptBytes(
  intent: UploadIntentResponse,
  file: Blob,
): Promise<void> {
  const res = await fetch(intent.upload_url, {
    method: "PUT",
    headers: intent.headers,
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Receipt upload failed with ${res.status}`);
  }
}

export function processReceipt(receiptId: string) {
  return request<ProcessReceiptResponse>(`/receipts/${receiptId}/process`, {
    method: "POST",
  });
}

export function getReceipt(receiptId: string) {
  return request<ReceiptDto>(`/receipts/${receiptId}`);
}

export function setReceiptRedactions(receiptId: string, body: RedactionsBody) {
  return request<ReceiptDto>(`/receipts/${receiptId}/redactions`, {
    method: "POST",
    body,
  });
}

/** Resolves a `partial` receipt by confirming the field that didn't match. */
export function confirmReceipt(receiptId: string, body: ConfirmReceiptBody) {
  return request<ReceiptDto>(`/receipts/${receiptId}/confirm`, {
    method: "POST",
    body,
  });
}

export function deleteReceipt(receiptId: string) {
  return request<void>(`/receipts/${receiptId}`, { method: "DELETE" });
}

/**
 * Polls until the OCR pipeline settles. §11 targets p90 under 45s end to end,
 * so the ceiling here is generous rather than optimistic.
 */
export async function pollReceipt(
  receiptId: string,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ReceiptDto> {
  const deadline = Date.now() + (opts.timeoutMs ?? 60_000);
  let waitMs = 1_500;

  for (;;) {
    const receipt = await getReceipt(receiptId);
    if (receipt.status !== "processing") return receipt;
    if (Date.now() > deadline) return receipt;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    waitMs = Math.min(waitMs * 1.4, 6_000);
    if (opts.signal?.aborted) return receipt;
  }
}

/* ========================================================================== */
/* §8.5 Reviews                                                                */
/* ========================================================================== */

export function createReview(body: CreateReviewBody, idempotencyKey?: string) {
  return request<CreateReviewResponse>("/reviews", {
    method: "POST",
    body,
    idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
  });
}

export function getReview(id: string) {
  return request<ReviewDto>(`/reviews/${id}`);
}

export function voteOnReview(id: string, value: VoteBody["value"]) {
  return request<{ helpful_count: number }>(`/reviews/${id}/vote`, {
    method: "POST",
    body: { value },
  });
}

export function reportReview(id: string, body: ReportReviewBody) {
  return request<{ id: string; status: string }>(`/reviews/${id}/report`, {
    method: "POST",
    body,
  });
}

export function replyToReview(id: string, body: string) {
  return request<ReviewDto>(`/reviews/${id}/replies`, {
    method: "POST",
    body: { body },
  });
}

export function disputeReview(
  id: string,
  body: { reason: string; detail?: string; evidence_media_id?: string },
) {
  return request<{ id: string; status: string }>(`/reviews/${id}/dispute`, {
    method: "POST",
    body,
  });
}

/* ========================================================================== */
/* §8.6 Business (owner)                                                       */
/* ========================================================================== */

export function createClaim(body: CreateClaimBody) {
  return request<{ id: string; status: string }>("/business/claims", {
    method: "POST",
    body,
  });
}

export function getBusinessOverview(businessId: string) {
  return request<BusinessOverviewDto>(`/business/${businessId}/overview`);
}

export function getBusinessReviewsForOwner(
  businessId: string,
  params: { needs_reply?: boolean; cursor?: string } = {},
) {
  return request<Page<ReviewDto>>(`/business/${businessId}/reviews`, {
    query: { ...params },
  });
}

export function getBusinessInsights(businessId: string, range = "90d") {
  return request<BusinessInsightsDto>(`/business/${businessId}/insights`, {
    query: { range },
  });
}

export function updateBusinessProfile(
  businessId: string,
  patch: Partial<{
    phone: string;
    hours: string;
    address_line1: string;
    website: string;
    descriptor: string;
  }>,
) {
  return request<BusinessDto>(`/business/${businessId}/profile`, {
    method: "PATCH",
    body: patch,
  });
}
