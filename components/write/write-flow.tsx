"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Seal } from "@/components/seal";
import { StarInput } from "@/components/star-input";
import { VerificationBadge } from "@/components/verification-badge";
import { Button, Card } from "@/components/ui";
import { PhoneGate } from "./phone-gate";
import { setPhoneSession, usePhoneSession } from "./use-phone-session";
import { maskPhone } from "@/lib/auth";
import {
  confirmReceipt,
  createReview,
  createUploadIntent,
  deleteReceipt,
  pollReceipt,
  processReceipt,
  setReceiptRedactions,
  uploadReceiptBytes,
} from "@/lib/api/endpoints";
import { newIdempotencyKey } from "@/lib/api/client";
import { errorCopy, isApiError } from "@/lib/api/errors";
import { paiseToRupees } from "@/lib/api/adapters";
import "@/lib/api/mock-transport";
import type { ReceiptDto, RedactionFieldDto } from "@/lib/api/types";
import { formatDate, formatRupees } from "@/lib/format";
import { SITE } from "@/lib/site";
import {
  OTHER_PROCEDURE,
  TREATMENT_LEVEL_LABELS,
  treatmentKeys,
} from "@/lib/treatments";
import type { Business, Category, TreatmentCategory } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* §6.1 — the receipt step comes BEFORE writing. Asking for proof after someone */
/* has typed 300 words is how you lose them, and the extraction pre-fills the   */
/* place, date and amount, so the ask pays for itself immediately.              */
/*                                                                              */
/* The upload follows §8.4 exactly: upload-intent → PUT bytes straight to       */
/* object storage → process → poll. Bytes never pass through this app.          */
/* -------------------------------------------------------------------------- */

type Step = 1 | 2 | 3 | 4;

type BillState =
  | { kind: "none" }
  | { kind: "uploading"; fileName: string }
  | { kind: "reading"; fileName: string; receiptId: string }
  | { kind: "failed"; fileName: string; reason: string }
  | { kind: "read"; fileName: string; receipt: ReceiptDto }
  | { kind: "skipped" };

const MAX_CHARS = 2000;
const MAX_UPLOAD_MB = 12;

