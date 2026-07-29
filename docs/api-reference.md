# VerifiedViews — API reference (everything the web client calls)

**Base URL:** `https://api.verifiedviews.in/v1` (override with `NEXT_PUBLIC_API_BASE_URL`;
unset ⇒ `lib/api/mock-transport.ts` answers instead).

**Conventions — §7 of the backend spec, true for every call below**

| | |
|---|---|
| Media type | `application/json` in both directions |
| Keys | `snake_case` (one exception: `GET /treatments`, see §3.2) |
| Timestamps | UTC ISO-8601 |
| Money | integer **paise** — `4230000` = ₹42,300.00 |
| Pagination | cursor: `{ "data": [...], "next_cursor": string\|null, "has_more": bool }` |
| Empty success | `204 No Content` |

**Request headers**

```
Accept: application/json
Content-Type: application/json        # when a body is sent
X-App-Version: 1.0.0 (web)
X-Device-Id: <uuid>                   # omitted on `anonymous: true` calls
Authorization: Bearer <access_token>  # omitted on `anonymous: true` calls
Idempotency-Key: <uuid>               # every unsafe write
```

**Error envelope** — every non-2xx

```json
{
  "error": {
    "code": "receipt_duplicate",
    "message": "This bill has already been used for a review.",
    "field": "receipt_id",
    "request_id": "req_01J…",
    "docs": "https://…",
    "suggested_business": { "id": "01J8…", "name": "Ruby Hall Clinic", "slug": "ruby-hall-clinic", "confidence": 0.72 }
  }
}
```

`code` ∈ `unauthenticated` · `forbidden` · `not_found` · `validation_failed` ·
`rate_limited` · `receipt_duplicate` · `receipt_unreadable` · `business_mismatch` ·
`review_exists` · `content_rejected` · `conflict` · `internal`.
`suggested_business` appears only on `business_mismatch`. `429` also carries
`X-RateLimit-Reset`.

---

## Index

| # | Method | Path | Status |
|---|---|---|---|
| 1.1 | POST | `/auth/otp/request` | live |
| 1.2 | POST | `/auth/otp/verify` | live |
| 1.3 | POST | `/auth/refresh` | live |
| 1.4 | POST | `/auth/logout` | live |
| 2.1 | GET | `/me` | live |
| 2.2 | GET | `/me/reviews` | live |
| 2.3 | GET | `/me/receipts` | live |
| 2.4 | DELETE | `/me/receipts/:id` | live |
| 3.1 | GET | `/categories` | live |
| 3.2 | GET | `/treatments` | **addition (P0)** |
| 3.3 | GET | `/search` | live |
| 3.4 | GET | `/businesses/:idOrSlug` | live |
| 3.5 | GET | `/businesses/:idOrSlug/reviews` | live |
| 4.1 | POST | `/receipts/upload-intent` | live |
| 4.2 | PUT | `<upload_url>` (object storage) | live |
| 4.3 | POST | `/receipts/:id/process` | live |
| 4.4 | GET | `/receipts/:id` | live (+ `redaction.fields` addition) |
| 4.5 | POST | `/receipts/:id/redactions` | live |
| 4.6 | POST | `/receipts/:id/confirm` | live |
| 4.7 | DELETE | `/receipts/:id` | live |
| 5.1 | POST | `/reviews` | live |
| 5.2 | GET | `/reviews/:id` | live |
| 5.3 | POST | `/reviews/:id/vote` | live |
| 5.4 | POST | `/reviews/:id/report` | live |
| 5.5 | POST | `/reviews/:id/replies` | live |
| 5.6 | POST | `/reviews/:id/dispute` | live |
| 6.1 | POST | `/business/claims` | live |
| 6.2 | GET | `/business/:id/overview` | live |
| 6.3 | GET | `/business/:id/reviews` | live |
| 6.4 | GET | `/business/:id/insights` | live |
| 6.5 | PATCH | `/business/:id/profile` | live |
| 7.1 | GET | `/stats/platform` | **addition (P0)** |
| 7.2 | GET | `/reviews/featured` | **addition (P0)** |
| 7.3 | GET | `/cities` | **addition (P2)** |
| 8.x | — | media, cost-histogram, facets, transaction-ref, forward-address, appeals, Q&A | **proposed, not called yet** |

“live” = defined in `lib/api/endpoints.ts` and called by the app.
“addition” = the app calls it today against the mock; the backend spec doesn’t have it yet
(rationale in [api-additions.md](api-additions.md)).

---

## 1. Auth — §8.1

### 1.1 `POST /auth/otp/request` · anonymous

