# LLM extraction interchange

This document defines the **structured payload** a frontier model (plus any layout front-end) should emit from a bobine-style register **before** application validation and D1 writes.

It is **not** the persistence contract: numeric suffixes, parity, segment splitting, rejections, and lookup mirroring remain canonical in **`docs/EXTRACTION.md`**. Entities and FK shapes are in **`docs/DOMAIN_MODEL.md`**. A concrete **printed grid** analysis for one corpus (bobine 8, Notre-Dame-des-Champs) is in **`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`**.

**Out of scope here:** OCR engine choice, geometric table detection, prompt templates, and human-review workflow.

---

## Related documents (read order)

1. **`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`** (or the layout note for the bobine you process) — column semantics, two-column reading order, N° as a small DSL.
2. **This file** — one JSON document per extraction batch, prompt-ready disambiguation and sticky rules.
3. **`docs/EXTRACTION.md`** — what the loader must enforce when turning this payload into `source_entries`, `rues`, `street_segments`, `segment_ilots`.
4. **`docs/DOMAIN_MODEL.md`** — table fields, uniqueness, lookup read pattern.

---

## Disambiguation: `bobine`, PDF page, and the printed “PAGE” column

| Concept | Meaning | Maps to |
| -------- | -------- | -------- |
| **Reel / bobine (data)** | Archival reel identifier as a **plain integer** for storage. | `source_entries.bobine` |
| **`pdf_page`** | 1-based page index in the **PDF file** (or image bundle) being processed. | Provenance and QA ordering; often equals `source_entries.page` when one PDF is one bobine. |
| **`source_entries.page`** | Page number **within the bobine** in your pipeline’s convention. | Usually align with `pdf_page` for a single-PDF bobine; if the scan’s BOBINE cell says “page *k*” and your project uses that as the canonical sheet index, use *k* here and still put the reel integer in `bobine`. |
| **Printed column “PAGE”** | On the paper, this cell holds **`Ilot NNN`**, not pagination. | **Never** use this column as `pdf_page`. Resolve to **`ilot_numbers`** (after sticky rules). |

Optional **audit-only** strings (series codes such as `2MI 24`, circled reel glyphs, freehand margin notes) may appear in `scan_note` or `document_scope.audit`; they are **not** extra structured columns in D1 unless you extend the schema deliberately.

---

## Physical reading rules (prompt-ready)

Apply these **after** fixing **document scope** from the page header (`quartier`, `arrondissement`, and any header-only provenance you copy into `document_scope.audit`).

1. **Linear reading order** — Follow the layout note for your bobine. For the bobine 8 grid: **top to bottom within the left four-column block**, then **top to bottom within the right block** on the same sheet; the two halves are **one** logical stream, not two independent tables (`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`).
2. **Sticky îlot** — When the printed **PAGE** cell (îlot column) is **empty** for a row, that row **inherits** the same `ilot_numbers` as the **previous** row in that linear order until a new `Ilot …` appears.
3. **Multi-îlot in one cell** — If one handwritten cell lists several îlots (or bracketed grouping), emit **`ilot_numbers`** as an **array** of integers in source order. Loaders attach every produced segment to each îlot via **`segment_ilots`**, same quartier only (`docs/EXTRACTION.md` → Multi-Ilot Attribution Rule).
4. **One logical register row** — Street + îlot + house numbers that belong together count as **one** interchange object, even when:
   - the **N°** ink **wraps inside** the cell, or
   - **N° continues downward** across ruled lines with **blank ADRESSE** beside it (“sticky” street + tall number block).
   In those cases produce **one** object with a single **`raw_text`** that **stitches** the full inscription the clerk intended as one notation (`CONTEXT.md`, `docs/EXTRACTION.md` → Provenance Model).
5. **Multi-line ADRESSE** — Wrapping **inside** the address cell is still one voie line; do not split into two logical records on that basis alone.
6. **Skip rejected ink** — Lines or blocks that are **crossed out** or otherwise rejected on the source are **omitted** from `logical_records` in v1 (`docs/EXTRACTION.md` → Segment quality flags / provenance policy).

---

## JSON shape (informal schema)

