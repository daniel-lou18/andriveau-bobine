# LLM extraction interchange

This document defines the **structured payload** a frontier model (plus any layout front-end) should emit from a bobine-style register **before** application validation and D1 writes.

It is **not** the persistence contract: numeric suffixes, parity, segment splitting, rejections, and lookup mirroring remain canonical in **`docs/EXTRACTION.md`**. Entities and FK shapes are in **`docs/DOMAIN_MODEL.md`**. **Printed-layout** variants by bobine/scribe are documented in **`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`** (6ᵉ NDDC) and **`docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`** (18ᵉ Grandes Carrières).

**Out of scope here:** OCR engine choice, geometric table detection, and human-review workflow.

**Prompt template:** a copy-paste user/system prompt aligned with this schema lives in **`docs/LLM_EXTRACTION_PROMPT.md`**.

---

## Related documents (read order)

1. **Source layout note for the PDF you process** — e.g. **`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`** (bobine 8) or **`docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`** (bobine 43): column semantics, two-column reading order, N° delimiters, ditto **`NEANT`**, etc.
2. **This file** — one JSON document per extraction batch, prompt-ready disambiguation and sticky rules.
3. **`docs/EXTRACTION.md`** — what the loader must enforce when turning this payload into `source_entries`, `rues`, `street_segments`, `segment_ilots`.
4. **`docs/DOMAIN_MODEL.md`** — table fields, uniqueness, lookup read pattern.

---

## Disambiguation: `bobine`, PDF page, and the printed îlot column

| Concept | Meaning | Maps to |
| -------- | -------- | -------- |
| **Reel / bobine (data)** | Archival reel identifier as a **plain integer** for storage. | `source_entries.bobine` |
| **`pdf_page`** | 1-based page index in the **PDF file** (or image bundle) being processed. | Provenance and QA ordering; often equals `source_entries.page` when one PDF is one bobine. |
| **`source_entries.page`** | Page number **within the bobine** in your pipeline’s convention. | Usually align with `pdf_page` for a single-PDF bobine; if the scan’s Bobine cell says “page *k*” / `p.k` and your project uses that as the canonical sheet index, use *k* here and still put the reel integer in `bobine`. |
| **Printed îlot column** | On some sheets the header is **`PAGE`** (mislabel), on others **`Ilot`** — both hold **îlot ids**, not PDF pagination. | **Never** use this column as `pdf_page`. Resolve to **`ilot_numbers`** (after sticky rules). |

Optional **audit-only** strings (series codes such as `2MI 24`, circled reel glyphs, freehand margin notes) may appear in `scan_note` or `document_scope.audit`; they are **not** extra structured columns in D1 unless you extend the schema deliberately.

---

## Physical reading rules (prompt-ready)

Apply these **after** fixing **document scope** from the page header (`quartier`, `arrondissement`, and any header-only provenance you copy into `document_scope.audit`).

1. **Linear reading order** — Follow the layout note for your bobine. Typical pattern: **top to bottom within the left four-column block**, then **top to bottom within the right block** on the same sheet; the two halves are **one** logical stream, not two independent tables (bobine 8: `docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`; bobine 43: `docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`).
2. **Sticky îlot** — When the printed **îlot** cell is **empty** for a row, that row **inherits** the same `ilot_numbers` as the **previous** row in that linear order until a new îlot number is written.
3. **Sticky voie (ditto `"`)** — On some registers the **Adresse** cell contains **only** a **double quote `"`**: repeat the **same street / voie line** as the **row immediately above** (îlot still comes from the sticky îlot column). See **`docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`**.
4. **Multi-îlot in one cell** — If one handwritten cell lists several îlots (or bracketed grouping), emit **`ilot_numbers`** as an **array** of integers in source order. Loaders attach every produced segment to each îlot via **`segment_ilots`**, same quartier only (`docs/EXTRACTION.md` → Multi-Ilot Attribution Rule).
5. **One logical register row** — Street + îlot + house numbers that belong together count as **one** interchange object, even when:
   - the **N°** ink **wraps inside** the cell, or
   - **N° continues downward** across ruled lines with **blank ADRESSE** beside it (“sticky” street + tall number block).
   In those cases produce **one** object with a single **`raw_text`** that **stitches** the full inscription the clerk intended as one notation (`CONTEXT.md`, `docs/EXTRACTION.md` → Provenance Model).
6. **Multi-line ADRESSE** — Wrapping **inside** the address cell is still one voie line; do not split into two logical records on that basis alone.
7. **`NEANT` rows** — When **Adresse** is **`NEANT`** (no housing inventory for that îlot span), **omit** the row from **`logical_records[]`** entirely — no `source_entries`, no segments. A slash **`/`** in **N°** often accompanies **`NEANT`**; still skip. Prose such as **`4121 à 4126`** in the same row is clerical scope, not a parse target.
8. **Skip rejected ink** — Lines or blocks that are **crossed out** or otherwise rejected on the source are **omitted** from `logical_records` in v1 (`docs/EXTRACTION.md` → Segment quality flags / provenance policy).
9. **List separators in `numeros_raw`** — Some scribes use **semicolon** (`;`) instead of **comma** between list items; **both** may appear in one cell. Transcribe **verbatim**; the validated parser treats them as the same **union** of singletons/ranges (`docs/EXTRACTION.md` → Source Entry To Row Mapping).

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

### `logical_records[]` (required)

Each element is **one** logical register row after sticky îlot resolution, **Adresse** ditto resolution, and stitching. **Exclude** any printed row marked **`NEANT`**. The array may be **empty** for an upload that has no extractable housing rows (rare); loaders should accept an empty list as a no-op for that file.

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `reading_order_index` | integer | yes | Stable **0-based** order in the linear traversal (§ Physical reading rules). Used for QA and deterministic `sequence`. |
| `pdf_page` | integer | yes | 1-based page in the PDF/image bundle. |
| `page` | integer | no | Explicit value for `source_entries.page` if it **differs** from `pdf_page`; otherwise the loader may copy `pdf_page`. |
| `ilot_numbers` | integer[] | yes | One or more globally unique îlot numbers (`ilots.number`). |
| `raw_text` | string | yes | Single stitched inscription for `source_entries.raw_text` (street + îlot context + numbers as read, or your pipeline’s agreed provenance string). |
| `rue` | object | yes | Canonical voie split for validation: `type` (lowercase `voie_types.code`), `libelle` (canonical form per `docs/EXTRACTION.md`), optional `inferred`: `true` when the model inferred the type from an abbreviation-free source line. |
| `numeros_raw` | string | yes | House-number cell as transcribed (commas **and/or** semicolons as list separators, arrows, `bis`, leading zeros, line breaks normalized to spaces if needed). The application parses this into `street_segments` per **`docs/EXTRACTION.md`**. |
| `sequence` | integer | no | If set, preferred ordering among rows on the same bobine page; otherwise the loader may derive from `reading_order_index`. |
| `scan_note` | string \| null | no | Audit-only glyph or cell note (e.g. circled “⑧ page 4”). |
| `low_confidence` | boolean | no | If `true`, persisted segments should set **`SEGMENT_QUALITY.LOW_CONFIDENCE_EXTRACTION`** (`docs/EXTRACTION.md` → Segment quality flags). |

**Per-page header variance:** if a single batch ever mixes pages under different headers, either split into **multiple JSON documents** or add an optional `quartier` / `arrondissement` on each `logical_records[]` element and require the loader to resolve `quartier_id` per row. Single-quartier PDFs (bobine 8 NDDC, bobine 43 Grandes Carrières) are **uniform** per their source notes.

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
