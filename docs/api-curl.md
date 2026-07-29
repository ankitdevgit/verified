# VerifiedViews — curl for every endpoint

Companion to [api-reference.md](api-reference.md). Same numbering.

> **These need a real backend.** `lib/api/mock-transport.ts` is an in-process
> function swapped into the client — it has no HTTP surface, so nothing here can
> be pointed at the dev server. Run them against a deployment, or against
> whatever stands up `/v1` locally.

## Setup

```bash
export VV_BASE="https://api.verifiedviews.in/v1"
export VV_DEVICE="$(uuidgen)"
export VV_APP="1.0.0 (web)"
export VV_TOKEN=""          # filled in by 1.2 below
export VV_BIZ="01J8RUBY"    # a business id or slug
```

Two helpers, so the examples below stay readable:

```bash
# Authenticated JSON call: vvc GET /me   ·   vvc POST /reviews '{"…":"…"}'
vvc() {
  local method="$1" path="$2" body="${3:-}"
  curl -sS -X "$method" "$VV_BASE$path" \
    -H "Accept: application/json" \
    -H "X-App-Version: $VV_APP" \
    -H "X-Device-Id: $VV_DEVICE" \
    -H "Authorization: Bearer $VV_TOKEN" \
    ${body:+-H "Content-Type: application/json" -d "$body"}
}

# Same, plus a fresh Idempotency-Key — every unsafe write needs one.
vvw() {
  local method="$1" path="$2" body="${3:-}"
  curl -sS -X "$method" "$VV_BASE$path" \
    -H "Accept: application/json" \
    -H "X-App-Version: $VV_APP" \
    -H "X-Device-Id: $VV_DEVICE" \
    -H "Authorization: Bearer $VV_TOKEN" \
    -H "Idempotency-Key: $(uuidgen)" \
    ${body:+-H "Content-Type: application/json" -d "$body"}
}
```

Every call below is written out in full anyway, so the helpers are optional.

---

## 1. Auth

Auth calls are **anonymous** — no `Authorization`, no `X-Device-Id` (the device
travels inside the verify body instead).

### 1.1 Request an OTP

```bash
curl -sS -X POST "$VV_BASE/auth/otp/request" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -d '{"phone":"9822012345"}'
```

### 1.2 Verify it — and capture the token

```bash
curl -sS -X POST "$VV_BASE/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -d "{
        \"request_id\": \"otp_9822012345_0\",
        \"code\": \"482913\",
        \"device\": {
          \"device_id\": \"$VV_DEVICE\",
          \"platform\": \"web\",
          \"app_version\": \"$VV_APP\"
        }
      }"
```

To put the access token straight into the environment:

```bash
export VV_TOKEN=$(curl -sS -X POST "$VV_BASE/auth/otp/verify" \
  -H "Content-Type: application/json" -H "X-App-Version: $VV_APP" \
  -d "{\"request_id\":\"otp_9822012345_0\",\"code\":\"482913\",\"device\":{\"device_id\":\"$VV_DEVICE\",\"platform\":\"web\",\"app_version\":\"$VV_APP\"}}" \
  | jq -r .access_token)
```

### 1.3 Refresh

```bash
curl -sS -X POST "$VV_BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -d '{"refresh_token":"'"$VV_REFRESH"'"}'
```

### 1.4 Log out

```bash
curl -sS -X POST "$VV_BASE/auth/logout" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -i
```

`-i` because the success case is a bodyless `204`.

---

## 2. Users

### 2.1 Who am I

```bash
curl -sS "$VV_BASE/me" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 2.2 My reviews

```bash
curl -sS -G "$VV_BASE/me/reviews" \
  --data-urlencode "cursor=" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 2.3 My receipt vault

```bash
curl -sS "$VV_BASE/me/receipts" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 2.4 Delete one from the vault

```bash
curl -sS -X DELETE "$VV_BASE/me/receipts/01J9RC01" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -i
```

---

## 3. Discovery

These are readable without a token, but the client still sends `X-Device-Id`.

### 3.1 Categories

```bash
curl -sS "$VV_BASE/categories" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

### 3.2 Treatment taxonomy

```bash
curl -sS "$VV_BASE/treatments" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

Only the shape, without ~400 procedures scrolling past:

```bash
curl -sS "$VV_BASE/treatments" -H "X-Device-Id: $VV_DEVICE" \
  | jq '.data[] | {categoryName, specialities: [.specialities[].specialityName]}'
```

### 3.3 Search

```bash
curl -sS -G "$VV_BASE/search" \
  --data-urlencode "q=cardiology" \
  --data-urlencode "category=hospitals" \
  --data-urlencode "city=Pune" \
  --data-urlencode "min_rating=4" \
  --data-urlencode "cost_band=3" \
  --data-urlencode "speciality=Cardiology" \
  --data-urlencode "min_verified=5" \
  --data-urlencode "sort=verified" \
  --data-urlencode "limit=20" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

Geo variant — `lat`/`lng`/`radius` (metres) instead of `city`:

