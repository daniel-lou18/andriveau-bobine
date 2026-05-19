# Number-bearing lookup — slice 1 (tracer bullet)

This document summarizes the **v1 lookup slice 1: tracer-bullet happy path** vertical slice ([GitHub issue #5](https://github.com/daniel-lou18/andriveau-bobine/issues/5)), parent PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4). It wires number-bearing lookup end-to-end with the **final HTTP contract** but the simplest possible matching and assembly.

A comprehensive write-up covering later slices (suffix, dedupe/conflict, provenance) is planned for slice 5 as `docs/slices/rue-lookup.md`.

Related: [ADR-0002: strict lookup with `rue_id`](../adr/0002-strict-lookup-api-with-rue-id.md), [ADR-0003: deduped response with conflict flag](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md), [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Primary lookup, Suffix Axis Model, canonical SQL).

---

## Purpose

After the user picks a canonical **rue** via the existing suggest slice, they can enter a house number, submit, and see the resulting `(arrondissement, quartier, ilot)` matches — or a clear no-result / error message.

Slice 1 delivers the full request/response shape from day 1 but deliberately omits suffix input, deduplication, real conflict computation, and provenance. Those ship in slices 2–4.

---

## End-to-end user flow

```text
RueSuggestBox → user picks suggestion → resolvedRue (opaque rueId)
  → LookupForm: enter positive n → submit
  → GET /api/rues/:rueId/lookup?n=…
  → LookupResultBox: triples | no-result message | error
```

The SPA never sends `parity` (inferred server-side from `n`) and never sends a suffix (`n_rank` is always `0` until slice 2).

---

## HTTP contract (slice 1)

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/rues/:rueId/lookup` |
| Path param | `rueId` — positive integer |
| Query | `n` — required positive integer house number |
| Parity | Inferred server-side: `n % 2 === 0 ? "even" : "odd"` |
| Suffix | Not accepted on input; `n_rank` fixed at `0` |
| Provenance | Not accepted (`?provenance=1` deferred to slice 4) |
| Success | `200` with `{ "matches": LookupMatch[], "conflict": false }` |
| No segment match | `200` with `{ "matches": [], "conflict": false }` (rue exists) |
| Unknown rue | `404` with `{ "error": "rue not found" }` |
| Bad input | `400` with `{ "error": string }` — missing/non-positive `n`, non-numeric/non-positive `rueId` |

### `LookupMatch` shape (success)

```json
{
  "arrondissement": 6,
  "quartier": "Notre-Dame-des-Champs",
  "ilot": 4121
}
```

`conflict` is always `false` in slice 1. The field is present in the contract from day 1; slice 3 sharpens its semantics without breaking the shape.

Types live in **`@andriveau-bobine/lookup`** (`packages/lookup/`). Both `apps/api` and `apps/web` depend on this workspace package.

Local dev: Vite proxies `/api` to the Worker; the web slice uses relative URLs.

Errors go through the Worker-wide **`apiErrorHandler`** (`apps/api/src/http/on-error.ts`). Zod validation failures throw `HTTPException` with a logged **`cause`**; the response body stays `{ "error": string }` only.

---

## Architecture

### Request flow (API)

```text
GET /api/rues/:rueId/lookup?n=…
  → lookup/routes.ts          (Hono sub-app, mounted under /api/rues)
  → jsonErrorValidator        (lookupParamsSchema + lookupQuerySchema)
  → lookupRue(db, rueId, n)   (existence check on rues.id)
  → parseLookupInput(n)       (parity + n_rank=0)
  → queryLookupMatches        (canonical tuple range predicate + joins)
  → map rows 1:1 → LookupMatch (no dedupe, no provenance)
  → 200 { matches, conflict: false }
```

The root app mounts suggest and lookup on the same prefix:

```text
app.route("/api/rues", suggestRoutes);
app.route("/api/rues", lookupRoutes);
```

DB injection remains global middleware (`c.set("db", …)`).

### Range matching (day 1)

Slice 1 uses the **canonical DOMAIN_MODEL range predicate** even though suffix rank is always zero:

```sql
WHERE s.rue_id = :rue_id
  AND s.parity = :parity
  AND (s.from_number, s.from_suffix_rank) <= (:n, :n_rank)
  AND (:n, :n_rank) <= (s.to_number, s.to_suffix_rank)
```

Implemented in Drizzle as row-value comparisons in `lookup/query.ts`. Results are ordered by `se.bobine`, `se.page`, `COALESCE(se.sequence, 0)`, `i.number` per DOMAIN_MODEL.

### Shared package (`packages/lookup`)

| Export | Role |
|--------|------|
| `SuffixToken` | Canonical suffix union (published from day 1; wired in slice 2) |
| `LookupMatch` | One `(arrondissement, quartier, ilot)` triple |
| `LookupProvenance` | Opt-in provenance shape (populated in slice 4) |
| `LookupResponse` | `{ matches, conflict }` — always a list, never a scalar |

### Web flow

```text
useAddressLookup()
  → internal submitted { rueId, n } state (null until submit)
  → useQuery(lookupQueryOptions) when submitted !== null
  → result | loading | error | submit | clear

LookupForm({ resolvedRue, lookup })     — number input + submit (gated)
LookupResultBox({ lookup })             — triples | no-result | error
```

`App.tsx` composes `RueSuggestBox` + `LookupForm` + `LookupResultBox`, threading `disambiguation.resolvedRue` into the form.

---

## Implementation overview — API (`apps/api/src/lookup/`)

| Module | Role |
|--------|------|
| `routes.ts` | `GET /:rueId/lookup` — param + query validation, 404 on missing rue. |
| `schema.ts` | `lookupParamsSchema`, `lookupQuerySchema` — coerce positive integers. |
| `parse-input.ts` | `parseLookupInput(n)` — parity inference, `n_rank: 0`. |
| `query.ts` | `queryLookupMatches` — Drizzle join + tuple range filter. |
| `index.ts` | **`lookupRue(db, rueId, n)`** — existence check, assembly, `conflict: false`. |

Also added: `http/errors.ts` → `notFound(message)` for 404 responses.

---

## Implementation overview — Web (`apps/web/src/lookup/`)

| Module | Role |
|--------|------|
| `api.ts` | `fetchLookup(rueId, n)` — `GET /api/rues/:rueId/lookup` via Vite proxy. |
| `lookupQuery.ts` | TanStack Query `queryOptions` + `lookupKeys` factory (`enabled: false` in options; hook sets `enabled` on submit; `staleTime` 60s, `retry: false`). |
| `useAddressLookup.ts` | Submit-on-action hook: `submit(input)` drives query; `clear()` resets; exposes `result`, `loading`, `error`. |
| `LookupForm.tsx` | `type="number"` input (`min={1}`), submit button; disabled until `canSubmitLookup(resolvedRue)` and positive `n`. |
| `LookupResultBox.tsx` | Lists triples; no-result copy for `200 { matches: [] }`; `role="alert"` for 404/400 errors. |
| `index.ts` | Barrel exports. |

Submit reuses the TanStack cache for identical `(rueId, n)` re-submits (same query key after `clear()` → `submit()`).

---

## Acceptance criteria (issue #5) — mapping

| Criterion | Status |
|-----------|--------|
| `@andriveau-bobine/lookup` package; both apps depend on it | Met |
| `200 { matches, conflict: false }` for covering segment | Met |
| `200 { matches: [], conflict: false }` when rue exists but no segment | Met |
| `404 { error }` for unknown `rue_id` | Met |
| `400 { error }` for bad `n` or `rueId` | Met |
| Tuple range matching with `n_rank = 0` | Met |
| Parity inferred server-side; SPA never sends `parity` | Met |
| SPA: resolve rue → enter n → submit → see triples or messages | Met |
| Cache reuse on identical re-submit | Met |
| HTTP integration tests (singleton, mid-range, empty, 404, 400) | Met |
| Unit tests: `parse-input`, `lookup_schema`, `useAddressLookup` | Met |
| CORS + `apiErrorHandler` same as suggest | Met |

---

## Deliberately out of scope (later slices)

| Behaviour | Slice |
|-----------|-------|
| Suffix input (`bis`, `ter`, …) and `n_rank` from token | 2 |
| Dedupe on `(arr, quartier, ilot)` and real `conflict` computation | 3 |
| `?provenance=1` and provenance UI | 4 |
| Comprehensive slice doc (`docs/slices/rue-lookup.md`) | 5 |

---

## TDD approach

Built as **vertical slices**: one behaviour → one test → minimal code → green → next.

### Tracer bullet

1. HTTP integration test: seed one odd segment covering `n=95` → expect `200` with one `LookupMatch` and `conflict: false`. Initially failed with `404` (route missing).
2. Minimal implementation: shared types package, Hono route, `parseLookupInput`, tuple range query, 1:1 row mapping.

### Subsequent API cycles

Added one integration test at a time: mid-range even match, empty matches, 404 unknown rue, 400 validation cases. All passed without further implementation changes.

### Unit tests

- `lookup_parse_input.test.ts` — parity inference, `n_rank` default.
- `lookup_schema.test.ts` — Zod param/query validation.

### Web cycle

- `useAddressLookup.test.tsx` — no fetch until submit; submit → result; error surfacing; clear; cache reuse on identical re-submit (mocked `api.ts`, React Query test harness).

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test -w web
```

### API (`apps/api/test/`)

| File | What it covers |
|------|----------------|
| `rues_lookup.test.ts` | End-to-end HTTP lookup contract (match, mid-range, empty, 404, 400). |
| `lookup_parse_input.test.ts` | `parseLookupInput` — parity, `n_rank`. |
| `lookup_schema.test.ts` | `lookupParamsSchema`, `lookupQuerySchema`. |

### Web (`apps/web/src/lookup/`)

| File | What it covers |
|------|----------------|
| `useAddressLookup.test.tsx` | Submit-driven query, errors, clear, TanStack cache reuse. |

---

## Local manual check

1. Apply local D1 migrations and load extraction data if needed (see AGENTS.md).
2. `npm run dev:api` and `npm run dev:web`.
3. Pick a rue in the suggest box, enter a house number, click **Look up**.

---

## Shortcomings and limitations (slice 1)

| Topic | Detail |
|--------|--------|
| **No dedupe** | Two segments resolving to the same triple appear as duplicate rows until slice 3. |
| **`conflict` stub** | Always `false`; multi-source disagreement is not detected yet. |
| **No suffix** | `8bis` cannot be distinguished from `8`; tuple ranks are `(n, 0)` only. |
| **No provenance** | QA cannot trace a hit back to bobine/page/raw_text from the UI yet. |
| **1:1 row mapping** | Every matching `segment_ilots` row becomes one response row (no aggregation). |

When behaviour changes in later slices, extend tests first, then update this file or supersede it with `docs/slices/rue-lookup.md`.