```json
{ "phone": "9822012345" }
```
→ `200`
```json
{ "request_id": "otp_9822012345_0", "expires_in": 300, "dev_code": "482913" }
```
`dev_code` non-production only. Errors: `422 validation_failed` (field `phone`),
`429 rate_limited`.

### 1.2 `POST /auth/otp/verify` · anonymous

```json
{
  "request_id": "otp_9822012345_0",
  "code": "482913",
  "device": { "device_id": "<uuid>", "platform": "web", "app_version": "1.0.0 (web)" }
}
```
→ `200`
```json
{
  "access_token": "…", "refresh_token": "…", "expires_in": 900,
  "is_new_user": true,
  "user": {
    "id": "u_9822012345", "phone_e164": "+919822012345", "display_name": null,
    "locale": "en-IN", "trust_level": 1, "verified_review_count": 0, "status": "active"
  }
}
```
`expires_in` = access-token seconds (15 min, §3). Errors: `404 not_found` (expired
challenge), `422 validation_failed` (field `code`).

### 1.3 `POST /auth/refresh` · anonymous

```json
{ "refresh_token": "…" }
```
→ same body as 1.2.

### 1.4 `POST /auth/logout`

No body → `204`.

---

## 2. Users — §8.2

### 2.1 `GET /me` → `MeDto`

```json
{ "id": "u_…", "phone_e164": "+919822012345", "display_name": "Rhea M.",
  "locale": "en-IN", "trust_level": 3, "verified_review_count": 7, "status": "active" }
```
`status` ∈ `active|suspended|deleted`.

### 2.2 `GET /me/reviews?cursor=` → `Page<Review>` (object shape in §5.2)

Should also carry `rejection_reason` (human) and `rejection_code` (machine, feeds the
appeal flow) on the author’s own view — see additions §6.

### 2.3 `GET /me/receipts?cursor=` → `Page<VaultReceipt>`

```json
{ "data": [{
    "id": "01J9RC01",
    "business": { "id": "01J8RUBY", "slug": "ruby-hall-clinic", "name": "Ruby Hall Clinic" },
    "total_amount": 4230000,
    "txn_date": "2026-03-14",
    "status": "verified",
    "consumed_by_review_id": "rev_01J…",
    "purge_after": "2026-09-14T00:00:00Z"
  }],
  "next_cursor": null, "has_more": false }
```
`status` ∈ `processing|verified|partial|rejected|failed`.

### 2.4 `DELETE /me/receipts/:id` → `204`

---

## 3. Discovery — §8.3

### 3.1 `GET /categories` → `{ "data": Category[] }`

```json
{ "data": [{
  "id": "cat_hospitals", "slug": "hospitals", "name": "Hospital", "plural": "Hospitals",
  "blurb": "…", "parent_id": null, "icon": null, "is_active": true, "sort_order": 1,
  "aspects": [{ "key": "cleanliness", "label": "Cleanliness", "sort_order": 1, "weight": 1 }],
  "fields": [
    { "key": "treatment", "label": "What was it for?", "type": "treatment",
      "options": null, "required": true, "suffix": null },
    { "key": "wait_time", "label": "Wait time", "type": "number",
      "options": null, "required": false, "suffix": "min" }
  ],
  "receipt": { "expects": "Hospital bill or discharge summary", "amount_tolerance": 0.05 }
}] }
```
`fields[].type` ∈ `text|number|currency|select|boolean|treatment`. `type: "treatment"`
ignores `options` and writes three keys into a review’s `structured` (§3.2).

### 3.2 `GET /treatments` → `{ "data": TreatmentCategory[] }` · **camelCase, deliberately**

```json
{ "data": [{
  "categoryName": "Surgical Treatment",
  "specialities": [
    { "specialityName": "Cardiology",
      "procedureName": ["Angiography", "Angioplasty", "CABG", "Others"] }
  ] }] }
```
Cache a day. `"Others"` is a real option — the client then stores the user’s free text in
`treatment_procedure` and keeps the two parent levels. Wanted eventually:
`?category=hospitals` scoping, and an `id` per node so a rename can migrate stored reviews.

### 3.3 `GET /search` → `Page<Business>`

Query: `q` · `category` (slug) · `city` · `lat` · `lng` · `radius` · `min_verified` ·
`min_rating` · `cost_band` (1–4) · `speciality` · `sort` (`relevance|verified|rating|cost_asc|cost_desc`) ·
`limit` · `cursor`. There is **no paid-ranking parameter and must never be one** —
`/trust` and `/for-business` say so in public copy.

