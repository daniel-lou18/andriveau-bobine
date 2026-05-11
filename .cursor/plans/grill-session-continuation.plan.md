---
name: grill-session-continuation
overview: Continuation log for the `grill-with-docs` session on the address-lookup domain model. Decisions locked in-session; migrations `0009`–`0011`, trigger, and Drizzle snapshot chain are in place. Q9–Q11 locked; remaining work is Q12–Q17 grilling + operator tasks (migrate remote, commit).
todos: []
isProject: false
---

## How to resume

Re-read these in order before continuing the session:

1. `CONTEXT.md` — current ubiquitous language
2. `docs/DOMAIN_MODEL.md` — current schema model
3. `docs/EXTRACTION.md` — current extraction/search contract
4. `docs/adr/0001-rue-as-type-libelle.md`, `0002-strict-lookup-api-with-rue-id.md`, `0003-lookup-response-shape-deduped-with-conflict-flag.md`
5. This file

Then load the skill `/Users/danie/Documents/PROJECTS/andriveau-bobine/.cursor/skills/grill-with-docs/SKILL.md` and resume from "Remaining questions" below.

The session's two stated goals are:

- **Goal 1** (global): is the domain model aligned with the main user story (street + number → ilot(s), with arrondissement/quartier context)?
- **Goal 2** (specific): are the specific design challenges (type/libellé split, range extraction, etc.) sound?

Goal 1 is closed. Goal 2 is mid-flight; the remaining questions below are all in Goal 2 territory.

## Decisions locked in this session

| #   | Decision                                                                                                                                                                                        | Where it lives                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Q1  | `ilots.number` is globally unique (0–5000) across the 20 arrondissements — external domain fact, not defensive choice                                                                           | `CONTEXT.md`, `DOMAIN_MODEL.md`                              |
| Q2  | Strict lookup API keyed by `rue_id`; libellé-only disambiguation lives in the client via an autocomplete suggest endpoint                                                                       | `ADR 0002`, `EXTRACTION.md`, `DOMAIN_MODEL.md`               |
| Q3  | Lookup response is a deduped list of `(arr, quartier, ilot)` with a top-level `conflict: bool` flag; provenance opt-in via `?provenance=1`                                                      | `ADR 0003`, `DOMAIN_MODEL.md`, `CONTEXT.md`                  |
| Q4  | v1 ships number-bearing lookup only; street-only is a second endpoint, planned but deferred                                                                                                     | `DOMAIN_MODEL.md` (Read Patterns → Scope)                    |
| Q5  | Voie type set is ~220 (official French vocabulary), not ~15; multi-word types exist (`Petite Rue`, `Grand Boulevard`, …). Unknown types → silent skip + log (Q5b = a)                           | `CONTEXT.md`, `ADR 0001`                                     |
| Q6  | `rues.type` is a FK to a `voie_types` reference table seeded from the official lowercase list. Multi-word types stored verbatim. ADR 0001 corrected in place (factual error, not re-evaluation) | `ADR 0001`, `DOMAIN_MODEL.md`, `EXTRACTION.md`, schema files |
| Q7  | `street_segments` carries two named CHECKs: `street_segments_range_order_ok` and `street_segments_parity_ok` (parity ↔ number consistency, schema-enforced)                                     | `EXTRACTION.md`, `street_segments.ts`                        |
| Q8  | `source_entries.quartier_id` denormalized as page-level provenance. `BEFORE INSERT` trigger `segment_ilots_quartier_consistency` enforces same-quartier rule                                    | `EXTRACTION.md`, `DOMAIN_MODEL.md`, `source_entries.ts`      |
| Q9  | `bobine` stays `INTEGER`: reel number only; strings like `2MI 24` are audit-only, not additional structured fields                                                                               | `CONTEXT.md`, `DOMAIN_MODEL.md`, `EXTRACTION.md` glossary      |
| Q10 | Suffix ranks extended through `sexies` / `septies`; tokens beyond that → skip + log                                                                                                              | `CONTEXT.md`, `EXTRACTION.md`, `apps/api/src/lib/suffix.ts`    |
| Q11 | LLM inferred-type signal stored as `street_segments.type_inferred` (boolean as integer, default false)                                                                                          | `street_segments.ts`, `0011_street_segments_type_inferred.sql`, `CONTEXT.md`, `DOMAIN_MODEL.md`, `EXTRACTION.md`               |

