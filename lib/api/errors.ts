import type { ApiErrorBody, ApiErrorCode } from "./types";

/**
 * §7 error envelope, as a throwable. `request_id` is carried through to every
 * client-facing error message so a support conversation can start with it
 * instead of "it didn't work".
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly field?: string;
  readonly requestId: string;
  readonly docs?: string;
  readonly suggestedBusiness?: {
    id: string;
    name: string;
    slug?: string;
    confidence: number;
  };
  /** Seconds until the limit resets, from `X-RateLimit-Reset`. */
  readonly retryAfter?: number;

  constructor(
    status: number,
    body: ApiErrorBody,
    opts: { retryAfter?: number } = {},
  ) {
    super(body.error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error.code;
    this.field = body.error.field;
    this.requestId = body.error.request_id;
    this.docs = body.error.docs;
    this.suggestedBusiness = body.error.suggested_business;
    this.retryAfter = opts.retryAfter;
  }

  is(code: ApiErrorCode): boolean {
    return this.code === code;
  }
}

/**
 * §9.4 of the design doc — errors say what happened and what to do next, in
 * the interface's voice. They don't apologise and they are never vague. The
 * server sends copy too; this is the fallback when it doesn't, and the place
 * the tone is guaranteed.
 */
const COPY: Record<ApiErrorCode, string> = {
  unauthenticated: "Your session expired. Verify your number again to continue.",
  forbidden: "You don't have access to this.",
  not_found: "That's not here any more.",
  validation_failed: "Something in the form isn't right yet.",
  rate_limited:
    "You've hit today's cap. We limit volume to keep review farms out — try again tomorrow.",
  receipt_duplicate:
    "This bill has already been used for a review. One bill, one review.",
  receipt_unreadable:
    "We couldn't read this bill. Retake it in better light, or continue without a bill.",
  business_mismatch: "This bill looks like it's from somewhere else.",
  review_exists:
    "You've already reviewed this place for this visit. You can edit that review instead.",
  content_rejected:
    "Your review didn't pass our checks. Edit it and resubmit, or appeal.",
  conflict: "Something changed while you were working. Reload and try again.",
  internal: "That failed on our side. Nothing you did — try again.",
};

export function errorCopy(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || COPY[error.code];
  }
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError when the network is unreachable.
    return "You're offline. Your draft is saved — we'll publish when you're back.";
  }
  return COPY.internal;
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (!code || error.code === code);
}