export function WriteFlow({
  businesses,
  categories,
  treatments,
  initialPlaceSlug,
}: {
  businesses: Business[];
  categories: Category[];
  /** The `GET /treatments` taxonomy, fetched alongside the place names. */
  treatments: TreatmentCategory[];
  initialPlaceSlug?: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [placeSlug, setPlaceSlug] = useState(initialPlaceSlug ?? "");
  const [bill, setBill] = useState<BillState>({ kind: "none" });
  const [redacted, setRedacted] = useState<Set<string>>(new Set());
  const [overall, setOverall] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [published, setPublished] = useState<{
    tier: string;
    url: string;
  } | null>(null);
  const [offline, setOffline] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);

  // One key for the whole attempt, so a retry after a timeout replays the
  // original response instead of double-publishing — §7 idempotency.
  const idempotencyKey = useRef(newIdempotencyKey());

  // Publishing needs a verified number; browsing never does.
  const phone = usePhoneSession();

  const place = businesses.find((b) => b.slug === placeSlug);
  const category = categories.find((c) => c.slug === place?.categorySlug);

  // §9.4 — "You're offline. Your draft is saved."
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const tier: "verified" | "partial" | "unverified" =
    bill.kind === "read"
      ? bill.receipt.status === "verified"
        ? "verified"
        : "partial"
      : "unverified";

  async function publish() {
    if (!place) return;
    setPublishing(true);
    setPublishError("");
    try {
      const result = await createReview(
        {
          business_id: place.id,
          receipt_id: bill.kind === "read" ? bill.receipt.id : undefined,
          rating: overall,
          aspect_ratings: aspects,
          body: text.trim(),
          structured: coerceFields(fields, category),
          is_anonymous: anonymous,
          language: "en",
        },
        idempotencyKey.current,
      );
      setPublished({ tier: result.verification_tier, url: result.public_url });
    } catch (err) {
      setPublishError(errorCopy(err));
    } finally {
      setPublishing(false);
    }
  }

  /**
   * "Write another" can't be a link to /write — that's the route we're already
   * on, so the navigation is a no-op and the success screen just sits there.
   * The flow's state lives in this component, so starting over means clearing
   * it here, including a fresh idempotency key: reusing the old one would make
   * the server replay the review that was just published instead of taking a
   * new one.
   */
  function startAnother() {
    setStep(1);
    setPlaceSlug("");
    setBill({ kind: "none" });
    setRedacted(new Set());
    setOverall(0);
    setAspects({});
    setFields({});
    setText("");
    setAnonymous(false);
    setPublished(null);
    setPublishError("");
    idempotencyKey.current = newIdempotencyKey();
  }

  if (published && place) {
    return (
      <Published
        onWriteAnother={startAnother}
        place={place}
        tier={published.tier}
        amount={
          bill.kind === "read" && bill.receipt.extracted?.total_amount
            ? paiseToRupees(bill.receipt.extracted.total_amount)
            : null
        }
      />
    );
  }

  if (!phone) {
    return <PhoneGate onVerified={setPhoneSession} />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-input border border-rule bg-surface px-4 py-2.5 text-xs">
        <span className="flex items-center gap-2">
          <Seal size={15} className="stamp text-seal" />
          Verified as <span className="ledger">+91 {maskPhone(phone)}</span>
        </span>
        <button
          type="button"
          onClick={() => setPhoneSession(null)}
          className="text-link hover:underline"
        >
          Not you?
        </button>
      </div>

      <StepRail step={step} />

      {offline && (
        <p className="mt-4 rounded-input border-l-2 border-flag bg-flag-tint/60 px-4 py-3 text-sm">
          You&apos;re offline. Your draft is saved — we&apos;ll publish when
          you&apos;re back.
        </p>
      )}

      <div className="mt-6">
        {step === 1 && (
          <StepReceipt
            businesses={businesses}
            placeSlug={placeSlug}
            onPlaceChange={setPlaceSlug}
            bill={bill}
            setBill={setBill}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepRedact
            bill={bill}
            redacted={redacted}
            setRedacted={setRedacted}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onDiscard={async () => {
              if (bill.kind === "read") {
                await deleteReceipt(bill.receipt.id).catch(() => {});
              }
              setBill({ kind: "none" });
              setStep(1);
            }}
          />
        )}

        {step === 3 && category && place && (
          <StepRate
            place={place}
            category={category}
            treatments={treatments}
            overall={overall}
            setOverall={setOverall}
            aspects={aspects}
            setAspects={setAspects}
            fields={fields}
            setFields={setFields}
            bill={bill}
            onBack={() => setStep(bill.kind === "read" ? 2 : 1)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && place && (
          <StepWrite
            place={place}
            tier={tier}
            text={text}
            setText={setText}
            anonymous={anonymous}
            setAnonymous={setAnonymous}
            busy={publishing}
            error={publishError}
            onBack={() => setStep(3)}
            onPublish={publish}
          />
        )}
      </div>
    </div>
  );
}

/** Structured answers go to the API typed, not as strings from the inputs. */
function coerceFields(
  raw: Record<string, string>,
  category?: Category,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === "") continue;
    const field = category?.fields.find((f) => f.key === key);
    if (field?.type === "number") out[key] = Number(value);
    else if (field?.type === "boolean") out[key] = value === "yes";
    else out[key] = value;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Step rail                                                                   */
/* -------------------------------------------------------------------------- */

const STEP_LABELS = [
  "Add your bill",
  "What we'll keep",
  "Rate it",
  "Your review",
];

function StepRail({ step }: { step: Step }) {
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 ${
              state === "current"
                ? "border-seal bg-seal-tint text-seal"
                : state === "done"
                  ? "border-rule bg-surface text-ink-muted"
                  : "border-dashed border-rule text-ink-muted/70"
            }`}
          >
            <span className="ledger">{n}/4</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — receipt capture (§7.4 of the design doc, §8.4 of the API spec)      */
/* -------------------------------------------------------------------------- */

function StepReceipt({
  businesses,
  placeSlug,
  onPlaceChange,
  bill,
  setBill,
  onNext,
}: {
  businesses: Business[];
  placeSlug: string;
  onPlaceChange: (slug: string) => void;
  bill: BillState;
  setBill: (b: BillState) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState<{
    billedName: string;
    billedSlug?: string;
  } | null>(null);
  const place = businesses.find((b) => b.slug === placeSlug);

  /**
   * Clearing the input matters: after a failed read, picking the very same
   * file again fires no `change` event, so the retry silently does nothing.
   */
  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  }

  async function handleFile(file: File | undefined) {
    if (!file || !place) return;
    setMismatch(null);

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setBill({
        kind: "failed",
        fileName: file.name,
        reason: `That file is over ${MAX_UPLOAD_MB}MB. Retake it, or upload a smaller photo.`,
      });
      return;
    }

    setBill({ kind: "uploading", fileName: file.name });

    try {
      const intent = await createUploadIntent({
        business_id: place.id,
        mime: file.type,
        byte_size: file.size,
      });
      await uploadReceiptBytes(intent, file);

      setBill({
        kind: "reading",
        fileName: file.name,
        receiptId: intent.receipt_id,
      });

      await processReceipt(intent.receipt_id);
      const receipt = await pollReceipt(intent.receipt_id);

      if (receipt.status === "rejected" || receipt.status === "failed") {
        setBill({
          kind: "failed",
          fileName: file.name,
          reason:
            "Retake it in better light, or continue without a bill and post unverified.",
        });
        return;
      }

      setBill({ kind: "read", fileName: file.name, receipt });
    } catch (err) {
      // §7 gives us specific codes for the two failures that matter most here.
      if (isApiError(err, "business_mismatch")) {
        setMismatch({
          billedName: err.suggestedBusiness?.name ?? "somewhere else",
          billedSlug: err.suggestedBusiness?.slug,
        });
        setBill({ kind: "none" });
        return;
      }
      setBill({ kind: "failed", fileName: file.name, reason: errorCopy(err) });
    }
  }

  const busy = bill.kind === "uploading" || bill.kind === "reading";

  return (
    <Card className="p-6">
      <h2 className="text-lg">Add your bill</h2>
      <p className="mt-1 text-sm text-ink-muted">
        We read the merchant name, date and total off it — so you don&apos;t
        have to type them.
      </p>

      <label className="mt-6 block">
        <span className="text-xs font-medium">Where did you go?</span>
        <select
          value={placeSlug}
          onChange={(e) => onPlaceChange(e.target.value)}
          className="select-field mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm"
        >
          <option value="">Pick a place…</option>
          {businesses.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name} — {b.area}, {b.city}
            </option>
          ))}
        </select>
      </label>

      {place && (
        <>
          <div className="mt-6 rounded-card border border-dashed border-rule bg-sunk p-8 text-center">
            {busy ? (
              <>
                <p className="text-sm font-medium">
                  {bill.kind === "uploading"
                    ? "Uploading your bill…"
                    : "Reading your bill…"}
                </p>
                <div
                  className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-pill bg-rule"
                  role="progressbar"
                  aria-label="Reading your bill"
                >
                  <div className="h-full w-1/2 rounded-pill bg-seal" />
                </div>
                <p className="ledger mt-3 text-2xs text-ink-muted">
                  {bill.fileName}
                </p>
                <button
                  type="button"
                  onClick={() => setBill({ kind: "none" })}
                  className="mt-4 text-xs text-link hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : bill.kind === "read" ? (
              <>
                <Seal size={36} className="stamp-press mx-auto text-seal" />
                <p className="mt-3 text-sm font-medium">
                  {bill.receipt.extracted?.merchant ?? place.name}
                </p>
                <p className="ledger mt-1 text-sm">
                  {bill.receipt.extracted?.total_amount
                    ? formatRupees(
                        paiseToRupees(bill.receipt.extracted.total_amount),
                      )
                    : "—"}{" "}
                  ·{" "}
                  {bill.receipt.extracted?.txn_date
                    ? formatDate(bill.receipt.extracted.txn_date)
                    : "date unread"}
                </p>
                {bill.receipt.match && (
                  <p className="ledger mt-2 text-2xs text-ink-muted">
                    match {Math.round(bill.receipt.match.score * 100)}% ·{" "}
                    {bill.receipt.match.reasons.join(", ")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setBill({ kind: "none" })}
                  className="mt-4 text-xs text-link hover:underline"
                >
                  Use a different bill
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-muted">
                  Hold the bill flat and fill the frame. Photo or PDF, up to{" "}
                  <span className="ledger">{MAX_UPLOAD_MB}MB</span>.
                </p>
                {/* Two inputs, not one. `capture` is a demand, not a hint:
                    iOS Safari opens the camera and drops Photo Library and
                    Files from the sheet entirely, so a single capture input
                    leaves anyone with an already-photographed or emailed bill
                    stuck. The camera path keeps `capture`; the upload path
                    must not have it. */}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={pickFile}
                />
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={pickFile}
                />
                {/* The show/hide sits on wrappers, not on the buttons: `Button`
                    already carries `inline-flex`, and Tailwind emits that after
                    `.hidden`, so a `hidden` passed through className loses. */}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {/* `capture` only means anything on a phone. A desktop
                      browser ignores it and opens the ordinary file dialog, so
                      a "Take a photo" button there is a promise the platform
                      will not keep — show it only where a camera sheet exists. */}
                  <span className="hidden pointer-coarse:contents">
                    <Button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                    >
                      Take a photo
                    </Button>
                  </span>
                  {/* Same action, two weights: on a phone it sits behind the
                      camera, on a desktop it is the only way in. */}
                  <span className="contents pointer-coarse:hidden">
                    <Button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                    >
                      Upload a file
                    </Button>
                  </span>
                  <span className="hidden pointer-coarse:contents">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => inputRef.current?.click()}
                    >
                      Upload a file
                    </Button>
                  </span>
                </div>
              </>
            )}
          </div>

          {bill.kind === "failed" && (
            <p className="mt-4 rounded-input border-l-2 border-alert bg-alert-tint/60 px-4 py-3 text-sm">
              We couldn&apos;t read this bill. {bill.reason}
            </p>
          )}

          {mismatch && (
            <div className="mt-4 rounded-input border-l-2 border-alert bg-alert-tint/60 px-4 py-3 text-sm">
              This bill looks like it&apos;s from{" "}
              <strong>{mismatch.billedName}</strong>, not {place.name}.
              <div className="mt-3 flex flex-wrap gap-3">
                {mismatch.billedSlug && (
                  <button
                    type="button"
                    onClick={() => {
                      onPlaceChange(mismatch.billedSlug!);
                      setMismatch(null);
                    }}
                    className="text-link hover:underline"
                  >
                    Switch to {mismatch.billedName}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setBill({ kind: "skipped" });
                    setMismatch(null);
                  }}
                  className="text-link hover:underline"
                >
                  Keep {place.name} and post unverified
                </button>
              </div>
            </div>
          )}

          {/* §6.1 fallback ladder — never dead-end a real user. */}
          <div className="mt-6 border-t border-rule pt-5">
            <p className="text-xs font-medium">No bill handy?</p>
            <ul className="mt-2 space-y-2 text-xs text-ink-muted">
              <li>
                Forward the email receipt to{" "}
                <span className="ledger text-ink">{SITE.billsEmail}</span> —
                we&apos;ll match it to your account and notify you.
              </li>
              <li>
                Paste a UPI or card transaction ID and we&apos;ll try to match
                the merchant and amount.
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setBill({ kind: "skipped" })}
                  className="text-link hover:underline"
                >
                  Continue without a bill
                </button>{" "}
                — your review still publishes, with no seal and no weight in the
                score.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              onClick={onNext}
              disabled={bill.kind === "none" || busy || bill.kind === "failed"}
            >
              Continue
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — the trust-defining screen (§7.5)                                   */
/* -------------------------------------------------------------------------- */

function StepRedact({
  bill,
  redacted,
  setRedacted,
  onBack,
  onNext,
  onDiscard,
}: {
  bill: BillState;
  redacted: Set<string>;
  setRedacted: (r: Set<string>) => void;
  onBack: () => void;
  onNext: () => void;
  onDiscard: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const fields =
    bill.kind === "read" ? (bill.receipt.redaction?.fields ?? []) : [];

  // The server's auto-redaction is the starting point; the user's choices
  // layer on top of it and are what actually gets stored.
  useEffect(() => {
    if (bill.kind !== "read") return;
    setRedacted(
      new Set(
        (bill.receipt.redaction?.fields ?? [])
          .filter((f) => f.redacted)
          .map((f) => f.key),
      ),
    );
    // Only re-seed when a different receipt arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill.kind === "read" ? bill.receipt.id : null]);

  if (bill.kind !== "read") {
    return (
      <Card className="p-6">
        <h2 className="text-lg">No bill attached</h2>
        <p className="mt-2 text-sm text-ink-muted">
          You chose to continue without one. Your review will publish without a
          seal and won&apos;t count towards the headline score.
        </p>
        <div className="mt-6 flex justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onNext}>
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  function toggle(key: string) {
    const next = new Set(redacted);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setRedacted(next);
  }

  async function saveAndContinue() {
    setSaving(true);
    try {
      // POST /receipts/:id/redactions — boxes for everything the user chose.
      await setReceiptRedactions((bill as { receipt: ReceiptDto }).receipt.id, {
        boxes: fields
          .filter((f) => redacted.has(f.key) && f.box)
          .map((f) => f.box!),
      });
      onNext();
    } catch {
      // Redactions are additive and re-sendable; don't strand the user here.
      onNext();
    } finally {
      setSaving(false);
    }
  }

  const optional = fields.filter((f) => f.can_redact);
  const fixed = fields.filter((f) => !f.can_redact);

  return (
    <Card className="p-6">
      <h2 className="text-lg">What we&apos;ll keep</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Auto-redaction is a starting point, never the last word. Add anything
        else you want blurred.
      </p>

      <div className="perforated mt-6 bg-sunk">
        <div className="border-x border-rule px-5 py-6">
          <p className="ledger text-xs font-medium uppercase">
            {bill.receipt.extracted?.merchant ?? "Bill"}
          </p>
          <dl className="mt-4 space-y-2 text-xs">
            {optional.map((f) => (
              <BillLine
                key={f.key}
                field={f}
                redacted={redacted.has(f.key)}
                onToggle={() => toggle(f.key)}
              />
            ))}
            {fixed.map((f) => (
              <BillLine key={f.key} field={f} redacted={false} />
            ))}
          </dl>
        </div>
      </div>

      <p className="mt-6 rounded-input border-l-2 border-seal bg-seal-tint/60 px-4 py-3 text-sm">
        Your bill is never shown publicly — only the{" "}
        <span className="inline-flex items-center gap-1 align-middle">
          <Seal size={14} className="stamp text-seal" /> badge
        </span>{" "}
        is. The business never sees it, and neither does anyone else.
      </p>

      {bill.receipt.purge_after && (
        <p className="mt-3 text-xs text-ink-muted">
          The image itself is destroyed on{" "}
          <span className="ledger">{formatDate(bill.receipt.purge_after)}</span>
          . After that we keep only the extracted fields and the hash — enough
          to keep the badge valid and the bill un-reusable.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="destructive" onClick={onDiscard}>
            Cancel and delete bill
          </Button>
          <Button type="button" onClick={saveAndContinue} disabled={saving}>
            {saving ? "Saving…" : "Looks right — continue"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BillLine({
  field,
  redacted,
  onToggle,
}: {
  field: RedactionFieldDto;
  redacted: boolean;
  onToggle?: () => void;
}) {
  const display =
    field.key === "total_amount"
      ? formatRupees(paiseToRupees(Number(field.value)))
      : field.key === "txn_date"
        ? formatDate(field.value)
        : field.value;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-rule pb-2 last:border-b-0">
      <dt className="text-ink-muted">{field.label}</dt>
      <dd className="ledger flex items-center gap-2">
        {redacted ? (
          <span
            className="rounded-[2px] bg-ink/80 px-6 text-transparent select-none"
            aria-label={`${field.label} redacted`}
          >
            ████
          </span>
        ) : (
          <span>{display}</span>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="text-2xs text-link hover:underline"
          >
            {redacted ? "Show" : "Blur"}
          </button>
        )}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 — rate aspects + structured fields (§7.6)                            */
/* -------------------------------------------------------------------------- */

function StepRate({
  place,
  category,
  treatments,
  overall,
  setOverall,
  aspects,
  setAspects,
  fields,
  setFields,
  bill,
  onBack,
  onNext,
}: {
  place: Business;
  category: Category;
  treatments: TreatmentCategory[];
  overall: number;
  setOverall: (n: number) => void;
  aspects: Record<string, number>;
  setAspects: (a: Record<string, number>) => void;
  fields: Record<string, string>;
  setFields: (f: Record<string, string>) => void;
  bill: BillState;
  onBack: () => void;
  onNext: () => void;
}) {
  const extracted = bill.kind === "read" ? bill.receipt.extracted : null;
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // At most one per category — the taxonomy is one question asked three ways,
  // not three independent fields the config could multiply.
  const treatmentField = category.fields.find((f) => f.type === "treatment");

  const needsConfirm =
    bill.kind === "read" && bill.receipt.status === "partial";

  async function confirm() {
    if (bill.kind !== "read") return;
    setConfirming(true);
    setConfirmError("");
    try {
      await confirmReceipt(bill.receipt.id, { business_id: place.id });
    } catch (err) {
      setConfirmError(errorCopy(err));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg">Rate it</h2>
      <p className="mt-1 text-sm text-ink-muted">{place.name}</p>
      {extracted?.total_amount && extracted.txn_date && (
        <p className="ledger mt-1 flex items-center gap-2 text-sm">
          <Seal size={15} className="stamp text-seal" />
          {formatRupees(paiseToRupees(extracted.total_amount))} ·{" "}
          {formatDate(extracted.txn_date)}
        </p>
      )}

      {needsConfirm && (
        <div className="mt-4 rounded-input border-l-2 border-flag bg-flag-tint/60 px-4 py-3 text-sm">
          One field on this bill didn&apos;t match cleanly. Confirm it&apos;s
          from {place.name} and a moderator will finish the check — your review
          publishes either way, and picks up the seal when it clears.
          <div className="mt-3">
            <button
              type="button"
              onClick={confirm}
              disabled={confirming}
              className="text-link hover:underline"
            >
              {confirming ? "Confirming…" : `Yes, this is ${place.name}`}
            </button>
          </div>
          {confirmError && (
            <p className="mt-2 text-xs text-alert">{confirmError}</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium">Overall</p>
        <div className="mt-2">
          <StarInput
            name="overall"
            label="Overall rating"
            value={overall}
            onChange={setOverall}
          />
        </div>
      </div>

      <div className="mt-8 space-y-5 border-t border-rule pt-6">
        {category.aspects.map((a) => (
          <div
            key={a.key}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm">{a.label}</span>
            <StarInput
              name={a.key}
              label={a.label}
              size={26}
              value={aspects[a.key] ?? 0}
              onChange={(v) => setAspects({ ...aspects, [a.key]: v })}
            />
          </div>
        ))}
      </div>

      {treatmentField && (
        <div className="mt-8 border-t border-rule pt-6">
          <TreatmentPicker
            label={treatmentField.label}
            fieldKey={treatmentField.key}
            taxonomy={treatments}
            fields={fields}
            setFields={setFields}
          />
        </div>
      )}

      <div className="mt-8 grid gap-4 border-t border-rule pt-6 sm:grid-cols-2">
        {category.fields
          .filter((f) => f.type !== "currency" && f.type !== "treatment")
          .map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-medium">{f.label}</span>
              {f.type === "select" ? (
                <select
                  value={fields[f.key] ?? ""}
                  onChange={(e) =>
                    setFields({ ...fields, [f.key]: e.target.value })
                  }
                  className="select-field mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm"
                >
                  <option value="">Not sure</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <select
                  value={fields[f.key] ?? ""}
                  onChange={(e) =>
                    setFields({ ...fields, [f.key]: e.target.value })
                  }
                  className="select-field mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm"
                >
                  <option value="">Not sure</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  value={fields[f.key] ?? ""}
                  onChange={(e) =>
                    setFields({ ...fields, [f.key]: e.target.value })
                  }
                  className={`mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm ${
                    f.type === "number" ? "ledger" : ""
                  }`}
                />
              )}
            </label>
          ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={overall === 0}>
          Next
        </Button>
      </div>
      {overall === 0 && (
        <p className="mt-2 text-right text-xs text-ink-muted">
          Give an overall rating to continue.
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* The treatment picker — three levels, three stored fields                    */
/*                                                                              */
/* Category → speciality → procedure, straight from `GET /treatments`. Asking  */
/* it in three steps is what makes the answer comparable: "₹42,300 for an      */
/* angioplasty" can be grouped against every other angioplasty, where a        */
/* free-text "heart op" can be grouped against nothing.                        */
/* -------------------------------------------------------------------------- */

const SELECT_CLASS =
  "select-field mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm disabled:cursor-not-allowed disabled:bg-sunk disabled:text-ink-muted";

function TreatmentPicker({
  label,
  fieldKey,
  taxonomy,
  fields,
  setFields,
}: {
  label: string;
  fieldKey: string;
  taxonomy: TreatmentCategory[];
  fields: Record<string, string>;
  setFields: (f: Record<string, string>) => void;
}) {
  const keys = treatmentKeys(fieldKey);
  const categoryName = fields[keys.category] ?? "";
  const specialityName = fields[keys.speciality] ?? "";
  const procedure = fields[keys.procedure] ?? "";

  const category = taxonomy.find((c) => c.name === categoryName);
  const speciality = category?.specialities.find(
    (s) => s.name === specialityName,
  );
  const procedures = speciality?.procedures ?? [];

  // A stored value that isn't one of the listed procedures can only have come
  // from the "Others" box, so the state lives in the answer rather than in a
  // separate flag that a step back would lose.
  const isOther =
    procedure !== "" &&
    (procedure === OTHER_PROCEDURE || !procedures.includes(procedure));

  // Narrowing resets what it invalidates — a speciality from the old category
  // left in place would publish a combination that doesn't exist.
  function pickCategory(value: string) {
    setFields({
      ...fields,
      [keys.category]: value,
      [keys.speciality]: "",
      [keys.procedure]: "",
    });
  }

  function pickSpeciality(value: string) {
    setFields({ ...fields, [keys.speciality]: value, [keys.procedure]: "" });
  }

  function pickProcedure(value: string) {
    setFields({ ...fields, [keys.procedure]: value });
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <p className="mt-1 text-xs text-ink-muted">
        Three steps, so the next person can compare like with like. Skip it if
        you&apos;d rather not say.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium">
            {TREATMENT_LEVEL_LABELS.category}
          </span>
          <select
            value={categoryName}
            onChange={(e) => pickCategory(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Not sure</option>
            {taxonomy.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium">
            {TREATMENT_LEVEL_LABELS.speciality}
          </span>
          <select
            value={specialityName}
            disabled={!category}
            onChange={(e) => pickSpeciality(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">
              {category ? "Not sure" : "Pick a category first"}
            </option>
            {category?.specialities.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium">
            {TREATMENT_LEVEL_LABELS.procedure}
          </span>
          <select
            value={isOther ? OTHER_PROCEDURE : procedure}
            disabled={!speciality}
            onChange={(e) => pickProcedure(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">
              {speciality ? "Not sure" : "Pick a speciality first"}
            </option>
            {procedures.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {isOther && (
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium">
              What was it called on your bill?
            </span>
            <input
              type="text"
              maxLength={120}
              value={procedure === OTHER_PROCEDURE ? "" : procedure}
              placeholder="e.g. Neurology second opinion"
              onChange={(e) =>
                pickProcedure(e.target.value.trimStart() || OTHER_PROCEDURE)
              }
              className="mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm"
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 4 — write (§7.7)                                                       */
/* -------------------------------------------------------------------------- */

function StepWrite({
  place,
  tier,
  text,
  setText,
  anonymous,
  setAnonymous,
  busy,
  error,
  onBack,
  onPublish,
}: {
  place: Business;
  tier: "verified" | "partial" | "unverified";
  text: string;
  setText: (t: string) => void;
  anonymous: boolean;
  setAnonymous: (a: boolean) => void;
  busy: boolean;
  error: string;
  onBack: () => void;
  onPublish: () => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg">
        Your review{" "}
        <span className="font-sans text-sm font-normal text-ink-muted">
          · optional
        </span>
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        What should the next person know about {place.name}? You can publish the
        rating on its own — the bill is what makes it count.
      </p>

      <label className="mt-5 block">
        <span className="sr-only">Your review (optional)</span>
        <textarea
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="What went well, what didn't, and what you'd tell someone deciding tomorrow."
          className="w-full rounded-input border border-rule bg-surface p-3 text-sm"
        />
      </label>
      <p className="ledger mt-1 text-2xs text-ink-muted">
        {text.trim().length}/{MAX_CHARS} · optional
      </p>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="mt-1 size-4 accent-[var(--color-acc-blue)]"
        />
        <span className="text-sm">
          Post anonymously
          {tier !== "unverified" && (
            <span className="mt-0.5 block text-xs text-ink-muted">
              Your seal stays. Anonymous <em>and</em> provable — for healthcare
              that combination is the point.
            </span>
          )}
        </span>
      </label>

      <div className="mt-6 flex items-center gap-2 border-t border-rule pt-5">
        <span className="text-xs text-ink-muted">Publishes as</span>
        <VerificationBadge tier={tier} size="sm" linked={false} />
      </div>

      {error && (
        <p className="mt-4 rounded-input border-l-2 border-alert bg-alert-tint/60 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onPublish} disabled={busy}>
          {busy ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Published (§7.8)                                                            */
/* -------------------------------------------------------------------------- */

function Published({
  place,
  tier,
  amount,
  onWriteAnother,
}: {
  place: Business;
  tier: string;
  amount: number | null;
  onWriteAnother: () => void;
}) {
  return (
    <Card className="p-10 text-center">
      <Seal
        size={64}
        filled={tier === "verified"}
        className="stamp-press mx-auto text-seal"
      />
      <h2 className="mt-5 text-xl">
        {tier === "verified"
          ? "Verified and live"
          : tier === "partial"
            ? "Live — bill under review"
            : "Published"}
      </h2>
      {tier === "verified" ? (
        <p className="mt-2 text-sm text-ink-muted">
          Your bill matched
          {amount !== null && (
            <>
              {" "}
              — <span className="ledger text-ink">{formatRupees(amount)}</span>
            </>
          )}
          .
        </p>
      ) : tier === "partial" ? (
        <p className="mt-2 text-sm text-ink-muted">
          One field didn&apos;t match cleanly. A moderator is checking it, and
          the seal appears the moment it clears.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          Your review is live without a seal. Attach the bill any time and it
          starts counting towards the score.
        </p>
      )}
      <p className="mt-4 text-sm">
        <span className="ledger">{place.verifiedCount}</span> people have
        verified {place.name}.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href={`/b/${place.slug}`}
          className="btn-primary btn-lift inline-flex min-h-12 items-center rounded-input px-5 text-sm font-medium"
        >
          See your review
        </Link>
        <Button type="button" variant="secondary" onClick={onWriteAnother}>
          Write another
        </Button>
      </div>
    </Card>
  );
}
