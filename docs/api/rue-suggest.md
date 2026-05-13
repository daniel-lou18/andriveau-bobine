# Rue suggest (autocomplete) — implementation notes

This document summarizes the **v1 read API: rue suggest** vertical slice (GitHub issue #2), how it was built and tested, what was extended after the first ship, and known limitations.

Related: [ADR-0002: strict lookup with `rue_id`](../adr/0002-strict-lookup-api-with-rue-id.md), [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) (Suggest section, normalized form, `voie_types`).

---

## Purpose

Help the user pick a canonical **rue** before number-bearing lookup: type a fragment, see up to 20 suggestions, each `{ rue_id, type, libelle }`, with behaviour aligned to stored `libelle_normalized` and ADR-0002.

The public route stays separate from the authenticated extraction loader (`POST /api/_loader/extraction`).

---

## HTTP contract

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/rues/suggest` |
| Query | `q` — raw user string (trimmed/normalized server-side) |
| Min length | 2 characters **after** aggressive normalization (see below) |
| Too short | `400` with JSON `{ "error": string }` |
| Success | `200` with `{ "results": [ { "rue_id", "type", "libelle" }, ... ] }` |
| Cap | 20 rows |
| Order | `libelle` ascending, tie-break `rue_id` ascending |

Local dev: the Vite app proxies `/api` to the Worker; the web slice calls `/api/rues/suggest` with a relative URL.

---

## Implementation overview

### Worker layout (`apps/api/src`)

| Piece | Role |
|--------|------|
| `index.ts` | Registers `GET /api/rues/suggest`, injects `db`, returns JSON from `suggestRues`. |
| `suggest/rues_suggest.ts` | Use case: normalize `q`, validate length, build `WHERE`, query Drizzle, map `type` for display. |
| `suggest/libelle_prefix_expand.ts` | Curated French libellé leading chains + `expandNormalizedLibelleSuggestPrefixes`. |
| `lib/normalize.ts` | Single `normalizeName` — same rules as `rues.libelle_normalized` (DOMAIN_MODEL). |
| `lib/voie_type_display.ts` | `displayVoieType(code)` for API `type` field (word-wise title-case on canonical `code`). |

### Matching logic (two families OR’d together)

1. **Libellé-only (indexed column)**  
   For each prefix in `expandNormalizedLibelleSuggestPrefixes(normalizeName(q))`,  
   `rues.libelle_normalized LIKE <escaped-prefix>% ESCAPE '\'`.

2. **Full voie key**  
   SQLite concatenation of canonical `voie_types.code`, a single space, and `rues.libelle_normalized`, compared with `LIKE` on the escaped normalized query plus `%`.  
   Matches user input that already includes the canonical type token (e.g. `rue de rennes`, `rue de la`).

`escapeLikeFragment` escapes `\`, `%`, `_` in bound fragments so user input cannot inject `LIKE` wildcards.

### Article expansion (libellé branch)

Many Paris libellés start with **de / du / des / de la / …** while users often type the distinctive tail first (`vau` → **de Vaugirard**).

- **`LIBELLE_LEADING_ARTICLE_CHAINS`**: longest-first curated list (not read from JSON at runtime).  
- **`expandNormalizedLibelleSuggestPrefixes`**: always includes the normalized fragment; for each chain `art`, adds `art + " " + fragment` unless the fragment already equals `art` or starts with `art + " "` (avoids `de de vau` when the user typed `de vau`).

New openers discovered in extraction should be added here at **dev time** (optionally validated by scanning `data/extracted-tables/*.json` in a script or review checklist).

### Web slice (`apps/web/src`)

| Piece | Role |
|--------|------|
| `rue-suggest/api.ts` | `fetchRueSuggestions`, `formatSuggestionLabel`. |
| `rue-suggest/RueSuggestBox.tsx` | Debounced fetch when `q.length ≥ 2`, listbox UX, stores chosen `rue_id` + display label. |
| `App.tsx` | Demo wiring. |

---

## Acceptance criteria (issue #2) — mapping

| Criterion | Status |
|-----------|--------|
| Public suggest route, documented query param `q` | Met — this file + ADR-0002 narrative. |
| Min length 2, cap 20, prefix-oriented match, alphabetical + `rue_id` tie-break | Met. |
| Same normalization as `libelle_normalized` | Met — `normalizeName`. |
| Response shape `{ rue_id, type, libelle }` | Met. |
| Web: type fragment, proxy, pick row, keep `rue_id` in state | Met (`RueSuggestBox`). |
| Automated tests for contract and normalization edge cases | Met — see Testing. |
| Read route separate from loader | Met. |

Post–issue #2 product tweaks (full street phrase and type-leading browse) are documented below as extensions, with tests.

---

## TDD approach

Principles followed: **vertical slices**, one behaviour at a time, assert **HTTP status and JSON shape** (and ordering where relevant), not raw SQL strings.

1. **Harness** — `@cloudflare/vitest-pool-workers`, `vitest.config.ts`, `test/apply-migrations.ts` applying `drizzle/*.sql` to isolated D1, `SELF.fetch` against the Worker.
2. **Tracer** — empty DB, `q=ab` → `200`, `{ results: [] }`.
3. **Min length** — `q=a` → `400`.
4. **Shape + prefix** — seeded rows, `ras` → Boulevard Raspail.
5. **Cap 20** — 25 matches → 20 rows.
6. **Order + tie-break** — shared libellé, different types → `libelle` then `rue_id`.
7. **Normalization** — accents, apostrophe, hyphen (DOMAIN_MODEL examples).
8. **Substring guard** — `gir` does not match **de Vaugirard** (still prefix-only on each expanded candidate).
9. **LIKE injection** — `%` in `q` escaped → no spurious matches.
10. **Pure unit tests** — `expandNormalizedLibelleSuggestPrefixes` in `test/libelle_prefix_expand.test.ts` (no `de de …`, `du du …`, `de la forge` from `la forge`, longest-first invariant).

Later cycles added article expansion and full-key matching with new integration tests before implementation (red → green).

---

## Extensions and remediations

### 1. Libellé articles (`vau` → **de Vaugirard**)

**Issue:** Prefix on `libelle_normalized` only; `vau` does not prefix `de vaugirard`.

**Remediation:** `libelle_prefix_expand.ts` + OR of libellé `LIKE` clauses. Tests updated: `vau` returns **Vauvenargues** and **de Vaugirard**; `gir` still returns nothing on **de Vaugirard**.

### 2. Full phrase and type-leading input (`rue de rennes`, `rue de la …`)

**Issue:** Users paste or type **type + libellé**; libellé-only matching never saw `rue` in the indexed column.

**Remediation:** OR branch on `(code || ' ' || libelle_normalized)` with the same escaped `q` prefix. Tests: `rue de rennes` → Rue **de Rennes** only; `rennes` still finds libellé matches; `rue de la` → three **Rue de la …** rows, excluding Boulevard **de la Tour**.

### 3. Test data false positive (`rue de la` vs **de Laborde**)

**Issue:** Under plain `LIKE` prefix rules, the query `rue de la` also prefixes the full key for **Rue de Laborde** (`rue de laborde` shares the prefix `rue de la` before diverging).

**Remediation:** Seeded **de Lorient** instead of **de Laborde** in the `rue de la` integration test so expectations stay stable. This is a **prefix matching** limitation, not a mistake in the OR design.

---

## Shortcomings and limitations

| Topic | Detail |
|--------|--------|
| **Prefix semantics** | All matching is `LIKE 'prefix%'`. Short queries can still prefix-match unintended rows (e.g. `rue de la` vs **Rue de Laborde**). Mitigation: user types more characters; cap 20 limits noise. |
| **Full-key vs display** | Match key uses canonical `voie_types.code` + space + `libelle_normalized`, not title-cased display. User should use natural lowercase / accents as they would after normalization (consistent with stored keys). |
| **Article list completeness** | New extraction patterns may need new entries in `LIBELLE_LEADING_ARTICLE_CHAINS`; no runtime learning. |
| **Index use** | `rues_libelle_normalized_idx` helps the libellé branch; the concatenated expression is less index-friendly (acceptable at cap 20). |
| **`type` display** | DOMAIN_MODEL Q13 (final French typography for multi-word types) is still TBD; today `displayVoieType` is word-wise title-case on `code`. |
| **Out of scope for this slice** | Number-bearing lookup, street-only lookup, production SPA ↔ Worker URL (see AGENTS.md). |

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test:watch -w api
```

| File | What it covers |
|------|----------------|
| `apps/api/test/rues_suggest.test.ts` | End-to-end HTTP suggest behaviour. |
| `apps/api/test/libelle_prefix_expand.test.ts` | Prefix expansion unit tests. |
| `apps/api/test/apply-migrations.ts` | D1 migrations applied once per run. |

---

## Changelog (high level)

1. Initial slice: route, `suggestRues`, Vitest pool-workers harness, web demo.  
2. LIKE escaping for `%`, `_`, `\`.  
3. Article expansion on libellé prefixes.  
4. Full-key `(code + ' ' + libelle_normalized)` OR branch for type-leading queries.

When behaviour changes, extend **tests first** (or in the same PR), then update this file if the contract or limitations shift.
