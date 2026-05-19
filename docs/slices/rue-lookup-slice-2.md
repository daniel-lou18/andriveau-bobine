# Number-bearing lookup — slice 2 (suffix axis)

This document summarizes the **v1 lookup slice 2: suffix axis end-to-end** vertical slice ([GitHub issue #6](https://github.com/daniel-lou18/andriveau-bobine/issues/6)), parent PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4). It builds on [slice 1](./rue-lookup-slice-1.md) by wiring the canonical suffix-rank table through the lookup contract so users can resolve `bis`, `ter`, `quater`, `quinquies`, `sexies`, and `septies` qualifiers on a house number.

Related: [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Suffix Axis Model, canonical SQL tuple comparison), [EXTRACTION.md](../EXTRACTION.md) (suffix ranks), `apps/api/src/lib/suffix.ts`.

---

## Purpose

Paris register rows often distinguish sub-positions on the same house number (`8`, `8bis`, `8ter`, …). Slice 1 matched on `(n, n_rank=0)` only. Slice 2 accepts an optional **`suffix`** query parameter, maps it to **`n_rank`** via the existing rank table, and lets the tuple range predicate from slice 1 do the rest — no query rewrite required.

Parity remains derived from **`n` alone** (`8bis` is still `even` because `8 % 2 === 0`).

---

## End-to-end user flow

```text
RueSuggestBox → resolvedRue
  → LookupForm: enter n, optionally pick suffix from <select> → submit
  → GET /api/rues/:rueId/lookup?n=…&suffix=…   (suffix omitted when “(none)”)
  → LookupResultBox: triples | no-result | error
```

Changing only the suffix after submit triggers a new fetch (distinct TanStack Query key). Identical `(rueId, n, suffix)` re-submits hit the cache.

---

## HTTP contract (delta from slice 1)

| Item | Value |
|------|--------|
| Query (new) | `suffix` — optional; one of `bis \| ter \| quater \| quinquies \| sexies \| septies` |
| Omitted / empty | Equivalent to rank `0` (no suffix); slice 1 behaviour unchanged |
| Unknown token | `400` with `{ "error": "suffix must be one of: … (or omitted for no suffix)" }`; Zod `cause` logged |
| Parity | Still inferred from `n` only — suffix does not affect parity |
| Range match | Tuple `(n, n_rank)` where `n_rank = rankOfSuffix(suffix ?? "")` |

Example:

```http
GET /api/rues/42/lookup?n=8&suffix=bis
```

matches a segment whose stored range covers `(8, 1)` on the canonical axis, e.g. `(from_number, from_suffix_rank) = (8, 0)` through `(to_number, to_suffix_rank) = (8, 1)`.

### Canonical ordering examples

| Segment range | Matches | Does not match |
|---------------|---------|----------------|
| `8 → 8bis` (ranks 0–1) | `n=8` (no suffix), `n=8&suffix=bis` | `n=8&suffix=ter` |
| Singleton `8` (rank 0 only) | `n=8` | `n=8&suffix=bis` |
| `10 → 10bis` (ranks 0–1) | `n=10&suffix=bis` | `n=10&suffix=ter` |

Response shape is unchanged from slice 1: `{ matches: LookupMatch[], conflict: false }`.

---

## Architecture

### Request flow (API)

```text
GET /api/rues/:rueId/lookup?n=…&suffix=…
  → lookup/routes.ts
  → lookupQuerySchema          (optional suffix; reject unknown tokens)
  → lookupRue(db, rueId, n, suffix)
  → parseLookupInput(n, suffix) → rankOfSuffix from lib/suffix.ts
  → queryLookupMatches         (unchanged tuple comparison from slice 1)
  → 200 { matches, conflict: false }
```

The range query in `lookup/query.ts` was already written for `(n, n_rank)`; slice 2 is mostly **plumbing** from the HTTP seam through `parseLookupInput`.

### Shared package (`packages/lookup`)

Slice 1 published `SuffixToken` (including `""` for rank 0). Slice 2 adds the **non-empty token list** used by validation and the SPA `<select>`:

| Export | Role |
|--------|------|
| `LOOKUP_SUFFIX_TOKENS` | Readonly array: `bis`, `ter`, …, `septies` — single source of truth |
| `LookupSuffixToken` | Element type of `LOOKUP_SUFFIX_TOKENS` |

The Worker Zod schema imports `LOOKUP_SUFFIX_TOKENS` for `z.enum(…)`; `LookupForm` maps the same array to `<option>` elements.

Rank mapping itself stays in **`apps/api/src/lib/suffix.ts`** (`rankOfSuffix`, `SUFFIX_RANK`) — already tested by the loader and extraction paths; lookup reuses it rather than duplicating the table.

### Web flow

```text
LookupForm
  → suffix <select>: “(none)” | LOOKUP_SUFFIX_TOKENS
  → lookup.submit({ rueId, n, suffix? })

useAddressLookup
  → lookupQueryOptions(rueId, n, suffix)
  → lookupKeys.search(rueId, n, suffix ?? "")
  → fetchLookup(rueId, n, suffix) → URLSearchParams with suffix when set
```

---

## Implementation overview — API

| Module | Change |
|--------|--------|
| `lookup/schema.ts` | Optional `suffix` via `z.preprocess` + `z.enum(LOOKUP_SUFFIX_TOKENS)`; empty/omitted → `undefined`. |
| `lookup/parse-input.ts` | Accepts optional `suffix`; `n_rank = rankOfSuffix(suffix ?? "")`; parity unchanged. |
| `lookup/index.ts` | `lookupRue(…, suffix?)` passes suffix to `parseLookupInput`. |
| `lookup/routes.ts` | Destructures `suffix` from validated query. |
| `lookup/query.ts` | **No change** — tuple SQL already parameterized on `input.n_rank`. |

---

## Implementation overview — Web

| Module | Change |
|--------|--------|
| `lookup/api.ts` | `fetchLookup(rueId, n, suffix?, signal)` — appends `&suffix=…` when present. |
| `lookup/lookupQuery.ts` | Query key and `queryFn` include `suffix`. |
| `lookup/useAddressLookup.ts` | `LookupSubmitInput` gains optional `suffix`. |
| `LookupForm.tsx` | Suffix `<select>` with `(none)` default; populated from `LOOKUP_SUFFIX_TOKENS`. |

`LookupResultBox` is unchanged — it renders whatever triples the API returns.

---

## Acceptance criteria (issue #6) — mapping

| Criterion | Status |
|-----------|--------|
| `LOOKUP_SUFFIX_TOKENS` exported from shared package | Met |
| `?n=8&suffix=bis` matches segment covering `(8, 1)` | Met |
| Canonical ordering on range endpoints (8→8bis, singleton 8, 10→10bis) | Met |
| Unknown suffix → 400 naming allowed tokens; Zod cause logged | Met |
| Omitted/empty suffix equivalent to rank 0 | Met |
| SPA suffix `<select>` from shared package; submit passes `suffix` | Met |
| Cache on identical `(rueId, n, suffix)`; new fetch when suffix changes | Met |
| `lookup_schema` unit tests | Met |
| `parse-input` unit tests (rank mapping, parity invariance) | Met |
| HTTP integration tests (bis match, ter miss, singleton 8, 10bis cap, 400) | Met |
| Hook test: submit with suffix reaches fetch | Met |

---

## Deliberately out of scope (later slices)

| Behaviour | Slice |
|-----------|-------|
| Dedupe on `(arr, quartier, ilot)` and real `conflict` computation | 3 |
| `?provenance=1` and provenance UI | 4 |
| Comprehensive slice doc (`docs/slices/rue-lookup.md`) | 5 |

---

## TDD approach

Built as **vertical slices** on top of slice 1.

### Tracer bullet (RED → GREEN)

1. **RED:** HTTP test — segment `8 → 8bis`, request `n=8&suffix=ter` → expect `{ matches: [] }`. Failed while suffix was ignored (`n_rank` stuck at 0, `(8,0)` still in range).
2. **GREEN:** Wire `suffix` through schema → `parseLookupInput` → `rankOfSuffix`; existing tuple query picked up `n_rank=2` with no SQL change.
3. Confirm positive case: `n=8&suffix=bis` → one match on same segment.

### Subsequent API cycles

One integration test at a time:

- `suffix=bis` does **not** match singleton `8` (rank 0 only).
- `10 → 10bis`: `10bis` matches, `10ter` does not.
- `octies`, `foo`, `1` → 400 with message naming allowed tokens.

### Unit tests

- `lookup_parse_input.test.ts` — rank mapping per token; `8bis` parity still `even`.
- `lookup_schema.test.ts` — canonical acceptance, empty/omitted, unknown rejection.

### Web cycle

- Hook test: `submit({ suffix: "bis" })` → `fetchLookup(42, 8, "bis", signal)`.
- Hook test: change suffix only → second fetch; identical triple → cache hit.

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test -w web
```

### API (`apps/api/test/`)

| File | Slice 2 coverage |
|------|------------------|
| `rues_lookup.test.ts` | Suffix HTTP cases (bis match, ter miss, singleton 8, 10bis cap, 400 unknown). Seed helper extended with `fromSuffixRank` / `toSuffixRank`. |
| `lookup_parse_input.test.ts` | Suffix → `n_rank`; parity invariance under suffix. |
| `lookup_schema.test.ts` | Canonical / empty / unknown `suffix` validation. |

Existing `suffix.test.ts` continues to cover `rankOfSuffix` / `SUFFIX_RANK` at the lib layer.

### Web (`apps/web/src/lookup/`)

| File | Slice 2 coverage |
|------|------------------|
| `useAddressLookup.test.tsx` | Submit with suffix; refetch when suffix changes; cache reuse includes `suffix` in key. |

---

## Local manual check

1. `npm run dev:api` and `npm run dev:web`.
2. Pick a rue with suffix-aware segments in local D1 (or load extraction JSON).
3. Enter `8`, choose **bis**, submit — expect a match when the bobine records `8 → 8bis`.
4. Switch suffix to **ter** on the same number — expect no result (or a different segment if the data covers it).

---

## Shortcomings and limitations (through slice 2)

| Topic | Detail |
|--------|--------|
| **No dedupe** | Duplicate triples still possible until slice 3. |
| **`conflict` stub** | Always `false`. |
| **No provenance** | QA trace-back deferred to slice 4. |
| **Closed token set** | Tokens beyond `septies` are rejected at the API (same as loader/extraction policy). |
| **UI suffix list** | `<select>` only — no free-text suffix field (by design; prevents unsupported tokens client-side). |

When slice 3+ lands, extend tests first, then update this file or fold into `docs/slices/rue-lookup.md`.
