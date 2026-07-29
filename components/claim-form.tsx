"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { createClaim } from "@/lib/api/endpoints";
import { errorCopy } from "@/lib/api/errors";
import "@/lib/api/mock-transport";
import type { Business } from "@/lib/types";

/** POST /business/claims — `{business_id, method, evidence}`, §8.6. */
export function ClaimForm({ businesses }: { businesses: Business[] }) {
  const [businessId, setBusinessId] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-card border border-seal/40 bg-seal-tint/50 p-6">
        <p className="font-display text-lg">Claim submitted.</p>
        <p className="mt-2 text-sm text-ink-muted">
          We&apos;ll email you at each stage. A human approves every claim, so
          this usually lands inside a working day. Claiming doesn&apos;t change
          any score, and doesn&apos;t give you access to any reviewer&apos;s
          identity or receipt.
        </p>
      </div>
    );
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!businessId || !gstin || !email) {
      setError(
        "Business, registration number and a work email are all needed.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createClaim({
        business_id: businessId,
        method: "gstin",
        evidence: { gstin },
        contact_email: email,
        contact_phone: phone || undefined,
        role: role || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(errorCopy(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-4 border-t border-rule pt-6 sm:grid-cols-2"
      onSubmit={submit}
      noValidate
    >
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium">
          Your listing <span className="text-ink-muted">· required</span>
        </span>
        <select
          value={businessId}
          onChange={(e) => {
            setBusinessId(e.target.value);
            setError("");
          }}
          className="select-field mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm"
        >
          <option value="">Find your business…</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.area}, {b.city}
              {b.claimed ? " (already claimed)" : ""}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="GSTIN or registration number"
        value={gstin}
        onChange={setGstin}
        required
        ledger
      />
      <Field
        label="Your work email"
        value={email}
        onChange={setEmail}
        type="email"
        required
      />
      <Field
        label="Phone on the listing"
        value={phone}
        onChange={setPhone}
        type="tel"
        ledger
      />
      <Field label="Your role" value={role} onChange={setRole} />

      {error && (
        <p className="rounded-input border-l-2 border-alert bg-alert-tint/60 px-4 py-3 text-sm sm:col-span-2">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit claim"}
        </Button>
        <p className="mt-3 text-xs text-ink-muted">
          We&apos;ll email you at each stage. Claiming a listing doesn&apos;t
          change any score, and doesn&apos;t give you access to any
          reviewer&apos;s identity or receipt.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  ledger = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  ledger?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">
        {label}
        {required && <span className="text-ink-muted"> · required</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm ${
          ledger ? "ledger" : ""
        }`}
      />
    </label>
  );
}