```bash
curl -sS -G "$VV_BASE/search" \
  --data-urlencode "lat=18.53" --data-urlencode "lng=73.87" --data-urlencode "radius=5000" \
  -H "X-Device-Id: $VV_DEVICE"
```

### 3.4 One business

```bash
curl -sS "$VV_BASE/businesses/ruby-hall-clinic" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

Id or slug both work.

### 3.5 Its reviews

```bash
curl -sS -G "$VV_BASE/businesses/ruby-hall-clinic/reviews" \
  --data-urlencode "tier=verified" \
  --data-urlencode "sort=helpful" \
  --data-urlencode "limit=10" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

`tier=all` for the profile's "All" tab; add `aspect=cleanliness` to filter.

---

## 4. Receipts

The whole ladder, in order. Every step needs a token.

### 4.1 Ask for an upload slot

```bash
curl -sS -X POST "$VV_BASE/receipts/upload-intent" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"business_id\":\"$VV_BIZ\",\"mime\":\"image/jpeg\",\"byte_size\":$(stat -f%z bill.jpg)}"
```

`stat -f%z` is the macOS spelling; Linux wants `stat -c%s`.

### 4.2 PUT the bytes to object storage

Not the API — a signed URL, and the `headers` from 4.1 verbatim.

```bash
curl -sS -X PUT "https://s3…signed…" \
  -H "Content-Type: image/jpeg" \
  --upload-file bill.jpg
```

Chaining 4.1 → 4.2 so the URL never has to be pasted by hand:

```bash
INTENT=$(curl -sS -X POST "$VV_BASE/receipts/upload-intent" \
  -H "Content-Type: application/json" -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"business_id\":\"$VV_BIZ\",\"mime\":\"image/jpeg\",\"byte_size\":$(stat -f%z bill.jpg)}")

export VV_RECEIPT=$(echo "$INTENT" | jq -r .receipt_id)

curl -sS -X PUT "$(echo "$INTENT" | jq -r .upload_url)" \
  -H "Content-Type: $(echo "$INTENT" | jq -r '.headers["Content-Type"]')" \
  --upload-file bill.jpg
```

### 4.3 Kick off OCR

```bash
curl -sS -X POST "$VV_BASE/receipts/$VV_RECEIPT/process" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 4.4 Poll until it settles

```bash
curl -sS "$VV_BASE/receipts/$VV_RECEIPT" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

The client backs off 1.5s → 6s with a 60s ceiling. The same loop in shell:

```bash
until [ "$(curl -sS "$VV_BASE/receipts/$VV_RECEIPT" \
            -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN" \
            | jq -r .status)" != "processing" ]; do sleep 2; done
```

### 4.5 Blur more fields

```bash
curl -sS -X POST "$VV_BASE/receipts/$VV_RECEIPT/redactions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"boxes":[{"x":0.12,"y":0.30,"w":0.40,"h":0.05}]}'
```

Coordinates are normalised 0–1, taken from `redaction.fields[].box`.

### 4.6 Confirm a `partial`

```bash
curl -sS -X POST "$VV_BASE/receipts/$VV_RECEIPT/confirm" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d "{\"business_id\":\"$VV_BIZ\",\"txn_date\":\"2026-03-14\",\"total_amount\":4230000}"
```

`total_amount` in paise — ₹42,300.00.

### 4.7 Delete it

```bash
curl -sS -X DELETE "$VV_BASE/receipts/$VV_RECEIPT" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -i
```

---

## 5. Reviews

### 5.1 Publish one

```bash
curl -sS -X POST "$VV_BASE/reviews" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{
        \"business_id\": \"$VV_BIZ\",
        \"receipt_id\": \"$VV_RECEIPT\",
        \"rating\": 4,
        \"aspect_ratings\": { \"cleanliness\": 5, \"staff\": 4 },
        \"title\": \"Clear billing, long wait\",
        \"body\": \"Angioplasty went smoothly. Billing was itemised without asking.\",
        \"structured\": {
          \"treatment_category\": \"Surgical Treatment\",
          \"treatment_speciality\": \"Cardiology\",
          \"treatment_procedure\": \"Angioplasty\",
          \"wait_time\": 45
        },
        \"media_ids\": [],
        \"is_anonymous\": false,
        \"language\": \"en\"
      }"
```

Drop `receipt_id` for an unverified review — everything else is unchanged.

### 5.2 Read one

```bash
curl -sS "$VV_BASE/reviews/rev_01J" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

### 5.3 Mark helpful

```bash
curl -sS -X POST "$VV_BASE/reviews/rev_01J/vote" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"value":1}'
```

`1` helpful · `-1` not helpful · `0` clears.

### 5.4 Report it

```bash
curl -sS -X POST "$VV_BASE/reviews/rev_01J/report" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"reason":"not_a_real_visit","detail":"No record of this patient."}'
```

### 5.5 Reply as the business

```bash
curl -sS -X POST "$VV_BASE/reviews/rev_01J/replies" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"body":"Thank you — we have added a second billing counter."}'
```

### 5.6 Dispute it as the business

```bash
curl -sS -X POST "$VV_BASE/reviews/rev_01J/dispute" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"reason":"no_record_of_visit","detail":"No admission on that date."}'
```

---

## 6. Business owner

### 6.1 Claim a business

```bash
curl -sS -X POST "$VV_BASE/business/claims" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d "{
        \"business_id\": \"$VV_BIZ\",
        \"method\": \"gstin\",
        \"evidence\": { \"gstin\": \"27AAACR1234A1Z5\" },
        \"contact_email\": \"ops@rubyhall.com\",
        \"contact_phone\": \"+912066455000\",
        \"role\": \"Marketing lead\"
      }"
