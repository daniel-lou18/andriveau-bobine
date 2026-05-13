# Address Extraction Conventions

This document defines how source register notations are encoded into the SQL model.
It is the canonical contract for:

- extraction-time writes into D1
- search-time query parsing and lookup predicates

If extractor behavior changes, update this file first.

## Purpose And Scope

The extraction layer converts street/house notations from source documents into rows that support:

`(streetName, houseNumberWithOptionalSuffix) -> (arrondissement, quartier, ilot[])`

This document specifies:

- what becomes a `street_segments` row
- how suffixes are ordered and stored
- how multi-ilot attribution is represented
- which cases are intentionally rejected

This document does not specify OCR/parsing implementation details.

For the **structured JSON payload** an LLM (or vision model) should emit **before** application validation — field names, linear reading order, sticky îlot inheritance, and disambiguation of reel vs PDF page vs the printed “PAGE” column — see **`docs/LLM_EXTRACTION_INTERCHANGE.md`**.

Register-specific **printed layout** notes, PDF scans, and sample interchange files live under **`data/`** (see **`docs/DOMAIN_MODEL.md`** → Source data).

## Glossary

- `bobine`: reel number as an integer in `source_entries`; other archival strings (series codes, composite labels) are audit-only, not structured fields
- `page`: source page number within a bobine
- `arrondissement`: top-level administrative division
- `quartier`: subdivision inside an arrondissement
- `ilot`: block number inside a quartier
- `rue`: canonical street entity
- **List separators in house-number cells:** in `numeros_raw`, **comma** (`,`), **semicolon** (`;`), and **slash** (`/`) are equivalent **union** delimiters between singletons and/or ranges (scribe-dependent); mixed in one cell is allowed (`docs/LLM_EXTRACTION_INTERCHANGE.md`). The slash form is bobine-8 / NDDC specific and typically marks adjacent civic numbers on one Haussmann parcel (e.g. `10/12`, `18/20`); the loader treats both numbers as singleton `street_segments` linked to the **same** `source_entries` row, exactly like the comma/semicolon list case. No new domain concept; co-assertion is recovered at query time via shared `source_entry_id`.
- `source entry`: one **logical register row** (street + îlot + numbers); street usually in the address cell, îlot rarely spills, house numbers may **overflow downward** in the N° column — still one entry; see Provenance Model
- `source_entries`: normalized table storing one row per source entry
- `segment`: one normalized (street, parity, range) unit stored in `street_segments`

## Canonical Suffix Ranking

Suffixes are ordered positions on the house-number axis.

- `""` (none) -> `0`
- `bis` -> `1`
- `ter` -> `2`
- `quater` -> `3`
- `quinquies` -> `4`
- `sexies` -> `5`
- `septies` -> `6`

Ordering example:

`8 < 8bis < … < 8septies < 10`

Suffixes beyond `septies` are out of scope; treat like any unknown token — **skip + log**, do not persist.

The single source of truth is `apps/api/src/lib/suffix.ts`:

- `SUFFIX_RANK`
- `rankOfSuffix()`
- `suffixOfRank()`

Search parsing must use the same utility; no duplicate mapping logic.

## Parity Rule

- `parity` is always a single value: `odd` or `even`.
- A segment never uses `both`.
- For ranges, endpoints must share parity.
- For singletons, parity is derived from the number itself.
- Suffixes do not change parity (`8bis` is even, `11ter` is odd).

If an extracted range has mismatched endpoint parity, the extractor must treat it as invalid and skip/log it.

**Schema-enforced.** `street_segments` carries two named CHECK constraints — `street_segments_range_order_ok` (ordering on `(number, suffix_rank)`) and `street_segments_parity_ok` (both endpoints share parity, and that parity matches the `parity` column). Wrong-parity rows are rejected by D1 at insert time so the lookup can trust the stored value.

## Rue Canonicalization

