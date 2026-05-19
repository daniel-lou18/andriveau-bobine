# Rue suggest (autocomplete) — implementation notes

This document summarizes the **v1 read API: rue suggest** vertical slice (GitHub issue #2), how it was built and tested, post-v1 extensions, the **architecture refactor** (layered API, shared contract, web disambiguation hook), and known limitations.

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

Constants `SUGGEST_MIN_LENGTH` and `SUGGEST_MAX_RESULTS` live in **`@andriveau-bobine/disambiguation`** so API and web stay aligned.

Local dev: the Vite app proxies `/api` to the Worker; the web slice calls `/api/rues/suggest` with a relative URL.

Errors on this route go through the Worker-wide **`apiErrorHandler`** (`apps/api/src/http/on-error.ts`). Validation failures from `@hono/zod-validator` throw `HTTPException` with a Zod **`cause`** (full issues logged); the response body stays `{ "error": string }` only.

---

## Architecture (after refactor)

### Request flow (API)

```text
GET /api/rues/suggest?q=…
  → suggest/routes.ts     (Hono sub-app)
  → jsonErrorValidator + suggestQuerySchema   (normalize q, min length)
  → suggestRues(db, normalizedQuery)          (use case — no HTTP types)
  → buildSuggestMatchSpec → buildSuggestLikePatterns → querySuggestRues
  → map rows with displayVoieType
  → 200 { results }
```

The root app mounts the sub-app with `app.route("/api/rues", suggestRoutes)` (`apps/api/src/index.ts`). DB injection remains global middleware (`c.set("db", …)`).

### Shared package (`packages/disambiguation`)

Cross-tier contract for ADR-0002 disambiguation:

| Export | Role |
|--------|------|
| `SUGGEST_MIN_LENGTH`, `SUGGEST_MAX_RESULTS` | Limits (API enforces; web gates fetches) |
| `RueSuggestion` | API JSON row shape (`rue_id`, `type`, `libelle`) |
| `ResolvedRue` | Client handoff (`rueId`, `display`) after pick |
| `formatSuggestionLabel`, `toResolvedRue` | Display label + API→client mapping |

Both `apps/api` and `apps/web` depend on this workspace package.

### Web flow

```text
useRueDisambiguation()
  → useDebouncedValue(trimmed query)
  → useQuery(rueSuggestionsQueryOptions) when searching
  → resolvedRue + canSubmitLookup after list pick
  → rueIdForLookup(resolvedRue) for future lookup (never parse display)

RueSuggestBox({ disambiguation })   — presentation only
```

---

## Implementation overview — API (`apps/api/src`)

### Worker composition

| Piece | Role |
|--------|------|
| `index.ts` | App shell: CORS, DB middleware, `app.onError(apiErrorHandler)`, `app.route("/api/rues", suggestRoutes)`. |
| `http/zod.ts` | `jsonErrorValidator` — Zod failures → `badRequest(message, { cause })`. |
| `http/errors.ts` | `badRequest`, `unauthorized`, `invalidJsonBody`, … |
| `http/on-error.ts` | Maps `HTTPException` / malformed JSON to `{ error }`; logs Zod `cause`. |

### Suggest slice (`suggest/`)

| Module | Role |
|--------|------|
| `routes.ts` | `GET /suggest` — query validation + `c.json({ results })`. |
| `schema.ts` | `suggestQuerySchema` — optional `q`, `normalizeName`, min length from shared package. |
| `index.ts` | **`suggestRues(db, normalizedQuery)`** → `RueSuggestion[]` (transport-agnostic). |
| `match.ts` | Pure matching: `buildSuggestMatchSpec`, `buildSuggestLikePatterns`, `escapeLikeFragment`. |
| `libelle_prefix_expand.ts` | Curated article chains + `expandNormalizedLibelleSuggestPrefixes`. |
| `query.ts` | Drizzle adapter: binds `SuggestLikePatterns` to `LIKE` clauses (no matching rules here). |

### Shared read-path lib

| Module | Role |
|--------|------|
| `lib/normalize.ts` | `normalizeName` — same rules as `rues.libelle_normalized` (DOMAIN_MODEL). Used in Zod schema and loader. |
| `lib/voie_type_display.ts` | `displayVoieType(code)` for API `type` field (word-wise title-case on canonical `code`). |

### Matching pipeline (pure → SQL)

1. **`buildSuggestMatchSpec(normalizedQuery)`** — `{ libellePrefixes, fullKeyPrefix }` via article expansion.
2. **`buildSuggestLikePatterns(spec)`** — escaped, prefix-anchored patterns (`…%`) for each branch.
3. **`querySuggestRues(db, patterns)`** — OR of:
   - **Libellé-only:** `rues.libelle_normalized LIKE <pattern> ESCAPE '\'`
   - **Full voie key:** `(voie_types.code \|\| ' ' \|\| libelle_normalized) LIKE <pattern> ESCAPE '\'`

`escapeLikeFragment` escapes `\`, `%`, `_` so user input cannot inject `LIKE` wildcards.

### Article expansion (libellé branch)

Many Paris libellés start with **de / du / des / de la / …** while users often type the distinctive tail first (`vau` → **de Vaugirard**).

- **`LIBELLE_LEADING_ARTICLE_CHAINS`**: longest-first curated list (not read from JSON at runtime).
- **`expandNormalizedLibelleSuggestPrefixes`**: always includes the normalized fragment; for each chain `art`, adds `art + " " + fragment` unless the fragment already equals `art` or starts with `art + " "` (avoids `de de vau` when the user typed `de vau`).

New openers discovered in extraction should be added here at **dev time** (optionally validated by scanning `data/extracted-tables/*.json`).

---

## Implementation overview — Web (`apps/web/src/rue-suggest/`)

| Module | Role |
|--------|------|
| `api.ts` | `fetchRueSuggestions` — `GET /api/rues/suggest` via Vite proxy; `SuggestResponse` union. |
| `rueSuggestionsQuery.ts` | TanStack Query `queryOptions` + `rueSuggestKeys` factory (`staleTime` 60s, `retry: false`). |
| `useRueDisambiguation.ts` | Hook: debounced search, `resolvedRue`, `canSubmitLookup`, `selectSuggestion`; pauses search while resolved. |
| `handoff.ts` | `canSubmitLookup`, `rueIdForLookup` — ADR-0002 lookup seam (opaque `rueId`, never `display`). |
| `RueSuggestBox.tsx` | Presentational UI; receives `disambiguation` from parent. |
| `index.ts` | Barrel exports for the slice. |

Supporting: `apps/web/src/lib/useDebouncedValue.ts` (150ms debounce, aligned with prior manual timer).

### ADR-0002 handoff invariants (web)

- **`setQuery`** clears `resolvedRue` — editing after pick invalidates lookup until the user selects again.
- **`selectSuggestion`** sets `resolvedRue` via `toResolvedRue(suggestion)` and mirrors `display` in the input for UX only.
- **`canSubmitLookup`** is true iff `resolvedRue !== null`.
- **`rueIdForLookup(resolvedRue)`** is the only function future lookup submit should use for `rue_id`.

`App.tsx` wires `useRueDisambiguation()` + `RueSuggestBox` and includes a demo **Submit lookup** button gated on `canSubmitLookup`.

`SelectedRue` is exported as an alias for `ResolvedRue` for backward compatibility.

---

## Acceptance criteria (issue #2) — mapping

| Criterion | Status |
|-----------|--------|
| Public suggest route, documented query param `q` | Met — this file + ADR-0002. |
| Min length 2, cap 20, prefix-oriented match, alphabetical + `rue_id` tie-break | Met. |
| Same normalization as `libelle_normalized` | Met — `normalizeName` in `suggestQuerySchema`. |
| Response shape `{ rue_id, type, libelle }` | Met — `RueSuggestion` in shared package. |
| Web: type fragment, proxy, pick row, keep `rue_id` in state | Met — `useRueDisambiguation` + `ResolvedRue`. |
| Automated tests for contract and normalization edge cases | Met — see Testing. |
| Read route separate from loader | Met. |

Post–issue #2 product tweaks (full street phrase and type-leading browse) remain documented under Extensions below.

---

## TDD approach

Principles: **vertical slices**, one behaviour at a time, assert **HTTP status and JSON shape** (and ordering where relevant), not raw SQL strings. Pure matching and normalization are tested at **unit** seams; HTTP tests guard the public contract.

### Initial tracer (issue #2)

1. Harness — `@cloudflare/vitest-pool-workers`, `test/apply-migrations.ts`, `SELF.fetch`.
2. Empty DB, `q=ab` → `200`, `{ results: [] }`.
3. `q=a` → `400`.
4. Seeded prefix match, cap 20, order + tie-break.
5. Normalization edge cases (accents, apostrophe, hyphen).
6. Substring guard (`gir` vs **de Vaugirard**).
7. LIKE injection (`%` in `q`).
8. Pure tests for `expandNormalizedLibelleSuggestPrefixes`.

Later cycles added article expansion and full-key matching with integration tests first (red → green).

### Refactor-era tests

Added alongside layering and shared contract work (see Testing table).

---

## Extensions and remediations (behaviour)

### 1. Libellé articles (`vau` → **de Vaugirard**)

**Issue:** Prefix on `libelle_normalized` only; `vau` does not prefix `de vaugirard`.

**Remediation:** `libelle_prefix_expand.ts` + OR of libellé `LIKE` clauses. Tests: `vau` returns **Vauvenargues** and **de Vaugirard**; `gir` still returns nothing on **de Vaugirard**.

### 2. Full phrase and type-leading input (`rue de rennes`, `rue de la …`)

**Issue:** Users paste or type **type + libellé**; libellé-only matching never saw `rue` in the indexed column.

**Remediation:** OR branch on `(code || ' ' || libelle_normalized)`. Tests: `rue de rennes` → Rue **de Rennes** only; `rennes` still finds libellé matches; `rue de la` → three **Rue de la …** rows (test data avoids **de Laborde** false positive).

### 3. Test data false positive (`rue de la` vs **de Laborde**)

Under plain `LIKE` prefix rules, `rue de la` also prefixes **Rue de Laborde** (`rue de laborde` shares the prefix before diverging). Integration test uses **de Lorient** instead. This is a **prefix matching** limitation, not an OR design bug.

---

## Shortcomings and limitations

| Topic | Detail |
|--------|--------|
| **Prefix semantics** | All matching is `LIKE 'prefix%'`. Short queries can still prefix-match unintended rows (e.g. `rue de la` vs **Rue de Laborde**). Mitigation: user types more; cap 20 limits noise. |
| **Full-key vs display** | Match key uses canonical `voie_types.code` + space + `libelle_normalized`, not title-cased display. |
| **Article list completeness** | New extraction patterns may need new entries in `LIBELLE_LEADING_ARTICLE_CHAINS`; no runtime learning. |
| **Index use** | `rues_libelle_normalized_idx` helps the libellé branch; the concatenated expression is less index-friendly (acceptable at cap 20). |
| **`type` display** | DOMAIN_MODEL Q13 (final French typography for multi-word types) is still TBD; today `displayVoieType` is word-wise title-case on `code`. |
| **Out of scope** | Number-bearing lookup endpoint, street-only lookup, production SPA ↔ Worker URL (see AGENTS.md). |

---

## Testing

From repo root:

```bash
npm run test -w api
npm run test:watch -w api
npm run test -w web
```

### API (`apps/api/test/`)

| File | What it covers |
|------|----------------|
| `rues_suggest.test.ts` | End-to-end HTTP suggest contract (status, shape, ordering, extensions). |
| `suggest_schema.test.ts` | `suggestQuerySchema` — min length, normalization, missing `q`. |
| `suggest_match.test.ts` | `buildSuggestMatchSpec`, `buildSuggestLikePatterns`, `escapeLikeFragment`. |
| `libelle_prefix_expand.test.ts` | Article prefix expansion invariants. |
| `normalize.test.ts` | `normalizeName` — DOMAIN_MODEL examples and edge cases. |
| `voie_type_display.test.ts` | `displayVoieType` — single/multi-word and accented codes. |
| `http_on_error.test.ts` | `apiErrorHandler` — user-facing message vs logged Zod `cause`. |
| `apply-migrations.ts` | D1 migrations applied once per run (setup). |

### Web (`apps/web/src/rue-suggest/`)

| File | What it covers |
|------|----------------|
| `useRueDisambiguation.test.tsx` | Debounced fetch, selection → `resolvedRue`, `canSubmitLookup`, edit clears resolution, React Query + mocked `api.ts`. |

---

## Changelog (high level)

1. **Initial slice** — route, monolithic `suggestRues`, Vitest pool-workers harness, web demo.  
2. **LIKE escaping** — `%`, `_`, `\` in user fragments.  
3. **Article expansion** — libellé prefix OR branches.  
4. **Full-key branch** — `(code + ' ' + libelle_normalized)` for type-leading queries.  
5. **Architecture refactor (API)** — layered suggest slice (`schema`, `routes`, `match`, `query`, transport-agnostic `suggestRues`); Hono sub-app; Zod query validation; shared `http/*` error handling with `cause` logging.  
6. **Shared contract** — `packages/disambiguation` (types, limits, `ResolvedRue`, formatters).  
7. **Architecture refactor (web)** — `useRueDisambiguation`, `handoff.ts`, presentational `RueSuggestBox`, TanStack Query (`rueSuggestionsQuery.ts`), hook tests.  
8. **Pure matching depth** — `buildSuggestLikePatterns` separates pattern assembly from Drizzle `query.ts`.  
9. **Read-path unit tests** — dedicated `normalize` and `displayVoieType` test files.

When behaviour changes, extend **tests first** (or in the same PR), then update this file if the contract or limitations shift.
