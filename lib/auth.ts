/**
 * Phone OTP is the whole account model at MVP (§12 of the design doc, §3 of the
 * backend spec). One person, one number — the cheapest honest check we have
 * against review farms, and the only thing standing between browsing (open to
 * everyone) and publishing.
 *
 * The calls live in `lib/api/endpoints.ts`; what's left here is the validation
 * and formatting the UI needs, plus the token plumbing around the two calls.
 */
import { requestOtp as apiRequestOtp, verifyOtp as apiVerifyOtp } from "./api/endpoints";
import { writeTokens } from "./api/client";
import "./api/mock-transport";

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;
export const SESSION_KEY = "vv.session.phone";

/** Indian mobile numbers: ten digits, starting 6–9. */
export function isValidIndianMobile(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function formatPhone(digits: string): string {
  return digits.replace(/(\d{5})(\d{5})/, "$1 $2");
}

/** Masks all but the last two digits, for the "we sent a code to…" line. */
export function maskPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(8)}`;
}

export interface OtpChallenge {
  requestId: string;
  phone: string;
  expiresIn: number;
  /**
   * Only ever populated outside production — there is no SMS gateway wired up
   * yet, so a development build shows the code rather than pretending to send
   * one. A real deployment omits it and this stays undefined.
   */
  devCode?: string;
}

/** POST /auth/otp/request — rate limited to 5/hour/phone (§7). */
export async function startOtp(phone: string): Promise<OtpChallenge> {
  const res = await apiRequestOtp(phone);
  return {
    requestId: res.request_id,
    phone,
    expiresIn: res.expires_in,
    devCode: res.dev_code,
  };
}

/**
 * POST /auth/otp/verify — on success the token pair is stored for the tab and
 * every later call picks it up from `Authorization`.
 */
export async function completeOtp(
  challenge: OtpChallenge,
  code: string,
): Promise<{ phone: string; isNewUser: boolean }> {
  const res = await apiVerifyOtp(challenge.requestId, code);
  writeTokens({
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    expires_at: Date.now() + res.expires_in * 1000,
  });
  return { phone: challenge.phone, isNewUser: res.is_new_user };
}

export function signOut() {
  writeTokens(null);
}