### 3.4 `GET /businesses/:idOrSlug` → `Business`

```json
{
  "id": "01J8RUBY", "slug": "ruby-hall-clinic", "name": "Ruby Hall Clinic",
  "legal_name": "Grant Medical Foundation",
  "category": { "id": "cat_hospitals", "slug": "hospitals", "name": "Hospital" },
  "address": { "line1": "40 Sassoon Rd", "area": "Sangamvadi", "city": "Pune",
               "state": "Maharashtra", "pincode": "411001" },
  "geo": { "lat": 18.53, "lng": 73.87 },
  "phone": "+912066455000", "website": "https://…", "hours": "Open 24 hours",
  "descriptor": "Multispecialty", "specialities": ["Cardiology", "Oncology"],
  "status": "claimed",
  "ratings": {
    "verified":   { "score": 4.3, "count": 318, "distribution": [12, 18, 34, 96, 158] },
    "unverified": { "score": 3.9, "count": 742 }
  },
  "aspects": [{ "key": "cleanliness", "label": "Cleanliness", "score": 4.5 }],
  "cost": { "band": 3, "currency": "INR", "p25": 2500000, "p50": 4230000,
            "p75": 6800000, "based_on_receipts": 318 },
  "can_review": true,
  "solicits_reviews": false,
  "photos": [{ "id": "ph_1", "url": null, "seed": 42 }]
}
```
`status` ∈ `unclaimed|claimed|suspended`. `distribution` is the 1★→5★ histogram on the
verified bucket. `cost.*` is computed from verified receipts only (§6). Asked for but
missing: `score_is_publishable` (the ≥5-verified-reviews threshold, re-derived client-side today).

### 3.5 `GET /businesses/:idOrSlug/reviews` → `Page<Review>`

Query: `tier` (`verified` **default, always sent explicitly** | `all`) · `aspect` ·
`sort` (`recent|helpful|rating`) · `limit` · `cursor`.

---

## 4. Receipts — §8.4

Flow: upload-intent → PUT bytes to storage → process → poll GET until it leaves
`processing` → (redactions / confirm) → attach `receipt_id` to `POST /reviews`.

### 4.1 `POST /receipts/upload-intent` · `Idempotency-Key`

```json
{ "business_id": "01J8RUBY", "mime": "image/jpeg", "byte_size": 1842301 }
```
→
```json
{ "receipt_id": "01J9RC01", "upload_url": "https://s3…",
  "headers": { "Content-Type": "image/jpeg" }, "expires_in": 900 }
```

### 4.2 `PUT <upload_url>` — raw bytes, `headers` verbatim

Direct to object storage. Bytes never pass through this app; the bucket has no public ACL (§10).

### 4.3 `POST /receipts/:id/process` → `202`

```json
{ "receipt_id": "01J9RC01", "status": "processing", "poll_after_ms": 1500 }
```

### 4.4 `GET /receipts/:id` → `Receipt`

```json
{
  "id": "01J9RC01",
  "status": "verified",
  "business_id": "01J8RUBY",
  "extracted": { "merchant": "Ruby Hall Clinic", "txn_date": "2026-03-14",
                 "total_amount": 4230000, "currency": "INR",
                 "invoice_no": "INV-88214", "gstin": "27AAACR…" },
  "match": { "score": 0.94, "reasons": ["name_exact", "amount_within_tolerance"] },
  "redaction": {
    "auto_boxes": 3,
    "preview_url": "https://…signed…",
    "expires_in": 300,
    "fields": [
      { "key": "patient_name", "label": "Patient name", "value": "R**** M*****",
        "redacted": true,  "can_redact": true,
        "box": { "x": 0.12, "y": 0.30, "w": 0.40, "h": 0.05 } },
      { "key": "total_amount", "label": "Total", "value": "4230000",
        "redacted": false, "can_redact": false, "box": null }
    ]
  },
  "can_review": true,
  "purge_after": "2026-09-14T00:00:00Z",
  "consumed_by_review_id": null
}
```
Polled with backoff 1.5s → 6s, 60s ceiling (`pollReceipt`). `value` arrives **already
masked** when `redacted`. `can_redact: false` on merchant/date/total — blurring those
would destroy the verification. Errors: `409 receipt_duplicate`,
`422 receipt_unreadable`, `409 business_mismatch` (+ `suggested_business`).

### 4.5 `POST /receipts/:id/redactions` → `Receipt`

```json
{ "boxes": [{ "x": 0.12, "y": 0.30, "w": 0.40, "h": 0.05 }] }
```
Normalised 0–1 coordinates.

