"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Seal } from "@/components/seal";
import { Button, Card } from "@/components/ui";
import {
  OTP_LENGTH,
  RESEND_SECONDS,
  completeOtp,
  formatPhone,
  isValidIndianMobile,
  maskPhone,
  startOtp,
  type OtpChallenge,
} from "@/lib/auth";
import { errorCopy, isApiError } from "@/lib/api/errors";

/**
 * §7.1 — browsing never requires an account, publishing does. This sits in
 * front of the bill upload: number, then code, then the flow opens up.
 *
 * Talks to POST /auth/otp/request and POST /auth/otp/verify. Both are rate
 * limited server-side (5 codes per hour per number, §7), and the 429 comes back
 * as copy the user can act on rather than a dead button.
 */
export function PhoneGate({ onVerified }: { onVerified: (phone: string) => void }) {
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (phase === "code") codeRef.current?.focus();
  }, [phase]);

  // Called from the form's onSubmit and from the "Resend code" button, so the
  // event is optional and only `preventDefault` is ever needed from it.
  async function send(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    if (!isValidIndianMobile(digits)) {
      setError(
        "That doesn't look like a mobile number. Ten digits, starting 6 to 9.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await startOtp(digits);
      setChallenge(next);
      setSecondsLeft(RESEND_SECONDS);
      setPhase("code");
      setCode("");
    } catch (err) {
      setError(errorCopy(err));
      if (isApiError(err, "rate_limited")) setSecondsLeft(RESEND_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const { phone } = await completeOtp(challenge, code);
      onVerified(phone);
    } catch (err) {
      setError(errorCopy(err));
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Seal size={26} className="stamp text-seal" />
        <h2 className="text-lg">
          {phase === "phone" ? "Enter your number" : "Enter the code"}
        </h2>
      </div>

      {phase === "phone" ? (
        <form onSubmit={send} noValidate>
          <p className="mt-2 text-sm text-ink-muted">
            We use it to check you&apos;re one person, not a farm. It is never
            shown on a review, never given to a business, and never sold.
          </p>

          <div className="mt-6 flex gap-2">
            <span className="ledger inline-flex min-h-12 items-center rounded-input border border-rule bg-sunk px-3 text-sm">
              +91
            </span>
            <label className="flex-1">
              <span className="sr-only">Mobile number</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                value={formatPhone(digits)}
                onChange={(e) => {
                  setDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setError("");
                }}
                placeholder="98765 43210"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "phone-error" : undefined}
                className="ledger min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-base tracking-wide"
              />
            </label>
          </div>

          {error && (
            <p id="phone-error" className="mt-2 text-xs text-alert">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </Button>

          <p className="mt-4 text-2xs text-ink-muted">
            By continuing you agree to our{" "}
            <Link href="/legal/terms" className="text-link hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="text-link hover:underline">
              privacy policy
            </Link>
            . Browsing never needs an account — only publishing does.
          </p>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <p className="mt-2 text-sm text-ink-muted">
            Sent to{" "}
            <span className="ledger text-ink">
              +91 {maskPhone(challenge?.phone ?? "")}
            </span>
            .
          </p>

          <label className="mt-6 block">
            <span className="sr-only">
              {OTP_LENGTH}-digit verification code
            </span>
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
                setError("");
              }}
              placeholder="······"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "code-error" : undefined}
              className="ledger min-h-14 w-full rounded-input border border-rule bg-surface px-4 text-center text-2xl tracking-[0.5em]"
            />
          </label>

          {error && (
            <p id="code-error" className="mt-2 text-xs text-alert">
              {error}
            </p>
          )}

          {challenge?.devCode && (
            <p className="mt-3 rounded-input border-l-2 border-flag bg-flag-tint/60 px-3 py-2 text-xs">
              No SMS gateway is wired up yet, so the API returned the code:{" "}
              <span className="ledger font-medium">{challenge.devCode}</span>.
            </p>
          )}

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={busy || code.length !== OTP_LENGTH}
          >
            {busy ? "Checking…" : "Verify and continue"}
          </Button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setPhase("phone");
                setError("");
                setCode("");
              }}
              className="text-link hover:underline"
            >
              Change number
            </button>
            {secondsLeft > 0 ? (
              <span className="text-ink-muted">
                Resend in <span className="ledger">{secondsLeft}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => send()}
                className="text-link hover:underline"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
