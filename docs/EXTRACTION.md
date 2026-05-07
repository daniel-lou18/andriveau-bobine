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

## Glossary

- `bobine`: archival reel identifier from source documents
- `page`: source page number within a bobine
- `arrondissement`: top-level administrative division
- `quartier`: subdivision inside an arrondissement
- `ilot`: block number inside a quartier
- `rue`: canonical street entity
- `source entry`: one handwritten/printed notation line from source
- `source_entries`: normalized table storing one row per source entry
- `segment`: one normalized (street, parity, range) unit stored in `street_segments`

## Canonical Suffix Ranking

Suffixes are ordered positions on the house-number axis.

- `""` (none) -> `0`
- `bis` -> `1`
- `ter` -> `2`
- `quater` -> `3`
- `quinquies` -> `4`

Ordering example:

`8 < 8bis < 8ter < 8quater < 8quinquies < 10`

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

If an extracted range has mismatched endpoint parity, the extractor must treat it as invalid and skip/log it.

## Rue Canonicalization

The source `ADRESSE` column is parsed in two stages: **canonicalization** (semantic), then **normalization** (string shape). Both happen in the extractor; the DB only stores canonical and normalized forms.

### Stage 1 — canonicalization

Input: a literal source string, e.g. `Bd Raspail`, `av. de l'Observatoire`, `Rue St Denis`, `Rue Notre Dame des Champs`.

1. Identify the **type token** (first word, possibly abbreviated):
   - `Rue` → `Rue`
   - `Bd`, `Bld` → `Boulevard`
   - `Av.`, `av.`, `Av` → `Avenue`
   - `Pl.` → `Place`
   - (full canonical forms pass through)
2. The **libellé** is the remainder of the string.
3. Inside the libellé, expand abbreviations to canonical forms:
   - `St` → `Saint`, `Ste` → `Sainte`
4. Preserve canonical hyphenation in the libellé where appropriate (e.g. `Notre-Dame-des-Champs`, `Cherche-Midi`, `Saint-Honoré`).

The single source of truth for the type enum and abbreviation map is `apps/api/src/lib/voie-type.ts`.

If the first token is not a known type or alias, the entry is **rejected** (skip + log) — the source always carries a type.

### Stage 2 — normalization

The canonical libellé is run through the shared normalize function (see `docs/DOMAIN_MODEL.md` → Normalized form) to produce `libelle_normalized`.

### Lookup or insert

Look up `rues` by `(type, libelle_normalized)`. Insert if missing. The same row is reused across all source entries that resolve to the same canonical `(type, libellé)`.

## Source Entry To Row Mapping

A source entry may produce one or many rows.

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

### Explicit enumeration (no compression)

- `12, 14, 16` -> three singleton rows:
  - `12..12`
  - `14..14`
  - `16..16`

Do not compress to `12..16`.

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

## Provenance Model

Provenance is normalized into `source_entries`:

- `bobine`
- `page`
- `raw_text` (literal source notation)
- optional `sequence` and `notes`

Each `street_segments` row references one `source_entries` row via `source_entry_id`.
If one source entry yields multiple segments, those segments share the same `source_entry_id`.

## No-Go Cases

The extractor must reject (skip + log) and never invent encodings for:

- open-ended ranges (not expected in dataset)
- segments without house numbers
- cross-quartier multi-ilot groupings
- parity value outside `odd`/`even`
- unknown suffix tokens not in `SUFFIX_RANK`

## Search-Time Mirror

Search parsing should produce:

- `type` (canonical voie type, after applying the same canonicalization as extraction)
- `libelle_normalized` (libellé run through the shared normalize function)
- `n` (house number integer)
- `n_rank` (`rankOfSuffix(userSuffix)`)
- `parity` (`even`/`odd` from `n`)

Querying must use the same ordering semantics as extraction.

When you need provenance in results, join `source_entries` on `s.source_entry_id`.

## Canonical Lookup SQL

```sql
SELECT a.number AS arr, q.name AS quartier, i.number AS ilot
FROM street_segments s
JOIN rues r            ON r.id = s.rue_id
JOIN segment_ilots si  ON si.segment_id = s.id
JOIN ilots i           ON i.id = si.ilot_id
JOIN quartiers q       ON q.id = i.quartier_id
JOIN arrondissements a ON a.id = q.arrondissement_id
WHERE r.type = :type
  AND r.libelle_normalized = :libelle
  AND s.parity = :parity
  AND (s.from_number, s.from_suffix_rank) <= (:n, :n_rank)
  AND (:n, :n_rank) <= (s.to_number, s.to_suffix_rank);
```

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
JOIN rues r            ON r.id = s.rue_id
JOIN segment_ilots si  ON si.segment_id = s.id
JOIN ilots i           ON i.id = si.ilot_id
JOIN quartiers q       ON q.id = i.quartier_id
JOIN arrondissements a ON a.id = q.arrondissement_id
WHERE r.type = :type
  AND r.libelle_normalized = :libelle
  AND s.parity = :parity
  AND (s.from_number, s.from_suffix_rank) <= (:n, :n_rank)
  AND (:n, :n_rank) <= (s.to_number, s.to_suffix_rank)
ORDER BY se.bobine, se.page, COALESCE(se.sequence, 0), i.number;
```

## Deferred Topics

Out of scope for this document and current schema pass:

- street aliases and fuzzy matching tables
- conflict resolution across bobines
- FTS5 acceleration for text search
- occupant/person-level per-house modeling