### 4.6 `POST /receipts/:id/confirm` → `Receipt`

Resolves a `partial` by confirming what didn’t match.
```json
{ "business_id": "01J8RUBY", "txn_date": "2026-03-14", "total_amount": 4230000 }
```

### 4.7 `DELETE /receipts/:id` → `204`

---

## 5. Reviews — §8.5

### 5.1 `POST /reviews` · `Idempotency-Key`

```json
{
  "business_id": "01J8RUBY",
  "receipt_id": "01J9RC01",
  "rating": 4,
  "aspect_ratings": { "cleanliness": 5, "staff": 4 },
  "title": "Clear billing, long wait",
  "body": "…",
  "structured": {
    "treatment_category": "Surgical Treatment",
    "treatment_speciality": "Cardiology",
    "treatment_procedure": "Angioplasty",
    "wait_time": 45
  },
  "media_ids": [],
  "is_anonymous": false,
  "language": "en"
}
```
→ `201`
```json
{ "id": "rev_01J…", "status": "published", "verification_tier": "verified",
  "weight": 1, "public_url": "https://verifiedviews.in/b/ruby-hall-clinic/reviews/rev_01J…" }
```
`language` ∈ `en|hi|mr`. Errors: `409 review_exists`, `422 content_rejected`,
`429 rate_limited`. Asked for: echo `status_note` when the result is `partial`.

### 5.2 `GET /reviews/:id` → `Review`

```json
{
  "id": "rev_01J…", "business_id": "01J8RUBY", "business_slug": "ruby-hall-clinic",
  "author": { "id": "u_…", "display_name": "Rhea M.", "trust_level": 3, "verified_review_count": 7 },
  "rating": 4, "title": "…", "body": "…", "language": "en",
  "aspect_ratings": { "cleanliness": 5 },
  "structured": { "treatment_procedure": "Angioplasty" },
  "verification_tier": "verified", "weight": 1,
  "is_anonymous": false, "status": "published",
  "helpful_count": 24, "report_count": 0,
  "visit_date": "2026-03-14", "bill_amount": 4230000,
  "published_at": "2026-03-16T09:12:00Z", "edited_at": null,
  "reply": { "id": "rep_01…", "business_id": "01J8RUBY",
             "author_display_name": "Ruby Hall Clinic", "body": "…",
             "created_at": "2026-03-17T04:00:00Z" },
  "status_note": "The date on the bill is blurred — a moderator is checking it."
}
```
`verification_tier` ∈ `verified|partial|unverified`.
`status` ∈ `published|under_review|rejected|removed|disputed`.
`author` is `null` when `is_anonymous` — the badge survives, the name does not.
`status_note` is server-authored, localised with `language`, nullable; the client renders
it verbatim and shows nothing when absent.

### 5.3 `POST /reviews/:id/vote`

```json
{ "value": 1 }        // 1 | -1 | 0 (0 clears)
```
→ `{ "helpful_count": 25 }`

### 5.4 `POST /reviews/:id/report`

```json
{ "reason": "not_a_real_visit", "detail": "…", "evidence_media_id": "01JA…" }
```
→ `{ "id": "rep_01…", "status": "open" }`

### 5.5 `POST /reviews/:id/replies` → `Review` (with `reply` populated)

```json
{ "body": "Thank you — we’ve added a second billing counter." }
```

### 5.6 `POST /reviews/:id/dispute` (business owner)

```json
{ "reason": "no_record_of_visit", "detail": "…", "evidence_media_id": "01JA…" }
```
→ `{ "id": "dsp_01…", "status": "open" }`. The review freezes out of the score until a
moderator decides, and `status_note` explains that on the public page.

---

## 6. Business owner — §8.6

### 6.1 `POST /business/claims`

```json
{ "business_id": "01J8RUBY", "method": "gstin",
  "evidence": { "gstin": "27AAACR…", "registration_no": null, "media_id": null },
  "contact_email": "ops@rubyhall.com", "contact_phone": "+912066455000",
  "role": "Marketing lead" }
```
→ `{ "id": "clm_01…", "status": "pending" }`. `method` ∈ `gstin|phone|document`.

### 6.2 `GET /business/:id/overview`

```json
{
  "business": { …Business… },
  "deltas": { "verified_score": 0.2, "unverified_score": -0.1 },
  "counts": { "verified": 318, "unverified": 742, "new_this_week": 11, "unanswered": 4 }
}
```

### 6.3 `GET /business/:id/reviews?needs_reply=true&cursor=` → `Page<Review>`

