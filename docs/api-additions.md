# VerifiedViews — API additions requested by the web client

**Companion to:** `verifiedviews-backend-api-spec.md` (v0.1)
**Status:** proposals — nothing here exists yet
**Date:** July 2026

The web surface is built against §8 of the backend spec and uses those
endpoints unchanged. This document lists the gaps found while building it:
things the site currently reconstructs client-side, hard-codes, or cannot do at
all.

**Conventions.** Every endpoint below is `application/json` in both directions
and inherits everything in §7 of the spec: `snake_case` keys, UTC ISO-8601
timestamps, integer **paise** for money, cursor pagination
(`{data, next_cursor, has_more}`), the `{error:{code,message,field,request_id,docs}}`
envelope, `Idempotency-Key` on every unsafe write, and the standard rate-limit
response headers. Requests carry `Authorization`, `X-Device-Id` and
`X-App-Version` exactly as §3 describes.

Each item says **why the web client needs it** and **what it does today**,
so anything that isn't worth building can be dropped with eyes open.

---

## Priority

| # | Endpoint | Priority | Blocks |
|---|---|---|---|
| 1 | `GET /stats/platform` | **P0** | Home page hero counter |
| 2 | `GET /reviews/featured` | **P0** | Home page "most helpful" |
| 3 | `GET /businesses/:id/cost-histogram` | **P1** | Honest cost chart |
| 4 | Redaction *fields* on `GET /receipts/:id` | **P0** | The redaction screen |
| 5 | `POST /media` | **P1** | Review photos, dispute & report evidence |
| 6 | `status_note` on reviews | **P0** | Partial / disputed labelling |
| 7 | `GET /cities` | **P2** | City picker, sitemap |
| 8 | `GET /businesses/:id/facets` | **P2** | Listing filter options |
| 9 | `POST /receipts/:id/transaction-ref` | **P2** | Fallback ladder |
| 10 | `POST /receipts/forward-address` | **P2** | Fallback ladder |
| 11 | `GET /me/reviews/:id/appeal` + `POST` | **P1** | Rejected-review appeal |
| 12 | `GET /businesses/:id/questions` shape | **P2** | Q&A (Phase 2) |
| 13 | `GET /treatments` | **P0** | Treatment picker in the write flow |

---

## 1. `GET /stats/platform` — the proof-of-life counter

**Why.** §7.2 and §8.1 of the design doc put a live "N bills verified" figure on
the home screen and the web hero. It is described there as the cheapest, most
honest trust signal available. There is no endpoint that returns it.

**Today.** Hard-coded in the mock transport. A real deployment would ship a
stale number, which is worse than shipping none.

```http
GET /v1/stats/platform
```

```json
{
  "bills_verified": 418207,
  "reviews_published": 102884,
  "bills_verified_this_week": { "city": "Pune", "count": 1204 },
  "generated_at": "2026-07-26T04:00:00Z"
}
```

Optional `?city=pune` to scope the weekly figure. Cache for 5 minutes; this is
the single most-requested payload on the site and it does not need to be exact
to the second — it needs to be **true**, which a hard-coded constant is not.

---

## 2. `GET /reviews/featured` — cross-business review feed

**Why.** The home page shows the most helpful verified reviews across the whole
platform. `GET /businesses/:id/reviews` is business-scoped, so there is no way
to ask "the best verified reviews right now" without N+1 calls.

**Today.** A dedicated mock route. Against a real backend the home page would
have to fan out over every business.

```http
GET /v1/reviews/featured?limit=3&city=pune&category=hospitals&window=30d
```

Returns a standard cursor page of the same `Review` object
`GET /reviews/:id` returns. Verified tier only — featuring an unverified review
on the home page would contradict the product.

Ranking should be server-side (`helpful_count` decayed by age, capped at one
review per business) so the client never has to re-implement it.

---

## 3. `GET /businesses/:id/cost-histogram` — the real distribution

**Why.** The business profile shows what verified bills actually came to. The
profile response gives `cost.p25/p50/p75`, which is three points; a histogram
needs bins.

**Today.** The client reconstructs five bins from the quartiles with a
right-skewed weighting (`lib/cost.ts`). It is anchored on real numbers and the
counts sum to the real total, but the **shape between the quartiles is
inferred, not measured.** That is a chart making a claim the data doesn't
support, and this product exists to not do that.

```http
GET /v1/businesses/01J8RUBY/cost-histogram?bins=5
```

```json
{
  "currency": "INR",
  "based_on_receipts": 318,
  "bins": [
    { "from": 0,        "to": 2500000,  "count": 41 },
    { "from": 2500000,  "to": 5000000,  "count": 133 },
    { "from": 5000000,  "to": 7500000,  "count": 88 },
    { "from": 7500000,  "to": 10000000, "count": 42 },
    { "from": 10000000, "to": null,     "count": 14 }
  ]
}
```

