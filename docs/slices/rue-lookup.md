# Number-bearing lookup — implementation notes

This document is the **canonical write-up** for the v1 number-bearing lookup vertical slice (parent PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4)), delivered in four tracer slices ([#5](https://github.com/daniel-lou18/andriveau-bobine/issues/5)–[#8](https://github.com/daniel-lou18/andriveau-bobine/issues/8)). It mirrors [`rue-suggest.md`](./rue-suggest.md) in structure and depth.

Related: [ADR-0002: strict lookup with `rue_id`](../adr/0002-strict-lookup-api-with-rue-id.md), [ADR-0003: deduped response with conflict flag](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md), [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Primary lookup, Suffix Axis Model, canonical SQL), [`rue-suggest.md`](./rue-suggest.md) (disambiguation handoff).

---

## Purpose

After the user picks a canonical **rue** via the suggest slice ([ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md)), they enter a house number (and optional suffix), submit, and receive **deduped** `(arrondissement, quartier, ilot)` triples for that address on the selected rue — plus a top-level **`conflict`** flag when multiple **source entries** backed the result ([ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md)).

Optional **`?provenance=1`** attaches register traceability (`bobine`, `page`, `sequence`, `raw_text`) per match for QA.

The public route stays separate from the authenticated extraction loader (`POST /api/_loader/extraction`).

### Composition with suggest

```text
useRueDisambiguation() → resolvedRue (opaque rueId)
  → canSubmitLookup(resolvedRue) gates LookupForm
  → submit uses resolvedRue.rueId only (never parse display text)
```

See `apps/web/src/rue-suggest/handoff.ts` and [ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md).

---

## HTTP contract

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/rues/:rueId/lookup` |
| Path param | `rueId` — positive integer (`rues.id`) |
| Query `n` | Required positive integer house number |
| Query `suffix` | Optional; one of `bis`, `ter`, `quater`, `quinquies`, `sexies`, `septies` (from `LOOKUP_SUFFIX_TOKENS` in `@andriveau-bobine/lookup`) |
| Query `provenance` | Optional boolean: `1` ⇒ include provenance; omitted or `0` ⇒ omit (default) |
| Parity | Inferred server-side from `n` only: `n % 2 === 0 ? "even" : "odd"` — suffix does not change parity |
| Success | `200` with `LookupResponse` (see below) |
| No segment match | `200` with `{ "matches": [], "conflict": false }` (rue exists) |
| Unknown rue | `404` with `{ "error": "rue not found" }` |
| Bad input | `400` with `{ "error": string }` — validation messages for `n`, `rueId`, `suffix`, `provenance` |

### Success response (`LookupResponse`)

```json
{
  "matches": [
    {
      "arrondissement": 6,
      "quartier": "Notre-Dame-des-Champs",
      "ilot": 4121,
      "provenance": [
        {
          "bobine": 8,
          "page": 1,
          "sequence": 0,
          "raw_text": "Ilot 4121 | rue de … | 95"
        }
      ]
    }
  ],
  "conflict": false
}
```

- **`matches`** — always an array (never a scalar); deduped on `(arrondissement, quartier, ilot)`.
- **`conflict`** — `true` when more than one distinct `source_entry_id` contributed rows to this lookup (see [ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md)).
- **`provenance`** — present on a match **only** when `?provenance=1`; omitted entirely otherwise (not `null` / `[]`). Each match’s array is deduped on `(bobine, page, sequence, raw_text)`.

Types live in **`@andriveau-bobine/lookup`** (`packages/lookup/`). Both `apps/api` and `apps/web` depend on this workspace package.

### Validation error examples

| Condition | Status | `error` (representative) |
|-----------|--------|---------------------------|
| Missing / non-positive `n` | `400` | `n must be a positive integer` |
| Non-numeric / non-positive `rueId` | `400` | `rueId must be a positive integer` |
| Unknown `suffix` | `400` | `suffix must be one of: bis, ter, … (or omitted for no suffix)` |
| Invalid `provenance` | `400` | `provenance must be 0 or 1` |
| Unknown `rueId` | `404` | `rue not found` |

Local dev: Vite proxies `/api` to the Worker; the web slice uses relative URLs.

Errors go through the Worker-wide **`apiErrorHandler`** (`apps/api/src/http/on-error.ts`). Zod validation failures from `jsonErrorValidator` throw `HTTPException` with a logged **`cause`**; the response body stays `{ "error": string }` only.

### Example requests

```http
GET /api/rues/42/lookup?n=95
GET /api/rues/42/lookup?n=8&suffix=bis
GET /api/rues/42/lookup?n=95&provenance=1
```

---

## Architecture (after refactor)

### Request flow (API)

```text
GET /api/rues/:rueId/lookup?n=…&suffix=…&provenance=…
  → lookup/routes.ts              (Hono sub-app, mounted under /api/rues)
  → jsonErrorValidator            (lookupParamsSchema + lookupQuerySchema)
  → lookupRue(db, rueId, n, suffix, provenance)   (transport-agnostic use case)
  → parseLookupInput(n, suffix)   (@andriveau-bobine/lookup — parity + n_rank)
  → queryLookupRawRows            (canonical tuple range + joins — DB adapter)
  → assembleLookupResult(rows, { provenance })    (@andriveau-bobine/lookup)
  → 200 { matches, conflict }
```

The root app mounts suggest and lookup on the same prefix:

```text
app.route("/api/rues", suggestRoutes);
app.route("/api/rues", lookupRoutes);
```

(`apps/api/src/index.ts`). DB injection remains global middleware (`c.set("db", …)`).

### Shared package (`packages/lookup`)

Cross-tier contract and domain projection (`@andriveau-bobine/lookup`):

| Export | Role |
|--------|------|
| `SuffixToken`, `LOOKUP_SUFFIX_TOKENS`, `LookupSuffixToken` | House-number suffix axis (tokens + query-param allowlist) |
| `SUFFIX_RANK`, `rankOfSuffix`, `suffixOfRank` | Canonical suffix ↔ rank 0–6 (loader + lookup) |
| `parseLookupInput`, `ParsedLookupInput` | `n` + optional suffix → `parity`, `n_rank` |
| `assembleLookupResult`, `LookupRawRow` | Raw SQL rows → deduped `LookupResponse` (ADR-0003) |
| `LookupRequest` | Client-side mirror of lookup query params |
| `LookupProvenance`, `LookupMatch`, `LookupResponse` | Wire JSON types |
| `formatLookupTriple`, `formatLookupProvenance`, `lookupTripleKey`, `lookupProvenanceKey` | Display helpers for SPA |

Relationship to **`@andriveau-bobine/disambiguation`**: suggest supplies `ResolvedRue` / `rueId`; lookup consumes opaque `rue_id` only. Shared packages do not depend on each other; the web app composes both hooks in `App.tsx`.

### Web flow

```text
useRueDisambiguation() → resolvedRue
useAddressLookup()
  → internal submitted { rueId, n, suffix?, provenance? } (null until submit)
  → useQuery(lookupQueryOptions) when submitted !== null
  → result | loading | error | submit | clear

LookupForm({ resolvedRue, lookup })
  → number input, suffix <select>, “Include provenance” checkbox, submit

LookupResultBox({ result, loading, error })
  → triples list (via formatLookupTriple)
  → optional “Sources disagree” badge when conflict === true
  → optional <details> provenance per match when present
```

`App.tsx` composes `RueSuggestBox` + `LookupForm` + `LookupResultBox`, threading `disambiguation.resolvedRue` into the form. Submit uses `rueIdForLookup(resolvedRue)` (ADR-0002 handoff).

---

## Implementation overview — API (`apps/api/src`)

### Worker composition

| Piece | Role |
|--------|------|
| `index.ts` | App shell: CORS, DB middleware, `app.onError(apiErrorHandler)`, `app.route("/api/rues", lookupRoutes)`. |
| `http/zod.ts` | `jsonErrorValidator` — Zod failures → `badRequest(message, { cause })`. |
| `http/errors.ts` | `badRequest`, `notFound`, … |
| `http/on-error.ts` | Maps `HTTPException` / malformed JSON to `{ error }`; logs Zod `cause`. |

### Lookup slice (`lookup/`)

| Module | Role |
|--------|------|
| `routes.ts` | `GET /:rueId/lookup` — param + query validation, 404 on missing rue. |
| `schema.ts` | `lookupParamsSchema`, `lookupQuerySchema` — `n`, optional `suffix`, optional `provenance`. |
| `query.ts` | `queryLookupRawRows` — Drizzle join + tuple range filter (DB adapter). |
| `index.ts` | **`lookupRue`** — rue existence check; imports `parseLookupInput` + `assembleLookupResult` from `@andriveau-bobine/lookup`. |

Domain logic (`parseLookupInput`, `assembleLookupResult`, suffix ranks) lives in **`packages/lookup/`** — not under `apps/api`.

---

## Matching and assembly pipeline

### 1. Parse input (`packages/lookup/src/parse-input.ts`)

- **`parity`**: `n % 2 === 0 ? "even" : "odd"` ([DOMAIN_MODEL](../DOMAIN_MODEL.md) — suffix does not affect parity).
- **`n_rank`**: `rankOfSuffix(suffix ?? "")` — omitted suffix ⇒ rank `0`.

### Suffix tuple examples

| Segment range | Matches | Does not match |
|---------------|---------|----------------|
| `8 → 8bis` (ranks 0–1) | `n=8` (no suffix), `n=8&suffix=bis` | `n=8&suffix=ter` |
| Singleton `8` (rank 0 only) | `n=8` | `n=8&suffix=bis` |
| `10 → 10bis` (ranks 0–1) | `n=10&suffix=bis` | `n=10&suffix=ter` |

Example: `GET …/lookup?n=8&suffix=bis` matches a segment stored as `(from_number, from_suffix_rank) = (8, 0)` through `(to_number, to_suffix_rank) = (8, 1)`.

### 2. Segment filter + joins (`query.ts`)

Canonical SQL from [DOMAIN_MODEL](../DOMAIN_MODEL.md):

```sql
SELECT a.number AS arrondissement,
       q.name AS quartier,
       i.number AS ilot,
       se.id AS source_entry_id,
       se.bobine, se.page, se.sequence, se.raw_text
FROM street_segments s
JOIN source_entries se ON se.id = s.source_entry_id
JOIN segment_ilots si  ON si.segment_id = s.id
JOIN ilots i           ON i.id = si.ilot_id
JOIN quartiers q       ON q.id = i.quartier_id
JOIN arrondissements a ON a.id = q.arrondissement_id
WHERE s.rue_id = :rue_id
  AND s.parity = :parity
  AND (s.from_number, s.from_suffix_rank) <= (:n, :n_rank)
  AND (:n, :n_rank) <= (s.to_number, s.to_suffix_rank)
ORDER BY se.bobine, se.page, COALESCE(se.sequence, 0), i.number;
```

Implemented in Drizzle as row-value comparisons on `street_segments` plus inner joins up the hierarchy. Every matching **`segment_ilots`** row produces one raw row (a **segment** can map to multiple **îlots**).

### 3. Assemble (`packages/lookup/src/assemble.ts`)

Pure function — no DB, no HTTP:

1. **Dedupe matches** on `(arrondissement, quartier, ilot)` — first row wins for ordering.
2. **`conflict`** — `true` iff `distinct(source_entry_id) > 1` across **all** raw rows (before triple dedupe). One source asserting multiple îlots via `segment_ilots` (shared edge / correction) stays `conflict: false`.
3. **Provenance** (when `options.provenance === true`) — for each deduped triple, collect provenance from all raw rows in that group; dedupe on `(bobine, page, sequence, raw_text)`. When false, the `provenance` property is **not set** on the match object.

### Conflict semantics (pinned by tests)

| Scenario | `matches` | `conflict` |
|----------|-----------|------------|
| No covering segment | `[]` | `false` |
| One source, one îlot | 1 | `false` |
| One source, multiple îlots (shared edge) | N | `false` |
| Two sources, different îlots | 2 | `true` |
| Two sources, same îlot (deduped) | 1 | `true` |

With `?provenance=1`, `matches` and `conflict` are identical to the default response; only per-match `provenance` differs.

### Provenance vs conflict (when `?provenance=1`)

| Scenario | `matches` / `conflict` | `provenance` |
|----------|------------------------|--------------|
| Default vs opt-in | Identical with or without the flag | Only field that changes |
| One source, two îlots (shared edge) | 2 matches, `conflict: false` | Each match gets one provenance entry (same source) |
| Two sources, different îlots | 2 matches, `conflict: true` | Typically one provenance entry per match |
| Two sources, same îlot (deduped) | 1 match, `conflict: true` | One match with **two** provenance entries (distinct bobines) |
| Two `segment_ilots` rows, same source + triple | 1 match | One provenance entry (deduped within match) |

---

## Implementation overview — Web (`apps/web/src/lookup/`)

| Module | Role |
|--------|------|
| `api.ts` | `fetchLookup(rueId, n, suffix?, provenance?, signal?)` — builds query string; `GET /api/rues/:rueId/lookup` via Vite proxy. |
| `lookupQuery.ts` | TanStack Query `queryOptions` + `lookupKeys` factory (`staleTime` 60s, `retry: false`; `enabled` driven by hook). |
| `useAddressLookup.ts` | Submit-on-action hook: `submit(input)` drives query; `clear()` resets; exposes `result`, `loading`, `error`. |
| `LookupForm.tsx` | Number input, suffix `<select>` from `LOOKUP_SUFFIX_TOKENS`, provenance checkbox; submit via `rueIdForLookup(resolvedRue)`. |
| `LookupResultBox.tsx` | Props `{ result, loading, error }`; formatters from `@andriveau-bobine/lookup`. |
| `index.ts` | Barrel exports. |

Query key: `["rues", "lookup", rueId, n, suffix ?? "", provenance]`. Changing suffix or provenance after submit triggers a new fetch. Identical re-submits hit the TanStack cache.

---

## Acceptance criteria (issues #5–#8) — mapping

| Criterion | Slice | Status |
|-----------|-------|--------|
| `@andriveau-bobine/lookup` package; API + web depend on it | 1 ([#5](https://github.com/daniel-lou18/andriveau-bobine/issues/5)) | Met |
| `GET /api/rues/:rueId/lookup` with `n`; tuple range; parity inferred | 1 | Met |
| `200` / `404` / `400` shapes; `apiErrorHandler` + CORS | 1 | Met |
| SPA: suggest → number → submit → triples / messages | 1 | Met |
| Optional `suffix` → `n_rank`; unknown token → `400` | 2 ([#6](https://github.com/daniel-lou18/andriveau-bobine/issues/6)) | Met |
| Dedupe on `(arr, quartier, ilot)`; real `conflict` per ADR-0003 | 3 ([#7](https://github.com/daniel-lou18/andriveau-bobine/issues/7)) | Met |
| `?provenance=1`; provenance UI; default omits field | 4 ([#8](https://github.com/daniel-lou18/andriveau-bobine/issues/8)) | Met |
| HTTP + unit tests at public seams | 1–4 | Met |
| Canonical slice doc (`docs/slices/rue-lookup.md`) | 5 ([#9](https://github.com/daniel-lou18/andriveau-bobine/issues/9)) | Met |

---

## Extensions and remediations

Nothing in v1 lookup required **contract changes** beyond the four planned slices in PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4).

Implementation refinements during delivery:

1. **Slice 3 — `assemble.ts`** — Moved dedupe and `conflict` into a pure module; renamed the DB function to `queryLookupRawRows` so HTTP tests assert JSON shape while unit tests pin assembly rules ([ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md)).
2. **Slice 4 — provenance seam** — `AssembleLookupOptions.provenance` and query columns for `source_entries` were wired without changing `matches` / `conflict` semantics.

---

## Shortcomings and limitations

| Topic | Detail |
|--------|--------|
| **Prefix suggest only** | Rue resolution is suggest-only ([ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md)); no free-text rue on lookup. |
| **Conflict is source-level** | Two sources agreeing on one îlot still yield `conflict: true`; badge wording is generic. |
| **No per-match conflict** | `conflict` is top-level; provenance helps QA attribute triples to bobines manually. |
| **Suffix cap** | Ranks 0–6 (`septies`); tokens beyond that are out of v1 ([DOMAIN_MODEL](../DOMAIN_MODEL.md)). |
| **Provenance order** | Follows SQL `ORDER BY` then assembly iteration; not a separate stable sort contract. |
| **No scan deep links** | Provenance identifies bobine/page; no PDF viewer integration in v1. |
| **Production API URL** | SPA uses relative `/api` in dev (Vite proxy); production Worker URL / `VITE_API_URL` not finalized (see AGENTS.md). |
| **Street-only lookup** | Deferred; lookup always requires resolved `rue_id` + number. |

---

## TDD approach

Principles match [rue-suggest](./rue-suggest.md): **vertical slices**, one behaviour at a time, assert **HTTP status and JSON shape** at integration seams; pure **`assembleLookupResult`** and **`parseLookupInput`** at unit seams.

### Slice 1 tracer ([#5](https://github.com/daniel-lou18/andriveau-bobine/issues/5))

1. HTTP: seed segment covering `n=95` → `200` with one `LookupMatch`, `conflict: false`.
2. Minimal route, `lookupRue`, tuple range query, 1:1 mapping (later replaced by assemble in slice 3).

### Slice 2 ([#6](https://github.com/daniel-lou18/andriveau-bobine/issues/6))

Suffix query param + `parseLookupInput` rank; HTTP cases for `8bis` / miss `ter` / unknown token `400`.

### Slice 3 ([#7](https://github.com/daniel-lou18/andriveau-bobine/issues/7))

`assembleLookupResult` unit tests first (empty, single, multi-ilot, two-source disagree/agree+dedupe); then HTTP fixtures for shared edge and conflict.

### Slice 4 ([#8](https://github.com/daniel-lou18/andriveau-bobine/issues/8))

Provenance on/off in assemble; HTTP `?provenance=1` / default omit / invalid `400`; web hook + result box.

When behaviour changes, extend **tests first** (or in the same PR), then update this file.

---

## Testing

From repo root:

```bash
npm run test:lookup
npm run test -w api
npm run test:watch -w api
npm run test -w web
```

### Package (`packages/lookup/src/`)

| File | What it covers |
|------|----------------|
| `assemble.test.ts` | Pure `assembleLookupResult`: dedupe, conflict, provenance attach/omit/dedupe within match. |
| `parse-input.test.ts` | `parseLookupInput` — parity from `n`, `n_rank` from suffix tokens. |
| `suffix-rank.test.ts` | `rankOfSuffix`, `suffixOfRank`, `SUFFIX_RANK` round-trips. |
| `format.test.ts` | `formatLookupTriple`, `formatLookupProvenance`, key helpers. |

### API (`apps/api/test/`)

| File | What it covers |
|------|----------------|
| `rues_lookup.test.ts` | End-to-end HTTP lookup: match, range, empty, 404, 400 validation, suffix axis, conflict (shared edge, disagree, agree+dedupe), provenance opt-in and parity with conflict. |
| `lookup_schema.test.ts` | `lookupParamsSchema`, `lookupQuerySchema` — Zod coercion and error messages. |
| `apply-migrations.ts` | D1 migrations applied once per run (setup). |

### Web (`apps/web/src/lookup/`)

| File | What it covers |
|------|----------------|
| `useAddressLookup.test.tsx` | Submit-driven query, errors, clear, cache reuse, suffix and provenance passed to `fetchLookup` (mocked `api.ts`, React Query harness). |
| `LookupResultBox.test.tsx` | Conflict badge visibility; provenance `<details>` when present/absent. |

---

## Local manual check

1. Apply local D1 migrations and load extraction data if needed (see [AGENTS.md](../../AGENTS.md)).
2. `npm run dev:api` and `npm run dev:web`.
3. Pick a rue in the suggest box, enter a house number (try a suffix), click **Look up**.
4. Enable **Include provenance** and expand **Provenance** on a match; toggle conflict cases if seeded data allows.

---

## Changelog (high level)

1. **Slice 1 ([#5](https://github.com/daniel-lou18/andriveau-bobine/issues/5))** — `GET /api/rues/:rueId/lookup`, `@andriveau-bobine/lookup` types, tuple range query, `lookupRue`, SPA submit-on-action, HTTP tracer tests.  
2. **Slice 2 ([#6](https://github.com/daniel-lou18/andriveau-bobine/issues/6))** — `suffix` query param + `LOOKUP_SUFFIX_TOKENS`; `parseLookupInput` + SPA `<select>`; suffix HTTP tests.  
3. **Slice 3 ([#7](https://github.com/daniel-lou18/andriveau-bobine/issues/7))** — `assembleLookupResult` dedupe + `conflict`; `queryLookupRawRows`; conflict badge in UI.  
4. **Slice 4 ([#8](https://github.com/daniel-lou18/andriveau-bobine/issues/8))** — `?provenance=1`; provenance projection in assemble; checkbox + expandable provenance in UI.  
5. **Slice 5 ([#9](https://github.com/daniel-lou18/andriveau-bobine/issues/9))** — this document as canonical write-up.

When behaviour changes, extend tests first, then update this file if the contract or limitations shift.