### 6.4 `GET /business/:id/insights?range=90d`

```json
{
  "range": "90d",
  "aspect_trends": [{ "key": "wait_time", "label": "Wait time", "from": 3.8, "to": 4.2 }],
  "cost_distribution": [{ "from": 0, "to": 2500000, "count": 41 }]
}
```

### 6.5 `PATCH /business/:id/profile` → `Business`

Partial body, any of: `phone` · `hours` · `address_line1` · `website` · `descriptor`.

**Never build:** an endpoint returning a receipt image to a business, or one resolving an
anonymous review to a user. §10’s access rules are load-bearing and the dashboard states
them in plain words.

---

## 7. Additions the client already calls

Mocked today; nothing behind them yet.

### 7.1 `GET /stats/platform?city=pune` — the home-page proof-of-life counter

```json
{ "bills_verified": 418207, "reviews_published": 102884,
  "bills_verified_this_week": { "city": "Pune", "count": 1204 },
  "generated_at": "2026-07-26T04:00:00Z" }
```
Cache 5 minutes. It doesn’t need to be exact — it needs to be **true**, which a hard-coded
constant is not.

### 7.2 `GET /reviews/featured?limit=3&city=pune&category=hospitals&window=30d`

`Page<Review>`, verified tier only, ranked server-side (`helpful_count` decayed by age,
one review per business). Without it the home page is N+1 over every business.

### 7.3 `GET /cities`

```json
{ "data": [{ "slug": "pune", "name": "Pune", "state": "Maharashtra",
             "business_count": 1284, "verified_review_count": 41207, "is_live": true }] }
```
Currently a constant in `lib/data.ts`, which makes a new city a frontend release.

---

## 8. Proposed, not yet wired up

Full rationale in [api-additions.md](api-additions.md).

| Endpoint | Shape | Why |
|---|---|---|
| `POST /media/upload-intent` → `{media_id, upload_url, headers, expires_in}`; `POST /media/:id/process`; `GET /media/:id` → `{id, kind, moderation_status, url, width, height, rejection_reason}` | mirrors receipts | Nothing in §8 creates the `media_ids[]` / `evidence_media_id` the write, report and claim paths already accept. Review photos are collected and dropped today |
| `GET /businesses/:id/cost-histogram?bins=5` | `{currency, based_on_receipts, bins:[{from,to,count}]}`, `to:null` = open top bin | `lib/cost.ts` infers the shape between p25/p50/p75 — a chart making a claim the data doesn’t support |
| `GET /businesses/facets?category=&city=` | `{specialities:[{value,count}], cost_bands:[{value,count}], rating_buckets:[{min,count}], total}` | The listing runs a second unfiltered `/search` purely to build its dropdowns |
| `POST /receipts/transaction-ref` | `{business_id, reference, method: upi\|card\|netbanking, amount, txn_date}` → `Receipt` | Bottom rungs of §6.1’s fallback ladder; UI describes the option and can’t offer it |
| `GET /receipts/forward-address` | `{address, verified_senders[], pending_count}` | Per-user forwarding address; a shared inbox fails the moment someone forwards from a work account |
| `GET` / `POST /me/reviews/:id/appeal` | `{message}` → `{id, status, opened_at, sla_resolve_by}` | IS 19000:2022 requires an appeals path; no affordance exists on the site |
| `GET /businesses/:id/questions` | `{data:[{id, body, created_at, asked_by, answer_count, answers:[{…, is_verified_visitor, is_business, helpful_count}]}]}` | Listed in §8.3 with no response shape. Phase 2 |

**Field-level asks on existing endpoints:** `descriptor` / `specialities[]` / `hours` /
`photos[]` and `score_is_publishable` on `GET /businesses/:idOrSlug`; `city` and
`sort=cost_asc|cost_desc` on `GET /search`; `tier=all` on
`GET /businesses/:id/reviews`; `status_note` echoed by `POST /reviews`; `retry_after`
in the `rate_limited` body (not just the header); `purge_after` on `GET /me/receipts`.

---

## Where this lives in code

- `lib/api/types.ts` — every wire type above, mirroring §4/§8
- `lib/api/endpoints.ts` — one function per endpoint
- `lib/api/client.ts` — headers, tokens, cursor walking, idempotency keys
- `lib/api/mock-transport.ts` — answers all of §§1–7 from seed data when `NEXT_PUBLIC_API_BASE_URL` is unset
- `lib/api/adapters.ts` — wire → view models in `lib/types.ts`; nothing in `components/` touches wire types, so a wire change stops at this boundary