## Pending engineering work — status (verified in repo)

All schema-related steps below are **done** in the codebase. What changed from the original plan: migrations were **authored by hand** as `0009` + `0010` (not produced by `drizzle-kit generate`), because Kit had no prior snapshot for the `voie_types` / `type_id` / `quartier_id` chain. Seeding is **inlined in `0009`**, not a separate `npm run db:seed` script.

| Step                                                                                                 | Status       | Where / notes                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Schema migration SQL (`voie_types`, `rues.type_id`, `source_entries.quartier_id`, segment CHECKs) | **Done**     | `apps/api/drizzle/0009_voie_types_table_and_seed.sql` (table + ~250 `INSERT`s), `apps/api/drizzle/0010_rues_type_id_quartier_segments_checks_trigger.sql` (rebuilds `rues`, `source_entries`, `street_segments`, restores `segment_ilots`) |
| 2. Trigger `segment_ilots_quartier_consistency`                                                      | **Done**     | End of `0010_…sql` (`CREATE TRIGGER … BEFORE INSERT ON segment_ilots`)                                                                                                                                                                     |
| 3. Apply migrations locally                                                                          | **Operator** | Run when needed: `cd apps/api && npm run db:migrate:local`. Requires at least one `quartiers` row before `0010` backfills `source_entries.quartier_id`.                                                                                    |
| 4. Seed `voie_types`                                                                                 | **Done**     | Same as step 1: `0009` seeds from the list that mirrors `src/db/seed/voie-types.ts` — keep those two in sync when the official list changes.                                                                                               |
| 5. Commit                                                                                            | **Operator** | Not tracked here; commit migrations + `meta/_journal.json` + snapshots when you cut the PR.                                                                                                                                                |

**Drizzle meta / `generate` hygiene (also done):**

- `meta/_journal.json` includes through `0011_street_segments_type_inferred`.
- Snapshots chain `prevId` through `0011_snapshot.json` so `drizzle-kit generate` stays aligned with applied SQL.

**Optional follow-ups (not blocking):**

- Add `npm run db:seed` only if you want TS-driven seeding instead of SQL duplication.
- Remote D1: `npm run db:migrate:remote` after `database_id` is set in `wrangler.jsonc`.

## Remaining grilling questions (queued for the next session)

Questions are listed in suggested order — most upstream / highest schema impact first. The format follows the in-session pattern: situation → options → recommendation → user picks.

### Q12 — Needs-review / data-quality signal: same column or separate?

The source has multiple data-quality classes beyond inferred-type:

- strikethroughs / corrections (`SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`)
- two îlot labels in one cell (the "shared edge" Source-1 case from Q3)
- multi-line cells / continuation lines
- low-confidence LLM extractions

Probe:

- Should the schema carry one `needs_review BOOLEAN` per row, or a fine-grained set of flags?
- Same row vs. a dedicated `extraction_review_queue` table?

Recommendation: introduce a small `quality_flags` integer bitmask (or a `JSON` column on SQLite if cleaner) on `street_segments`, defaulting to 0. Defer the dedicated table until volume justifies it.

### Q13 — Voie-type display capitalization conventions

`voie_types.code` is stored lowercase. Display capitalization is the API serialization layer's job. For single-word types this is trivial (`rue` → `Rue`). For multi-word types we have choices:

- `petite rue` → `Petite Rue` (title-case both)
- `petite rue` → `Petite rue` (only first word)
- `ancien chemin` → `Ancien Chemin`
- `centre commercial` → `Centre Commercial` or `Centre commercial`?

Probe:

- French typographic convention is title-case the first word + lowercase the rest, except for proper nouns. But voie types are common nouns. Is `Petite rue de la Truanderie` or `Petite Rue de la Truanderie` the right rendering?
- IGN / La Poste / OSM conventions vary.