Extraction is **LLM-driven**: a frontier model reads the raw bobine scan and emits structured `{type, libelle}` per **logical source notation** (see Provenance Model: one stitched reading per `source_entries` row, not necessarily one printed grid row). The application then **normalizes** and **validates** that output before persisting. There is no in-app regex parser or alias map for the rue type; abbreviation expansion (`Bd → Boulevard`, `R. → Rue`), missing-type inference (`ST Denis` → `Rue Saint-Denis`; `Pierre Lescot` → `Rue Pierre-Lescot`), canonical hyphenation (`Notre Dame des Champs` → `Notre-Dame-des-Champs`), and saint-form expansion (`St → Saint`, `Ste → Sainte`) are all the LLM's responsibility.

### Stage 1 — LLM emits canonical `{type, libelle}`

Example outputs:

- source `Bd Raspail` → `{ type: "boulevard", libelle: "Raspail" }`
- source `Rue Notre Dame des Champs` → `{ type: "rue", libelle: "Notre-Dame-des-Champs" }`
- source `ST Denis` (no explicit `Rue`) → `{ type: "rue", libelle: "Saint-Denis", inferred: true }`
- source `Petite Rue de la Truanderie` → `{ type: "petite rue", libelle: "de la Truanderie" }`

The `type` value is the **lowercase canonical code** matching a row in `voie_types`. Multi-word types are emitted verbatim with a single space separator.

### Stage 2 — application validates and normalizes

1. Look up `type` in `voie_types` by `code`. If no match, the row is rejected (skip + log).
2. Run `libelle` through the shared normalize function (see `docs/DOMAIN_MODEL.md` → Normalized form) to produce `libelle_normalized`.

### Stage 3 — lookup or insert

Look up `rues` by `(type_id, libelle_normalized)`. Insert if missing. The same row is reused across all source entries that resolve to the same canonical `(type, libellé)`.

### Inferred-type rows

When the LLM has to infer the type (the source had no explicit type token), it emits `inferred: true` on the structured extraction. Persist that on every resulting `street_segments` row as **`type_inferred`** (SQLite stores it as integer `0`/`1`, `NOT NULL`, default `0`). QA can filter on `type_inferred = 1` without parsing `notes`.

### Segment quality flags

`street_segments.quality_flags` is an **`INTEGER NOT NULL DEFAULT 0`** bitmask. Combine flags with bitwise OR; the canonical names live in **`apps/api/src/lib/quality_flags.ts`**.

**Defined bits (v1):**

- **Bit 0** — `SEGMENT_QUALITY.LOW_CONFIDENCE_EXTRACTION`: the extractor or validation pipeline marked this segment as low-confidence. Use for QA triage.

**Reserved:** all higher bits are reserved for future dimensions. Do not repurpose without updating this doc and `quality_flags.ts`.

**Out of scope for this field** (by product decision): strikethroughs and crossed-out source lines are **skipped** at extraction, not flagged on segments. A source entry that legitimately maps to **several îlots** via `segment_ilots` is **valid data**, not a quality warning. **Layout nuance:** house numbers may **overflow downward** from the N° cell (“sticky” street beside a tall block) — still **one** `source_entries` row with stitched `raw_text`; no separate flag unless a new QA need appears.

## Source Entry To Row Mapping

A source entry may produce one or many rows.

**Typical house-number shapes.** In the bulk of the corpus, the N° cell is built from only a few compositional patterns: a **singleton**; a **list** of singletons separated by **comma and/or semicolon** (scribe-dependent); an **inclusive range** between two endpoints (the source often uses an arrow; examples below use `>` for the same idea); or a **mixture** of lists and ranges in one logical entry (including long lists that wrap across several printed lines — still one stitched `source_entries` row). The subsections below fix how each pattern maps to `street_segments`; later subsections add suffix precision, separate pair/impair columns, and explicit rejections so edge cases stay specified without obscuring the common grammar.

