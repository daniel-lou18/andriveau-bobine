# Number-bearing lookup — slice 4 (provenance opt-in)

This document summarizes the **v1 lookup slice 4: provenance opt-in (`?provenance=1`)** vertical slice ([GitHub issue #8](https://github.com/daniel-lou18/andriveau-bobine/issues/8)), parent PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4). It builds on [slice 3](./rue-lookup-slice-3.md) by attaching an opt-in **provenance** projection to each `LookupMatch` so QA reviewers can trace a hit back to the scanned register row.

Related: [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Primary lookup, canonical SQL), [ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md) (provenance is opt-in).

---

## Purpose

Slices 1–3 return administrative triples and a top-level `conflict` flag only. Slice 4 adds **register traceability** behind a query flag:

- **`?provenance=1`** — each match may include a `provenance` array of `{ bobine, page, sequence, raw_text }` rows from `source_entries`.
- **Default (omitted or `provenance=0`)** — the `provenance` field is **omitted entirely** on each match (not `[]` or `null`), keeping the common payload narrow.
- **Dedupe and conflict** from slice 3 are unchanged; only the optional provenance projection differs.

The SPA adds an **“Include provenance”** checkbox on `LookupForm` and an expandable provenance block per match in `LookupResultBox` when data is present.

---

## End-to-end user flow

```text
RueSuggestBox → resolvedRue
  → LookupForm: n, optional suffix, optional “Include provenance” → submit
  → GET /api/rues/:rueId/lookup?n=…&suffix=…&provenance=1   (flag omitted when unchecked)
  → LookupResultBox: triples + optional conflict badge + optional provenance <details>
```

Toggling the checkbox and re-submitting changes the TanStack Query key (`provenance` is part of `lookupKeys.search`), so a new fetch runs.

---

## HTTP contract (delta from slice 3)

| Item | Value |
|------|--------|
| Query (new) | `provenance` — optional boolean: `1` ⇒ `true`, omitted or `0` ⇒ `false` |
| Invalid value | `400` with `{ "error": "provenance must be 0 or 1" }` |
| Response (default) | `{ matches, conflict }` — each match has **no** `provenance` property |
| Response (`provenance=1`) | Same `matches` / `conflict` as default; each match may include `provenance: LookupProvenance[]` |
| Provenance fields | `bobine`, `page`, `sequence`, `raw_text` per [DOMAIN_MODEL](../DOMAIN_MODEL.md) |
| Per-match dedupe | Provenance entries deduped on `(bobine, page, sequence, raw_text)` within each match group |

Example:

```http
GET /api/rues/42/lookup?n=95&provenance=1
```

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

### Provenance vs conflict (pinned by tests)

| Scenario | `matches` / `conflict` | `provenance` (when `=1`) |
|----------|------------------------|---------------------------|
| Same as slice 3 | Identical with or without the flag | Only field that changes |
| One source, two îlots (shared edge) | 2 matches, `conflict: false` | Each match gets one provenance entry (same source, same row) |
| Two sources, same îlot (deduped) | 1 match, `conflict: true` | One match with **two** provenance entries (distinct bobines) |
| Two `segment_ilots` rows, same source + triple | 1 match | One provenance entry (deduped within match) |

---

## Architecture

### Request flow (API)

```text
GET /api/rues/:rueId/lookup?n=…&suffix=…&provenance=…
  → lookup/routes.ts
  → lookupQuerySchema          (provenance boolean)
  → lookupRue(db, rueId, n, suffix, provenance)
  → parseLookupInput
  → queryLookupRawRows          (join includes source_entries columns)
  → assembleLookupResult(rows, { provenance })
  → 200 { matches, conflict }
```

The base join is unchanged from slice 3: `street_segments → source_entries → segment_ilots → ilots → quartiers → arrondissements`. `queryLookupRawRows` always selects provenance columns; `assembleLookupResult` attaches them only when `options.provenance === true`.

### Web flow

```text
LookupForm
  → checkbox → submit({ …, provenance: true }) when checked
useAddressLookup
  → lookupQueryOptions(…, provenance) → fetchLookup(…, provenance)
LookupResultBox
  → <details> per match when match.provenance?.length > 0
```

---

## Implementation overview — API

| Module | Role |
|--------|------|
| `lookup/schema.ts` | `provenance` query param: `1` / `0` / omitted; reject other values. |
| `lookup/query.ts` | Returns raw rows with `bobine`, `page`, `sequence`, `raw_text` plus triple + `sourceEntryId`. |
| `lookup/assemble.ts` | When `provenance: true`, groups rows by triple and **`dedupeProvenance`** on the four fields; omits property when false. |
| `lookup/index.ts` | Passes `provenance` into `assembleLookupResult`. |
| `lookup/routes.ts` | Reads `provenance` from validated query. |

---

## Implementation overview — Web

| Module | Change |
|--------|--------|
| `api.ts` | Appends `provenance=1` to `URLSearchParams` when requested. |
| `lookupQuery.ts` | Query key includes `provenance`; `queryFn` passes flag to `fetchLookup`. |
| `useAddressLookup.ts` | `LookupSubmitInput.provenance`; wires into `lookupQueryOptions`. |
| `LookupForm.tsx` | “Include provenance” checkbox. |
| `LookupResultBox.tsx` | Expandable provenance section per match when present. |

---

## Shared package (`packages/lookup`)

| Export | Role |
|--------|------|
| `LookupProvenance` | `{ bobine, page, sequence, raw_text }` |
| `LookupMatch.provenance` | Optional **`LookupProvenance[]`** (array per match; only when opt-in) |

---

## Acceptance criteria (issue #8) — mapping

| Criterion | Status |
|-----------|--------|
| `?provenance=1` returns `provenance` array per match; default omits field | Met |
| Each entry has `bobine`, `page`, `sequence`, `raw_text` | Met |
| Provenance deduped on `(bobine, page, sequence, raw_text)` within each match | Met |
| `matches` and `conflict` identical with/without flag | Met |
| `assemble` unit tests (on/off, single/multi dedupe within match) | Met |
| HTTP tests (canonical fields, default omit, invalid → 400) | Met |
| SPA checkbox; toggle + submit refetches | Met |
| `LookupResultBox` provenance expansion only when present | Met |
| Hook test: `provenance=true` → `fetchLookup(…, true, …)` | Met |

---

## Deliberately out of scope (later slices)

| Behaviour | Slice |
|-----------|-------|
| Comprehensive slice doc (`docs/slices/rue-lookup.md`) | 5 |

---

## TDD approach

Built as **vertical slices** on top of slice 3.

### Tracer bullet (assemble unit)

1. **RED:** `assembleLookupResult([row], { provenance: true })` → match includes `provenance: [{ bobine, page, sequence, raw_text }]`.
2. **GREEN:** `dedupeProvenance` + attach in `assembleLookupResult`.

### Subsequent assemble cycles

- Two raw rows, same triple and same provenance → one provenance entry (segment_ilots dedupe).
- `provenance` option false / omitted → `expect(match).not.toHaveProperty("provenance")`.

### Wiring

- `lookupQuerySchema` + route pass `provenance` into `lookupRue`.
- `queryLookupRawRows` maps through `source_entries` columns (join already present from slice 3 prep).

### HTTP cycles

- `?provenance=1` on seeded segment → canonical provenance fields.
- Default lookup → no `provenance` key on match objects.
- `provenance=yes` / `2` / `true` → 400.
- Conflict fixture with and without flag → same `matches`/`conflict`, provenance only on opt-in.

### Web cycles

- **RED:** `useAddressLookup` submit with `provenance: true` → fifth arg `true` to `fetchLookup`.
- **RED:** `LookupResultBox` with `match.provenance` → `lookup-provenance` test id.
- **GREEN:** Checkbox, `<details>`, query key segment.

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test -w web
```

### API (`apps/api/test/`)

| File | Slice 4 coverage |
|------|------------------|
| `lookup_assemble.test.ts` | Provenance on/off; dedupe within match. |
| `rues_lookup.test.ts` | `?provenance=1`, default omit, 400 on invalid, parity with conflict fixtures. |

### Web (`apps/web/src/lookup/`)

| File | Slice 4 coverage |
|------|------------------|
| `useAddressLookup.test.tsx` | Submit with `provenance: true`. |
| `LookupResultBox.test.tsx` | Provenance `<details>` visible/hidden. |

---

## Local manual check

1. `npm run dev:api` and `npm run dev:web`.
2. Resolve a rue, enter a house number that returns a match.
3. Check **Include provenance**, submit — expand **Provenance** under a match and confirm bobine/page/raw text.
4. Uncheck, submit again — provenance block disappears; triples and conflict badge unchanged.

---

## Shortcomings and limitations (through slice 4)

| Topic | Detail |
|-------|--------|
| **QA-only payload** | Provenance bloats responses; kept off by default per ADR-0003. |
| **No per-match conflict** | `conflict` remains top-level; provenance helps manual QA, not automated resolution. |
| **Provenance order** | Order follows raw row iteration after SQL `ORDER BY`; not a separate stable sort contract. |
| **No link to scan assets** | `bobine`/`page` are identifiers only; no deep link to PDF pages in v1. |

When slice 5 lands, fold slices 1–4 into `docs/slices/rue-lookup.md` or keep these slice docs as historical tracer bullets.