`to: null` marks an open-ended top bin. Bin edges should be chosen server-side
(round paise values, not equal-width floats) so every business's chart is
readable. Suppress the response entirely below the §6 display threshold rather
than returning a histogram of four bills.

**Same argument, separate ask:** `ratings.verified.distribution` already ships
the star histogram on the profile response and the site renders it as-is. Please
keep it — it is doing real work.

---

## 4. Redaction fields on `GET /receipts/:id`

**Why.** §7.5 of the design doc calls the redaction confirm screen "the
trust-defining screen". It has to show the user, line by line, *what we read and
what we blurred*, and let them blur more. The current response gives
`redaction.auto_boxes` (a count) and `preview_url` (an image).

A count and an image are not enough to build that screen. The client cannot
label a box it cannot name, and rendering the raw bill image to let someone drag
rectangles over it is both worse UX and a wider exposure of the very data we are
trying to redact.

**Today.** The mock returns a `fields` array; a real backend would return a
number and the screen would degrade to "we blurred 3 things, trust us".

```http
GET /v1/receipts/01J9RC01
```

```json
{
  "redaction": {
    "auto_boxes": 3,
    "preview_url": "https://…signed…",
    "expires_in": 300,
    "fields": [
      { "key": "patient_name",  "label": "Patient name", "value": "R**** M*****",
        "redacted": true,  "can_redact": true,  "box": {"x":0.12,"y":0.30,"w":0.40,"h":0.05} },
      { "key": "uhid",          "label": "UHID",         "value": "RH-2026-88214",
        "redacted": true,  "can_redact": true,  "box": {"x":0.12,"y":0.36,"w":0.30,"h":0.04} },
      { "key": "total_amount",  "label": "Total",        "value": "4230000",
        "redacted": false, "can_redact": false, "box": null }
    ]
  }
}
```

- `value` is **already masked** when `redacted` is true — the client never
  receives the cleartext of something we have decided to hide.
- `can_redact: false` on merchant, date and total: blurring those would destroy
  the verification the badge rests on. The UI greys them out and says why.
- `box` feeds `POST /receipts/:id/redactions`, which already exists and needs no
  change.

---

## 5. `POST /media` — the upload the write path assumes

**Why.** `POST /reviews` accepts `media_ids[]`, `POST /reviews/:id/report`
accepts `evidence_media_id`, and `POST /business/claims` accepts an
`evidence_media_id`. Nothing in §8 creates a media ID.

**Today.** Review photos are collected in the UI and dropped; the report and
claim forms send text only.

Mirror the receipt flow, which already works well:

```http
POST /v1/media/upload-intent
{ "kind": "review_photo" | "report_evidence" | "claim_document",
  "mime": "image/jpeg", "byte_size": 1842301 }
```

```json
{ "media_id": "01JA…", "upload_url": "https://s3…", "headers": {…}, "expires_in": 900 }
```

```http
POST /v1/media/01JA…/process     → 202 { "status": "processing" }
GET  /v1/media/01JA…             → { "id":"01JA…", "kind":"review_photo",
                                     "moderation_status":"approved|pending|rejected",
                                     "url":"https://…", "width":1600, "height":1200,
                                     "rejection_reason": null }
```

`moderation_status` matters: §7.7 of the design doc promises "no bills, no
faces, no IDs" on review photos, and the client needs to tell the user *before*
they publish that a photo was rejected and why.

---

## 6. `status_note` on the review object

**Why.** §3 of the design doc has four public states and every one of them has to
explain itself in the user's language:

- *Bill under review* — "The date on the bill is blurred — a moderator is
  checking it."
- *Disputed* — "Ruby Hall Clinic has disputed this review with evidence. It is
  frozen in the score until a moderator decides."

The review object carries `verification_tier` and `status` but no human-readable
reason, so the client would have to invent one from an enum — which means
inventing a reason that may be wrong.

**Today.** The mock supplies `status_note`; the client renders it verbatim and
shows nothing when it's absent.

```json
{
  "verification_tier": "partial",
  "status": "under_review",
  "status_note": "The date on the bill is blurred — a moderator is checking it."
}
```

Optional and nullable. Server-authored, localised alongside the review's
`language`. This is the one field where copy has to come from the system that
knows the actual reason.

**Related:** the same applies to a rejected review in `GET /me/reviews`. §9.4
promises "Your review didn't pass our checks: it named an individual staff
member's personal details" — specific, not generic. That needs
`rejection_reason` (human text) and `rejection_code` (machine, for the appeal
flow) on the author's own view of the review.

---

## 7. `GET /cities` — where we operate

**Why.** The city picker, the `/c/:category/:city` route space, and the sitemap
all need the list of live cities. Hard-coding it means a new city is a frontend
release, which contradicts §4's "adding a category is a config change".