### Basic ranges

- `12 > 30` -> one segment row:
  - `parity = "even"`
  - `from_number = 12`, `from_suffix_rank = 0`
  - `to_number = 30`, `to_suffix_rank = 0`

### Mixed singleton + range list

- `10, 16, 24 > 34` -> three segment rows linked to one `source_entries` row:

  - `10..10`
  - `16..16`
  - `24..34`

- `10; 16; 24 > 34` (semicolon-delimited, same semantics) -> the same three segment rows.

- `10/12` (slash-delimited adjacent singletons, bobine-8 / NDDC scribe) -> two segment rows linked to one `source_entries` row:

  - `10..10` (parity `even`)
  - `12..12` (parity `even`)

- `5 -> 7 / 6` (slash separating a range from a singleton across parities) -> two segment rows linked to one `source_entries` row:

  - `5..7` (parity `odd`)
  - `6..6` (parity `even`)

### Explicit enumeration (no compression)

- `12, 14, 16` -> three singleton rows:

  - `12..12`
  - `14..14`
  - `16..16`

- `12; 14; 16` -> the same three singleton rows.

Do not compress to `12..16`.

If a notation ever uses **French “et”** between numbers (e.g. `12 et 16`), normalize it to the same rule as comma- or semicolon-separated lists: **two singleton segments** `12..12` and `16..16`. This pattern is **not observed** in the current corpus; the rule exists for consistency if it appears later.

### Separate pair / impair columns

When the source row carries **distinct even-side and odd-side** number notations (e.g. **pair** and **impair** columns, or equivalent), emit **one `street_segments` row per side**: each row gets the correct `parity` (`even` or `odd`) and its own range(s). A single visual source row may therefore produce two segment rows (or more if a side lists several ranges).

### Suffix singletons and suffix ranges

- `8bis` -> one row:

  - `from_number = to_number = 8`
  - `from_suffix_rank = to_suffix_rank = 1`
  - `from_suffix = to_suffix = "bis"`

- `2 > 8 bis` -> one row:

  - `from = (2, 0)`
  - `to = (8, 1)`

- `8 ter > 12` -> one row:
  - `from = (8, 2)`
  - `to = (12, 0)`

## Multi-Ilot Attribution Rule

When one source entry applies to multiple ilots, keep segment content once and associate it through `segment_ilots`.

- `street_segments`: one row per normalized segment
- `segment_ilots`: one row per `(segment_id, ilot_id)` relation

Constraint from domain decisions:

- a multi-ilot source entry must remain within the same quartier
- cross-quartier grouping is invalid and should be skipped/logged

**Schema-enforced.** `source_entries.quartier_id` carries the page-header quartier as first-class metadata. A `BEFORE INSERT` trigger `segment_ilots_quartier_consistency` on `segment_ilots` rejects any `(segment_id, ilot_id)` pair whose `ilots.quartier_id` differs from the segment's `source_entries.quartier_id`. Cross-quartier multi-ilot groupings cannot reach the database.

## Provenance Model

Provenance is normalized into `source_entries`:

- `quartier_id` (FK -> `quartiers.id`, the quartier named in the bobine page header)
- `bobine`
- `page`
- `raw_text` — **one string for one logical register row** (street + îlot + house numbers). The printed grid is only a guide: **Street** — almost always inside the address cell (wrap-in-place). **Îlot** — usually in cell; rare spill when many îlot numbers are listed. **House numbers** — may **overflow** the printed cell and **continue downward** across the grid (beside ADRESSE; “sticky” street + tall N° block). Pipeline **stitches** into one `raw_text`. **Interchange convention:** LLM payloads often use **`Ilot … | <voie> | <numeros>`** (space-pipe-space) for human QA; loaders may persist that string as-is. **v1:** no separate `raw_scanned`; revisit only if QA shows systematic reconstruction errors. **Review:** vision-assisted rows should be triaged with `low_confidence` / `scan_note` per **`docs/LLM_EXTRACTION_INTERCHANGE.md`** → _Human review and model caveats_.
- optional `sequence` and `notes`

