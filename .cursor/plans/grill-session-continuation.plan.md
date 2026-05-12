---
name: grill-session-continuation
overview: Continuation log for the `grill-with-docs` session on the address-lookup domain model. Migrations through `0012` in place. Grill queue **empty** except **Q13** (voie-type display caps — TBD domain). Operator tasks (migrate, commit) as needed.
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

Then load the skill `/Users/danie/Documents/PROJECTS/andriveau-bobine/.cursor/skills/grill-with-docs/SKILL.md`. Open items: **Q13** (display capitalization) only — see "Remaining grilling questions" at the end of this file.

The session's two stated goals are:

- **Goal 1** (global): is the domain model aligned with the main user story (street + number → ilot(s), with arrondissement/quartier context)?
- **Goal 2** (specific): are the specific design challenges (type/libellé split, range extraction, etc.) sound?

Goal 1 is closed. Goal 2 design questions from this plan are **resolved** except **Q13** (display capitalization), still TBD with domain.

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
| Q12 | `street_segments.quality_flags` integer bitmask, default `0`; v1 defines bit 0 = low-confidence extraction. Strikethroughs → skip; multi-ilot → valid; multi-line cells → no flag unless new need | `quality_flags.ts`, `0012_street_segments_quality_flags.sql`, `CONTEXT.md`, `DOMAIN_MODEL.md`, `EXTRACTION.md`                  |
| Q13 | Voie-type **display capitalization** — **TBD**, needs domain answer                                                                                                                                 | `DOMAIN_MODEL.md` (`voie_types` → Display)                   |
| Q14 | Suggest: **prefix** match on normalized libellé, **min 2** chars, **limit 20**, **alphabetical** order; revisit with user feedback                                                                | `EXTRACTION.md`, `DOMAIN_MODEL.md`, `ADR 0002`               |
| Q15 | `12, 14, 16 → 24` → two singletons + one range (same as mixed-list rule). **`12 et 16`** not in corpus; if seen, treat as two singletons. **Pair / impair** columns → **one segment row per side** (parity per row) | `EXTRACTION.md`                                              |
| Q16 | `raw_text` = one **logical register row**; house numbers may **overflow downward** (“sticky” street + tall N° block); **stitched** into one string; one `source_entries` row. **No `raw_scanned` in v1** | `CONTEXT.md`, `DOMAIN_MODEL.md`, `EXTRACTION.md`             |
| Q17 | **Open-ended ranges** remain **unsupported**: skip + log, no invented upper bound, no `quality_flags` on unpersisted parses                                                                 | `EXTRACTION.md`, `CONTEXT.md` (`Street segment`)               |

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

- `meta/_journal.json` includes through `0012_street_segments_quality_flags`.
- Snapshots chain `prevId` through `0012_snapshot.json` so `drizzle-kit generate` stays aligned with applied SQL.

**Optional follow-ups (not blocking):**

- Add `npm run db:seed` only if you want TS-driven seeding instead of SQL duplication.
- Remote D1: `npm run db:migrate:remote` after `database_id` is set in `wrangler.jsonc`.

## Remaining grilling questions

- **Q13** — Voie-type **display capitalization** (see `DOMAIN_MODEL.md` → `voie_types` Display). Still **TBD** pending domain convention.

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