**Today.** A constant in `lib/data.ts`.

```http
GET /v1/cities
```

```json
{ "data": [
  { "slug": "pune", "name": "Pune", "state": "Maharashtra",
    "business_count": 1284, "verified_review_count": 41207, "is_live": true }
] }
```

`business_count` lets the listing page state coverage honestly instead of
showing an empty city that looks broken.

---

## 8. `GET /businesses/facets` — filter options for a listing

**Why.** The listing page offers filters for speciality/cuisine, cost band and
rating. To render the *options*, it currently fetches the unfiltered result set
alongside the filtered one and derives the distinct values client-side — two
search calls per page load, and the options are only correct while the whole
result set fits in one page.

**Today.** Exactly that: two `GET /search` calls, one of them purely to build
the dropdowns.

```http
GET /v1/businesses/facets?category=hospitals&city=pune
```

```json
{
  "specialities": [ { "value": "Cardiology", "count": 84 } ],
  "cost_bands":   [ { "value": 3, "count": 41 } ],
  "rating_buckets": [ { "min": 4.5, "count": 22 } ],
  "total": 128
}
```

Counts alongside the options let the UI grey out filters that would return
nothing — a small thing that stops the "no results" state from being a surprise.

---

## 9. `POST /receipts/:id/transaction-ref` — the UPI/card fallback

**Why.** §6.1's fallback ladder is: bill photo → bill PDF → forward the email
receipt → **UPI/bank SMS parse → paste transaction ID** → continue unverified.
The last two rungs have no endpoint.

**Today.** The UI describes the option and then cannot offer it.

```http
POST /v1/receipts/transaction-ref
Idempotency-Key: <uuid>
{ "business_id": "01J8…", "reference": "426512345678",
  "method": "upi" | "card" | "netbanking",
  "amount": 4230000, "txn_date": "2026-03-14" }
```

Returns the same `Receipt` object the upload flow produces, so the client
handles one shape either way. Expect a lower match score and therefore more
`partial` outcomes — which is correct: a transaction reference proves a payment,
not an itemised bill.

---

## 10. `GET /receipts/forward-address` — the per-user email inbox

**Why.** The fallback ladder tells people to forward an email receipt to
`bills@verifiedviews.in`. For that to match to an account, either the sending
address must already be on file, or each user needs a unique forwarding address.
A shared address plus "we'll figure out who you are from the From: header" fails
the moment someone forwards from a work account.

**Today.** The UI prints the shared address and hopes.

```http
GET /v1/receipts/forward-address
```

```json
{ "address": "bills+u01J8XK2@verifiedviews.in",
  "verified_senders": ["rhea@example.com"],
  "pending_count": 1 }
```

`pending_count` lets the write flow say "1 forwarded bill is waiting" instead of
leaving the user wondering whether the email arrived.

---

## 11. Appeals — `GET`/`POST /me/reviews/:id/appeal`

**Why.** §10 of the design doc and IS 19000:2022 both require an appeals path,
and §9.4 specifies the UI: a rejected review shows the reason plus **[Edit]** and
**[Appeal]**. `POST /admin/disputes/:id/decision` handles the business side;
there is no user-side appeal.

**Today.** No appeal affordance exists on the site.

```http
POST /v1/me/reviews/01JB…/appeal
Idempotency-Key: <uuid>
{ "message": "The name I mentioned is the hospital's, not an individual's." }
```

```json
{ "id": "app_01…", "status": "open", "opened_at": "2026-07-26T…",
  "sla_resolve_by": "2026-08-10T…" }
```

`GET` returns the current appeal with its decision and note once resolved. §10
of the spec commits to a 15-day resolution SLA — surfacing `sla_resolve_by` in
the response lets the UI state it rather than leaving people to wonder.

The appeal must be handled by a **different moderator** than the original
decision; that is a backend policy, but the response should carry enough to say
so truthfully on screen.

---

## 12. Q&A response shape

**Why.** `GET /businesses/:id/questions` is listed in §8.3 with no response
shape. §7.10 of the design doc specifies that verified-visitor answers rank
first, which is a server-side ordering decision the client shouldn't re-do.

Phase 2, but worth pinning down before it is built:

```json
{ "data": [
  { "id": "q_01…", "body": "Do they take CGHS?", "created_at": "…",
    "asked_by": { "display_name": "Rhea M.", "trust_level": 4 },
    "answer_count": 3,
    "answers": [
      { "id": "a_01…", "body": "Yes, for IPD only.",
        "is_verified_visitor": true, "is_business": false,
        "author": { "display_name": null, "trust_level": 3 },
        "helpful_count": 12, "created_at": "…" }
    ] }
] }
```

---

## 13. `GET /treatments` — the treatment taxonomy

