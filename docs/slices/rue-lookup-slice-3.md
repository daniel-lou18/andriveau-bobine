# Number-bearing lookup — slice 3 (dedupe + conflict)

This document summarizes the **v1 lookup slice 3: dedupe + conflict semantics (ADR-0003)** vertical slice ([GitHub issue #7](https://github.com/daniel-lou18/andriveau-bobine/issues/7)), parent PRD [#4](https://github.com/daniel-lou18/andriveau-bobine/issues/4). It builds on [slice 2](./rue-lookup-slice-2.md) by promoting `lookup/assemble.ts` into the real result builder: dedupe on `(arr, quartier, ilot)` and a top-level `conflict` flag per [ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md).

Related: [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Primary lookup), [ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md).

---

## Purpose

Slice 1–2 returned one row per matching `segment_ilots` join and always set `conflict: false`. Slice 3 implements ADR-0003:

- **Dedupe:** multiple raw rows mapping to the same `(arrondissement, quartier, ilot)` collapse to one `LookupMatch`.
- **Conflict:** `conflict: true` when **more than one distinct `source_entry_id`** contributed to the result set for the lookup. A single source asserting multiple îlots via `segment_ilots` (shared edge / correction) stays `conflict: false`. Two bobines agreeing on the same triple still yields `conflict: true` — the flag measures source multiplicity, not îlot disagreement alone.

The SPA shows an informational **“Sources disagree”** badge when `conflict === true`; the matches list remains visible.

---

## End-to-end user flow

Unchanged from slice 2 for input (`LookupForm`, `useAddressLookup`). The delta is in the response and result UI:

```text
GET /api/rues/:rueId/lookup?n=…&suffix=…
  → 200 { matches: LookupMatch[], conflict: boolean }
  → LookupResultBox: triples + optional conflict badge | no-result | error
```

---

## HTTP contract (delta from slice 2)

| Item           | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Response shape | Unchanged: `{ matches, conflict }`                                |
| `conflict`     | **Real computation** — no longer stubbed                          |
| Dedupe key     | `(arrondissement, quartier, ilot)` on the wire                    |
| Conflict rule  | `distinct(source_entry_id) > 1` across all raw rows before dedupe |

### Conflict semantics (pinned by tests)

| Scenario                                 | `matches` | `conflict` |
| ---------------------------------------- | --------- | ---------- |
| No covering segment                      | `[]`      | `false`    |
| One source, one îlot                     | 1 row     | `false`    |
| One source, multiple îlots (shared edge) | N rows    | `false`    |
| Two sources, different îlots             | 2 rows    | `true`     |
| Two sources, same îlot (deduped)         | 1 row     | `true`     |

---

## Architecture

### Request flow (API)

```text
GET /api/rues/:rueId/lookup?n=…&suffix=…
  → lookup/routes.ts
  → lookupRue(db, rueId, n, suffix)
  → parseLookupInput
  → queryLookupRawRows          (join + tuple range; includes sourceEntryId)
  → assembleLookupResult(rows)  (pure dedupe + conflict)
  → 200 { matches, conflict }
```

`assemble.ts` is a **deep, pure module** — no DB, no HTTP. Provenance attachment (`?provenance=1`) is deferred to slice 4; `AssembleLookupOptions` accepts an optional `provenance` flag for that seam.

### Web flow

```text
LookupResultBox
  → when result.conflict: show badge (“Sources disagree”, tooltip cites ADR-0003)
  → always render matches list when non-empty
```

`LookupForm` and `useAddressLookup` are unchanged.

---

## Implementation overview — API

| Module               | Role                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `lookup/assemble.ts` | **`assembleLookupResult(rows, options?)`** — dedupe by triple, `conflict` from distinct `sourceEntryId`. |
| `lookup/query.ts`    | Renamed to **`queryLookupRawRows`**; selects `sourceEntryId` plus ordering columns.                      |
| `lookup/index.ts`    | Wires query → assemble; exports assemble types.                                                          |

---

## Implementation overview — Web

| Module                     | Change                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| `LookupResultBox.tsx`      | Conflict badge when `result.conflict === true`; matches list unchanged. |
| `LookupResultBox.test.tsx` | Badge visible/hidden behaviour.                                         |

---

## Acceptance criteria (issue #7) — mapping

| Criterion                                                                 | Status |
| ------------------------------------------------------------------------- | ------ |
| Pure `assembleLookupResult` in `lookup/assemble.ts`                       | Met    |
| Dedupe on `(arr, quartier, ilot)`                                         | Met    |
| Single source, multiple îlots → `conflict: false`                         | Met    |
| Two distinct `source_entry_id`s → `conflict: true`                        | Met    |
| `assemble` unit tests (empty, single, multi-ilot, disagree, agree+dedupe) | Met    |
| HTTP integration tests per shape                                          | Met    |
| SPA conflict badge; matches still shown                                   | Met    |
| Badge hidden when `conflict: false`                                       | Met    |

---

## Deliberately out of scope (later slices)

| Behaviour                                             | Slice |
| ----------------------------------------------------- | ----- |
| `?provenance=1` and provenance UI                     | 4     |
| Comprehensive slice doc (`docs/slices/rue-lookup.md`) | 5     |

---

## TDD approach

Built as **vertical slices** on top of slice 2.

### Tracer bullet (assemble unit)

1. **RED:** `assembleLookupResult([])` → `{ matches: [], conflict: false }`.
2. **GREEN:** Minimal `assemble.ts`.

### Subsequent assemble cycles

One unit test at a time:

- Single source, single îlot.
- Single source, multiple îlots (`conflict: false`).
- Two sources disagree (`conflict: true`, two matches).
- Two sources agree on same triple (one deduped match, `conflict: true` per ADR-0003).

### Wiring

- `queryLookupRawRows` returns rows with `sourceEntryId`.
- `lookupRue` calls `assembleLookupResult`.

### HTTP cycles

Integration tests with extended seed helpers:

- `seedLookupSegmentWithIlots` — one segment, many `segment_ilots`.
- `seedAdditionalSourceSegment` — second bobine on same rue (reuses existing îlot row when `ilots.number` is globally unique).

### Web cycle

- **RED:** `LookupResultBox` with `conflict: true` → expect badge + matches.
- **GREEN:** Badge + wrapper; `cleanup()` between renders in tests.

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test -w web
```

### API (`apps/api/test/`)

| File                      | Slice 3 coverage                                                         |
| ------------------------- | ------------------------------------------------------------------------ |
| `lookup_assemble.test.ts` | Pure assemble: empty, single, multi-ilot, two-source disagree/agree.     |
| `rues_lookup.test.ts`     | HTTP fixtures for shared edge, conflict disagree, conflict agree+dedupe. |

### Web (`apps/web/src/lookup/`)

| File                       | Slice 3 coverage                                   |
| -------------------------- | -------------------------------------------------- |
| `LookupResultBox.test.tsx` | Conflict badge visibility; matches list preserved. |

---

## Local manual check

1. `npm run dev:api` and `npm run dev:web`.
2. Look up an address known to hit multiple bobines (or seed conflicting segments locally).
3. Confirm the **Sources disagree** badge appears while îlot triples remain listed.

---

## Shortcomings and limitations (through slice 3)

| Topic                        | Detail                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **No provenance**            | QA trace-back deferred to slice 4.                                                                |
| **Conflict is source-level** | Two sources agreeing on one îlot still flags conflict; badge wording is generic.                  |
| **No per-match conflict**    | Flag is top-level only; client cannot see which triple came from which bobine without provenance. |

When slice 4+ lands, extend tests first, then update this file or fold into `docs/slices/rue-lookup.md`.
