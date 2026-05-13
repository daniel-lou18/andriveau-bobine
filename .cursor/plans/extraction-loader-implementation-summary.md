# Extraction loader — implementation summary & follow-up

**Plan:** [extraction_loader_implementation_33769528.plan.md](./extraction_loader_implementation_33769528.plan.md)  
**Status:** Implemented and verified locally (May 2026).

## What shipped

| Area | Deliverable |
|------|-------------|
| **Migration** | `apps/api/drizzle/0013_loader_cascade_deletes.sql` — `ON DELETE CASCADE` on `street_segments.source_entry_id` → `source_entries`, `segment_ilots.segment_id` → `street_segments`; `segment_ilots_quartier_consistency` trigger recreated after rebuild. |
| **Schema** | `street_segments.ts`, `segment_ilots.ts` — `{ onDelete: "cascade" }` on those FKs. |
| **Loader** | `apps/api/src/loader/` — `types.ts`, `validate.ts` (Zod), `parse-numeros.ts`, `bootstrap.ts` (arrondissement `1er` / `2e`…`20e`, quartier, ilots, cross-quartier detection), `index.ts` (`loadBatch`). |
| **API** | `POST /api/_loader/extraction` in `apps/api/src/index.ts`; Bearer `LOADER_TOKEN`; CORS allows `Authorization`. |
| **Config** | `wrangler.jsonc` `vars.LOADER_TOKEN` placeholder; `worker-configuration.d.ts` regenerated. |
| **CLI** | `apps/api/scripts/load-extraction.ts`, `npm run loader:run -w api`, `tsx` devDependency. |
| **Docs** | `docs/AGENTS.md` — loader workflow; `docs/EXTRACTION.md` — loader field mapping updates (voie type normalization, hyphen ranges). |

**ADRs (grill session, pre-implementation):** `docs/adr/0004` (whole-bobine wipe), `0005` (Worker + thin CLI), `0006` (skip-and-log per row).

## Behaviour beyond the original plan (intentional)

1. **Hyphen ranges in `numeros_raw`** — Before tokenizing, `a - b` / `a-b` is normalized to `a -> b` so scribe/OCR variants load without skipping (e.g. `75 - 77`, `66-86`).
2. **Voie `type` with accents** — `rue.type` is looked up with the same `normalizeName` as libellés so interchange `cité` matches seeded `voie_types.code` `cite`.

## Local verification (representative)

- **Bobine 8:** 250 `source_entries`, 0 skipped after hyphen handling; wipe scoped to `bobine = 8` only.
- **Bobine 43:** Initially 1 skip (`7 -> 12` parity — OCR); user corrected to `4 -> 12`; reload → **140** `source_entries`, **296** `street_segments` / `segment_ilots`, **0 skipped**.
- **Cross-bobine:** Reloading bobine 8 leaves bobine 43 row counts unchanged (and vice versa).

## Operational notes

- **`apps/api/.dev.vars`** — Set `LOADER_TOKEN=<secret>` (gitignored). Match the CLI `--token` or `LOADER_TOKEN` env.
- **Idempotency** — Each run replaces all rows for `document_scope.bobine` via `DELETE FROM source_entries WHERE bobine = ?` + cascade; orphan `rues` / `ilots` are left as reference data per ADR-0004.

## Follow-up (not in this implementation)

| Item | Notes |
|------|--------|
| **Suggest / lookup APIs** | Out of plan scope; `docs/DOMAIN_MODEL.md` + ADR-0002/0003 define contract. |
| **`conflict` flag semantics** | ADR-0003 prose vs “group by `source_entry_id`” edge case when two source entries *agree* on the same ilot — resolve when implementing lookup. |
| **D1 batching** | Loader uses sequential inserts per segment/ilot for simplicity; revisit if latency matters at scale. |
| **Unit tests** | `parse-numeros.ts` / Zod schema — optional hardening. |
| **Remote deploy** | `database_id` still placeholder in `wrangler.jsonc` until `wrangler d1 create`; production `LOADER_TOKEN` via `wrangler secret put`. |
| **`.dev.vars.example`** | Optional committed template (no real secret) to reduce onboarding friction. |

## Quick commands

```bash
# Migrations (once per environment)
npm run db:migrate:local -w api

# Terminal 1
npm run dev:api

# Terminal 2 (from repo root or adjust --file path)
npm run loader:run -w api -- --file ../../data/extracted-tables/bobine43-extraction.json --token "$LOADER_TOKEN"
```