The batch root has **document-level** scope (shared across the file when the whole PDF is one quartier/bobine) and an array of **logical records**.

### `document_scope` (required)

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `quartier` | string | yes | Must match the page header for the pages in this batch (per-page override below if ever needed). |
| `arrondissement` | integer | yes | e.g. `6` for 6ᵉ. |
| `bobine` | integer | yes | Value for `source_entries.bobine`. |
| `audit` | object | no | Optional provenance not stored as first-class columns: e.g. `period`, `series`, `source_filename`. |

### `logical_records[]` (required, non-empty)

Each element is **one** logical register row after sticky îlot resolution and stitching.

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `reading_order_index` | integer | yes | Stable **0-based** order in the linear traversal (§ Physical reading rules). Used for QA and deterministic `sequence`. |
| `pdf_page` | integer | yes | 1-based page in the PDF/image bundle. |
| `page` | integer | no | Explicit value for `source_entries.page` if it **differs** from `pdf_page`; otherwise the loader may copy `pdf_page`. |
| `ilot_numbers` | integer[] | yes | One or more globally unique îlot numbers (`ilots.number`). |
| `raw_text` | string | yes | Single stitched inscription for `source_entries.raw_text` (street + îlot context + numbers as read, or your pipeline’s agreed provenance string). |
| `rue` | object | yes | Canonical voie split for validation: `type` (lowercase `voie_types.code`), `libelle` (canonical form per `docs/EXTRACTION.md`), optional `inferred`: `true` when the model inferred the type from an abbreviation-free source line. |
| `numeros_raw` | string | yes | House-number cell as transcribed (commas, arrows, `bis`, leading zeros, line breaks normalized to spaces if needed). The application parses this into `street_segments` per **`docs/EXTRACTION.md`**. |
| `sequence` | integer | no | If set, preferred ordering among rows on the same bobine page; otherwise the loader may derive from `reading_order_index`. |
| `scan_note` | string \| null | no | Audit-only glyph or cell note (e.g. circled “⑧ page 4”). |
| `low_confidence` | boolean | no | If `true`, persisted segments should set **`SEGMENT_QUALITY.LOW_CONFIDENCE_EXTRACTION`** (`docs/EXTRACTION.md` → Segment quality flags). |

**Per-page header variance:** if a single batch ever mixes pages under different headers, either split into **multiple JSON documents** or add an optional `quartier` / `arrondissement` on each `logical_records[]` element and require the loader to resolve `quartier_id` per row. The bobine 8 NDDC PDF is **uniform** per `docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`.

---

## Example (minimal)

```json
{
  "document_scope": {
    "quartier": "Notre-Dame-des-Champs",
    "arrondissement": 6,
    "bobine": 8,
    "audit": { "period": "1946/8", "series": "2MI 24" }
  },
  "logical_records": [
    {
      "reading_order_index": 0,
      "pdf_page": 4,
      "page": 4,
      "ilot_numbers": [845],
      "raw_text": "Ilot 845 Rue Stanislas 9 -> 11",
      "rue": { "type": "rue", "libelle": "Stanislas" },
      "numeros_raw": "9 -> 11",
      "scan_note": "⑧ page 4",
      "low_confidence": false
    },
    {
      "reading_order_index": 1,
      "pdf_page": 4,
      "page": 4,
      "ilot_numbers": [845],
      "raw_text": "Rue Stanislas 6 -> 16",
      "rue": { "type": "rue", "libelle": "Stanislas" },
      "numeros_raw": "6 -> 16"
    }
  ]
}
```

---

## Loader responsibilities (summary)

The application **validates** each record against **`docs/EXTRACTION.md`** (voie type codes, suffix ranks, parity, finite ranges, no-gos), resolves **`quartier_id`** and existing **`ilots`**, inserts **`source_entries`**, resolves or inserts **`rues`**, emits **`street_segments`**, and links **`segment_ilots`** for each `(segment, ilot)` pair. Exact SQL and triggers are described in **`docs/DOMAIN_MODEL.md`**.

If this payload and **`docs/EXTRACTION.md`** diverge, **update `docs/EXTRACTION.md` first**, then align this interchange document.