**Why.** "What was it for?" used to be a free-text box, which meant *angioplasty*,
*Angioplasty*, *PTCA* and *heart stent* were four different answers to the same
question. Nothing can be grouped, so nothing can be compared — and "₹42,300 for
an angioplasty at Ruby Hall vs ₹51,000 at Sahyadri" is the comparison this whole
product exists to make possible.

The write flow now asks it as three cascading questions — **treatment category →
speciality → procedure** — and stores all three. That only works if the options
come from the same backend that stores them; a list frozen into the frontend
means a new procedure is a web release, which contradicts §4's "adding a
category is a config change".

**Today.** Served from a seed file by the mock transport, alongside the listings.

```http
GET /v1/treatments
```

```json
{ "data": [
  { "categoryName": "Surgical Treatment",
    "specialities": [
      { "specialityName": "Cardiology",
        "procedureName": ["Angiography", "Angioplasty", "CABG", "Others"] }
    ] }
] }
```

Notes on the shape, in order of how much they matter:

- **Keys are camelCase**, unlike everything else in §7. This is the taxonomy as
  the clinical-coding source already publishes it, and the client adapts it in
  `lib/api/adapters.ts`. Renaming it to `snake_case` on the way out is fine and
  the client will follow — but renaming it in *one* system and not the other is
  the bad outcome.
- **`"Others"` is a real option** at the end of most procedure lists. When it is
  picked the client stores the free text the user typed in `treatment_procedure`
  and leaves the category and speciality set, so the answer still groups one
  level up instead of falling out of the data entirely.
- **Scoping.** A `?category=hospitals` parameter (business category, not
  treatment category) would let the picker show only the branches that apply to
  the place being reviewed. Today the client sends the whole tree — ~400
  procedures, worth caching hard and worth trimming eventually. Cache for a day;
  this changes about as often as a price list.
- **Stability.** These strings are stored on every review, so they are keys, not
  labels. If a procedure is ever renamed, existing reviews need to move with it —
  which argues for an `id` per node alongside the name. The client does not need
  one to ship, but it will want one before the first rename.

Reviews carry the answer in `structured` as three keys, which is what makes it
groupable server-side:

```json
{ "structured": {
    "treatment_category": "Surgical Treatment",
    "treatment_speciality": "Cardiology",
    "treatment_procedure": "Angioplasty" } }
```

**Related:** the category's own `fields[]` gains `"type": "treatment"` to declare
the picker. It ignores `options` — the taxonomy is the options — and is what
tells the client to write those three keys rather than one.

Once this lands, the natural follow-on is cost by procedure on the business
profile: `GET /businesses/:id/costs?by=treatment_procedure`. That is the number
people actually want, and it is only computable because the answer is now a
controlled value rather than a sentence.

---

## Smaller notes on the existing spec

These are not new endpoints — just fields the web client would use if they were
there.

| Where | Ask | Why |
|---|---|---|
| `GET /businesses/:idOrSlug` | `descriptor` ("Multispecialty"), `specialities[]`, `hours`, `photos[]` with URLs | The profile header and result rows render all four; the documented response has none of them |
| `GET /businesses/:idOrSlug` | `score_is_publishable: boolean` | §6 sets the threshold at 5 verified reviews. Right now the client re-derives it from `count`, so a change to the rule needs a frontend release |
| `GET /search` | `city` as a first-class parameter | Documented as `lat/lng/radius`; every SEO landing page is city-scoped, and geocoding a city name client-side to get a radius is a worse version of a string match |
| `GET /search` | `sort=cost_asc\|cost_desc` | §8.3 lists `sort` without enumerating values; the listing offers both cost directions |
| `GET /businesses/:id/reviews` | `tier=all` alongside `tier=verified` | The profile's "All" tab needs it; the spec documents the parameter but not the value that includes unverified |
| `POST /reviews` | Echo `status_note` on a `partial` result | So the confirmation screen can say *which* field is still being checked |
| Error envelope | `retry_after` seconds in the body on `rate_limited` | Currently only in the `X-RateLimit-Reset` header. §10 of the design doc wants human copy — "the next one unlocks tomorrow" — which needs the number where the copy is built |
| `GET /me/receipts` | `purge_after` | The vault promises the image is destroyed on a date; the client should show that date, not describe the policy in the abstract |

---

## What the web client deliberately does *not* ask for

Stated so nobody adds them:

- **No endpoint that returns a receipt image to a business.** Not for disputes,
  not for claims, not on request. §10's access rules are load-bearing for the
  entire privacy promise, and the dashboard says so in plain words.
- **No endpoint that resolves an anonymous review to a user.** The dashboard
  needs `is_anonymous`, and nothing more.
- **No paid ranking parameter on `GET /search`.** `/trust` and `/for-business`
  both state there is no paid ranking. An endpoint that could deliver one would
  make those pages a lie.