`quartier_id` is page-level metadata: every row on a bobine page inherits the same quartier from the page header, so it sits on `source_entries` (one row per logical source notation, all rows on a page share it).

Each `street_segments` row references one `source_entries` row via `source_entry_id`.
If one source entry yields multiple segments, those segments share the same `source_entry_id`.

## No-Go Cases

The extractor must reject (skip + log) and never invent encodings for:

- **Open-ended ranges** (e.g. `12+`, `12 → …`, “and above”, or any notation **without** a finite upper bound). **Policy:** never persist segments for these; do **not** guess an endpoint. **Log** the rejection. **No** `quality_flags` update (typically no `street_segments` rows are written for that parse). Revisit only if such notations appear routinely in the corpus.
- **`NEANT` register rows** — some sources mark **no data** for an îlot span with **`NEANT`** in the address column (often with **`/`** in **N°**). The LLM interchange **omits** these entirely (`docs/LLM_EXTRACTION_INTERCHANGE.md`); the loader never creates `source_entries` for them.
- segments without house numbers
- cross-quartier multi-ilot groupings
- parity value outside `odd`/`even`
- unknown suffix tokens not in `SUFFIX_RANK` (ranks `0`–`6` only; nothing past `septies`)

## Search-Time Mirror

The lookup API is **strict**: it never parses free text. Disambiguation between rues that share a libellé (e.g. `Rue de Vaugirard` vs `Boulevard de Vaugirard`) happens **client-side**, via an autocomplete suggest endpoint backed by `rues_libelle_normalized_idx`. See `docs/adr/0002-strict-lookup-api-with-rue-id.md`.

The two endpoints share a normalization contract with extraction:

### Suggest endpoint

Input:

- a libellé fragment (**≥ 2** characters), normalized client-side using the shared normalize function

Matching:

- **Prefix** match on `rues.libelle_normalized` (e.g. `LIKE 'vaugirard%'` after normalize). Substring / fuzzy deferred until user feedback.

Output:

- at most **20** rows, ordered **alphabetically** (libellé, then stable on `rue_id` if needed)

The client uses this to populate an autocomplete; the user picks a suggestion before submitting the main lookup.

### Lookup endpoint

Input parameters, all already resolved by the client:

- `rue_id` (the autocomplete selection — opaque integer FK into `rues`)
- `n` (house number integer)
- `n_rank` (`rankOfSuffix(userSuffix)`)
- `parity` (`even`/`odd` derived from `n`)

The API does **not** accept a free-text rue string, a `type` token, or a libellé. If the client wants to submit a raw string, it must first call the suggest endpoint and resolve a `rue_id`.

Querying must use the same `(number, suffix_rank)` ordering semantics as extraction.

When you need provenance in results, join `source_entries` on `s.source_entry_id`.

## Canonical Lookup SQL

```sql
SELECT a.number AS arr, q.name AS quartier, i.number AS ilot
FROM street_segments s
JOIN segment_ilots si  ON si.segment_id = s.id
JOIN ilots i           ON i.id = si.ilot_id
JOIN quartiers q       ON q.id = i.quartier_id
JOIN arrondissements a ON a.id = q.arrondissement_id
WHERE s.rue_id = :rue_id
  AND s.parity = :parity
  AND (s.from_number, s.from_suffix_rank) <= (:n, :n_rank)
  AND (:n, :n_rank) <= (s.to_number, s.to_suffix_rank);
```

`rues` is not joined: the client already resolved `rue_id` via the suggest endpoint, so the rue's `type` and `libelle` are already known on the client side.

## QA Lookup SQL With Provenance

Use this query during extraction QA when you need to trace lookup results back to the exact source entry.