Recommendation: TBD — needs a domain answer. Probably title-case the whole type token for consistency with the libellé (which preserves caps inside hyphenated compounds: `Notre-Dame-des-Champs`).

### Q14 — Suggest endpoint behaviour: prefix, substring, or fuzzy?

Schema has `rues_libelle_normalized_idx` for libellé-only autocomplete. But the _match strategy_ isn't specified.

Probe:

- **Prefix match** (`WHERE libelle_normalized LIKE 'vaug%'`) — index-friendly, predictable.
- **Substring match** (`LIKE '%vaug%'`) — more forgiving, but cannot use the B-tree index for the leading wildcard. Linear scan over `rues` (small, ~6k rows max).
- **Trigram / fuzzy** (FTS5, `bm25`) — overkill for v1, deferred.

Also:

- Minimum query length: 2 chars? 3?
- Result limit: 10? 20?
- Ranking: alphabetical? by number of segments (popularity)? by exact-match-first then prefix then substring?

Recommendation: prefix match, min 2 chars, limit 20, alphabetical ordering. Revisit when real users hit it.

### Q15 — Compression rule edge cases

`EXTRACTION.md` says explicit enumerations (`12, 14, 16`) become three singleton segments — no compression to `12..16`. The rule is justified because compression would risk adding spurious matches when the listed numbers have _gaps_ (`12, 16` shouldn't include 14).

Probe:

- What about source notations like `12 et 16` (French "and") — same as `12, 16`?
- What about `12, 14, 16 → 24` (mixed singleton + range tail)? `EXTRACTION.md` handles this as three segments (`12`, `14`, `16..24`) — confirm this matches the source's intent.
- What about `pair: 12 → 24, impair: 1 → 23` (parity columns explicit in source)? Two segments per row?

Recommendation: probably no change needed — current rules already handle these. Worth confirming with real bobine 1/46 data once extraction starts.

### Q16 — `source_entries` granularity: what is "one row"?

`CONTEXT.md`: _"One notation line on a bobine page."_ But the source has:

- multi-line cells (a long libellé wrapped across two visual lines)
- "carry-forward" empty PAGE column (sticky ilot from previous row)
- continuation patterns

Probe:

- Is `source_entries.raw_text` the **literal scanned line** or the **logically reconstructed cell**?
- With LLM extraction, the LLM does the reconstruction. Do we store the literal scan in addition?

Options:

- (a) `raw_text` = logically reconstructed (what the LLM emits as one notation), trusting the LLM's reading order.
- (b) Add `raw_scanned` alongside `raw_text` to preserve the literal scan for the worst-case QA review.

Recommendation: (a) for v1. (b) is a nice-to-have if QA reveals frequent LLM reconstruction errors.

### Q17 — Open-ended ranges: really impossible in source?

`EXTRACTION.md` rejects open-ended ranges (`12+`, `12 → ∞`) as not expected in the dataset.

Probe:

- Has any bobine page actually been observed with an open-ended range?
- If one appears during extraction, do we reject silently or flag for human review?

Recommendation: keep rejecting; flag for review (same `quality_flags` channel as Q12 if introduced). Reconsider only if such notations appear non-trivially.

## Out-of-scope (still deferred)

These were marked deferred earlier in the project and remain so:

- street aliases / fuzzy matching tables
- FTS5 acceleration for text search
- occupant / person-level per-house modelling
- conflict resolution across bobines (the API surfaces conflicts; resolution policy is not in scope)
- the second read path (street-only lookup endpoint) — Q4 deferred to v2

## Skill reminder

This continuation is for the **`grill-with-docs`** skill (path: `/Users/danie/Documents/PROJECTS/andriveau-bobine/.cursor/skills/grill-with-docs/SKILL.md`). The skill's rules:

- ask one question at a time, with a recommended answer
- update `CONTEXT.md` and ADRs **inline** as decisions crystallise (don't batch)
- only offer an ADR when **all three** apply: hard to reverse, surprising without context, real trade-off
- challenge fuzzy language against the existing glossary
- explore the codebase before asking when the question is answerable from code