```

`method` ∈ `gstin` · `phone` · `document`.

### 6.2 Dashboard overview

```bash
curl -sS "$VV_BASE/business/$VV_BIZ/overview" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 6.3 Reviews awaiting a reply

```bash
curl -sS -G "$VV_BASE/business/$VV_BIZ/reviews" \
  --data-urlencode "needs_reply=true" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 6.4 Insights

```bash
curl -sS -G "$VV_BASE/business/$VV_BIZ/insights" \
  --data-urlencode "range=90d" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN"
```

### 6.5 Edit the profile

```bash
curl -sS -X PATCH "$VV_BASE/business/$VV_BIZ/profile" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-App-Version: $VV_APP" \
  -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" \
  -d '{"hours":"Open 24 hours","descriptor":"Multispecialty"}'
```

Partial — send only the keys that change.

---

## 7. Additions the client already calls

### 7.1 Platform counter

```bash
curl -sS -G "$VV_BASE/stats/platform" \
  --data-urlencode "city=pune" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

### 7.2 Featured reviews

```bash
curl -sS -G "$VV_BASE/reviews/featured" \
  --data-urlencode "limit=3" \
  --data-urlencode "city=pune" \
  --data-urlencode "category=hospitals" \
  --data-urlencode "window=30d" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

### 7.3 Cities

```bash
curl -sS "$VV_BASE/cities" \
  -H "Accept: application/json" -H "X-App-Version: $VV_APP" -H "X-Device-Id: $VV_DEVICE"
```

---

## 8. Proposed — these will 404 today

Written out so they can be tried the day they land.

```bash
# 8.1 Media upload, mirroring the receipt ladder
curl -sS -X POST "$VV_BASE/media/upload-intent" \
  -H "Content-Type: application/json" -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"kind":"review_photo","mime":"image/jpeg","byte_size":1842301}'

curl -sS -X POST "$VV_BASE/media/01JA/process" \
  -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN"

curl -sS "$VV_BASE/media/01JA" \
  -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN"

# 8.2 Measured cost histogram, instead of one inferred from quartiles
curl -sS -G "$VV_BASE/businesses/$VV_BIZ/cost-histogram" \
  --data-urlencode "bins=5" -H "X-Device-Id: $VV_DEVICE"

# 8.3 Filter options for a listing, in one call instead of two searches
curl -sS -G "$VV_BASE/businesses/facets" \
  --data-urlencode "category=hospitals" --data-urlencode "city=pune" \
  -H "X-Device-Id: $VV_DEVICE"

# 8.4 UPI / card fallback
curl -sS -X POST "$VV_BASE/receipts/transaction-ref" \
  -H "Content-Type: application/json" -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"business_id\":\"$VV_BIZ\",\"reference\":\"426512345678\",\"method\":\"upi\",\"amount\":4230000,\"txn_date\":\"2026-03-14\"}"

# 8.5 Per-user email forwarding address
curl -sS "$VV_BASE/receipts/forward-address" \
  -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN"

# 8.6 Appeal a rejected review
curl -sS -X POST "$VV_BASE/me/reviews/rev_01J/appeal" \
  -H "Content-Type: application/json" -H "X-Device-Id: $VV_DEVICE" \
  -H "Authorization: Bearer $VV_TOKEN" -H "Idempotency-Key: $(uuidgen)" \
  -d '{"message":"The name I mentioned is the hospital'\''s, not an individual'\''s."}'

curl -sS "$VV_BASE/me/reviews/rev_01J/appeal" \
  -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN"

# 8.7 Q&A (Phase 2)
curl -sS "$VV_BASE/businesses/$VV_BIZ/questions" -H "X-Device-Id: $VV_DEVICE"
```

---

## Reading the failures

```bash
curl -sS -i "$VV_BASE/businesses/does-not-exist" -H "X-Device-Id: $VV_DEVICE"
```

`-i` keeps the headers, which is where `X-RateLimit-Reset` lives on a `429` — the
body carries `retry_after` only once the addition in §8 of the reference lands.
For a readable error while scripting:

```bash
curl -sS "$VV_BASE/receipts/$VV_RECEIPT" \
  -H "X-Device-Id: $VV_DEVICE" -H "Authorization: Bearer $VV_TOKEN" \
  | jq -r '.error | "\(.code): \(.message)  [\(.request_id)]"'
```

A `business_mismatch` also carries `error.suggested_business` — the id to retry
4.6 with.