```sql
SELECT a.number AS arr,
       q.name AS quartier,
       i.number AS ilot,
       se.bobine,
       se.page,
       se.sequence,
       se.raw_text
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

## Loader Field Mapping

The extraction loader (Worker route `POST /api/_loader/extraction`, `apps/api/src/loader/`) consumes the JSON defined in **`docs/LLM_EXTRACTION_INTERCHANGE.md`**. The per-field mapping is:

| Interchange field | DB target | Rule |
| ----------------- | --------- | ---- |
| `document_scope.bobine` | `source_entries.bobine` (every row in the batch) | Integer; also the **wipe key**: the loader deletes pre-existing rows where `source_entries.bobine = N` before insert (`docs/adr/0004-loader-whole-bobine-wipe-on-reload.md`). |
| `document_scope.arrondissement` | `arrondissements.number` | `INSERT OR IGNORE`; display name supplied by the loader's static map (`1 → "1er"`, `2..20 → "2e"`…`"20e"`). |
| `document_scope.quartier` | `quartiers.name` + `quartiers.name_normalized` | `INSERT OR IGNORE` keyed on `(arrondissement_id, name_normalized)`. Normalization via shared `apps/api/src/lib/normalize.ts`. |
| `record.ilot_numbers[]` | `ilots.number` + `ilots.quartier_id` | `INSERT OR IGNORE`; each ilot attaches to the batch's quartier. Pre-existing ilots with a different `quartier_id` cause the **row** to be skipped with `CROSS_QUARTIER_ILOT` (the trigger would reject anyway; the loader pre-validates so the D1 batch stays trusted-clean). |
| `record.rue.type` | `voie_types.code` → `rues.type_id` | Lookup on **`voie_types.code`** after the same aggressive **`normalizeName`** used for libellés (so e.g. interchange `cité` matches seeded `cite`). Miss → skip row with `UNKNOWN_VOIE_TYPE`. |
| `record.rue.libelle` | `rues.libelle` + `rues.libelle_normalized` | `INSERT OR IGNORE` keyed on `(type_id, libelle_normalized)`. LLM is responsible for canonical form; loader only normalizes. |
| `record.rue.inferred: true` | `street_segments.type_inferred = 1` | Applied to **every** segment derived from the record. |
| `record.numeros_raw` | one or more `street_segments` rows | Tokenize on `,;/`; each token is a singleton or `a -> b` range; suffixes (`bis`, `ter`, …, `septies`) resolve via `apps/api/src/lib/suffix.ts`. **Loader:** hyphen ranges with optional spaces (`75 - 77`, `66-86`) are normalized to `->` before tokenizing (scribe variant of the arrow). See § Source Entry To Row Mapping. |
| `record.low_confidence: true` | `street_segments.quality_flags \|= SEGMENT_QUALITY.LOW_CONFIDENCE_EXTRACTION` | Applied to **every** segment derived from the record. |
| `record.raw_text` | `source_entries.raw_text` | Stored verbatim. |
| `record.page` (optional) | `source_entries.page` | `source_entries.page = record.page ?? record.pdf_page`. |
| `record.reading_order_index` | `source_entries.sequence` | Stored as-is; monotone within a batch is sufficient for the canonical lookup `ORDER BY se.bobine, se.page, COALESCE(se.sequence, 0), i.number`. |
| `record.scan_note` | `source_entries.notes` | Stored verbatim when present; preserves human-reviewer hints for QA queries. |
| `record.pdf_page` | (audit only) | Already feeds `source_entries.page` via the fallback above; not stored separately. |

Per-record fields not in the table (`reading_order_index` consumed for `sequence`, `ilot_numbers` consumed for `segment_ilots`) are described in their own sections.

## Deferred Topics

Out of scope for this document and current schema pass:

- street aliases and fuzzy matching tables
- conflict resolution across bobines
- FTS5 acceleration for text search
- occupant/person-level per-house modeling
