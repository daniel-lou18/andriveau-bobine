# LLM prompt: bobine scan → uniform JSON

## Will this yield valid, uniform JSON for both example sources?

**Shape:** Yes. Bobine 8 (NDDC) and bobine 43 (Grandes Carrières) both target the **same** object defined in **`docs/LLM_EXTRACTION_INTERCHANGE.md`**: `document_scope` + `logical_records[]`, with identical field names and types.

**Downstream validity:** The JSON is **interchange** input, not a guarantee that every row loads into D1 unchanged. A separate validator/loader applies **`docs/EXTRACTION.md`** (e.g. `type` must exist in `voie_types`, finite ranges, suffix ranks, parity). Set `low_confidence: true` when the scan is ambiguous.

For each run, attach **(1)** the page image(s) or PDF, **(2)** the full text of the matching **source layout** doc (`docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md` *or* `docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`), and **(3)** optional: `docs/LLM_EXTRACTION_INTERCHANGE.md` (or rely on the schema below).

---

## Copy-paste prompt (user message)

Use this as the **user** message. Replace the bracketed placeholders.

```
You are transcribing a historical Paris bobine register page into structured JSON for a database pipeline.

## Inputs you must follow
1. **Layout / scribal rules:** Apply EVERY rule in the SOURCE LAYOUT NOTE pasted below (reading order, column names, sticky îlot, sticky Bobine, ditto marks, NEANT skips, N° delimiters, stitching multi-line N°, etc.). If the layout note conflicts with a guess, trust the layout note.

2. **Output contract:** Emit exactly ONE JSON object. No commentary before or after. No markdown code fences. Valid JSON only.

## SOURCE LAYOUT NOTE (paste full file for this bobine)
<<<PASTE docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md OR docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md HERE>>>

## Global rules (always)
- **Linear reading order** for two-pane pages: top→bottom in the LEFT four-column block, then top→bottom in the RIGHT block on the same sheet; one stream, not two independent tables.
- **Sticky îlot:** blank îlot cell → same `ilot_numbers` as the previous row in that stream.
- **Ditto `"` in Adresse (when used on this register):** cell contains only `"` → reuse the **same street text** as the row immediately above; îlot still from sticky îlot column.
- **NEANT:** if Adresse is NEANT (often with "/" in N°), **omit** that printed row entirely — do not add a `logical_records` element.
- **Crossed-out / rejected** lines: omit (do not emit records).
- **One logical row:** if N° continues down beside a blank Adresse for the same street, **stitch** into one record with one `raw_text` and combined `numeros_raw`.
- **Multi-ilot cell:** `ilot_numbers` is an integer array in reading order.
- **`pdf_page`:** 1-based index of this image in the PDF or page bundle you are given.
- **`bobine`:** integer reel id for `document_scope.bobine` (e.g. 8 or 43 when visible as ⑧ / (43)); put informal glyphs in `scan_note` if useful.
- **Printed îlot column is NOT PDF page:** never put PDF page number into `ilot_numbers`.

## Rue object (`rue`)
- `type`: lowercase canonical French voie type code matching the table `voie_types` in the project (examples: "rue", "boulevard", "avenue", "place", "impasse", "passage", "square", "villa", "chemin", "allée", "quai", "cité", "petite rue", "faubourg", …). Use the **longest correct** multi-word type when needed (e.g. "petite rue" not "rue" for "Petite Rue …").
- `libelle`: canonical libellé string AFTER removing the type from the spoken name, with French hyphenation/apostrophe rules as in good gazetteer style (e.g. "Notre-Dame-des-Champs", "du Cherche-Midi", "d'Assas"). Expand common abbreviations in the libellé: St→Saint, Ste→Sainte, etc.
- `inferred`: true only if the **type** was not written on the sheet and you inferred it (e.g. bare "Pierre Lescot" → rue).

## Required JSON schema

Root object:
- `document_scope` (object, required):
  - `quartier` (string, required): from page header, human-readable consistent form.
  - `arrondissement` (integer, required): e.g. 6 for 6ᵉ, 18 for 18ᵉ.
  - `bobine` (integer, required): reel number.
  - `audit` (object, optional): e.g. `period`, `series`, `source_filename` — strings only, audit metadata.
- `logical_records` (array, required): ordered list of extractable housing rows (see below). Omit NEANT-only rows. Array may be empty only if there is nothing to extract.

Each element of `logical_records`:
- `reading_order_index` (integer, required): 0-based order in your linear traversal across all rows you emit on this run.
- `pdf_page` (integer, required)
- `page` (integer, optional): if omitted, downstream may set `page` = `pdf_page`.
- `ilot_numbers` (array of integers, required): length ≥ 1.
- `raw_text` (string, required): one stitched provenance line (îlot + street + numbers as read, or your clearest single-line reconstruction).
- `rue` (object, required): `{ "type": string, "libelle": string, "inferred"?: boolean }`
- `numeros_raw` (string, required): **N°** cell transcribed **verbatim** (keep `,` and `;` as written; keep `->` or equivalent arrow; keep `bis`; normalize internal line breaks to single spaces if needed).
- `sequence` (integer, optional)
- `scan_note` (string or null, optional)
- `low_confidence` (boolean, optional): true if handwriting, overwrite, or notation is uncertain.

## Task for this request
- **Scope:** <<<one page | pages 3–5 | whole PDF>>>
- **Images/PDF:** (you have them in this chat / attachment)
- Produce the single JSON object for <<<describe scope>>>.

Begin the JSON with `{` and end with `}`.
```

---

## Optional system message (short)

If your client supports a separate system message:

```
You output only valid UTF-8 JSON. You follow the provided SOURCE LAYOUT NOTE for the active bobine. You never invent îlot or house numbers not supported by the scan. You omit NEANT rows and crossed-out content.
```

---

## Maintainer note

When the interchange schema changes, update **this file** and **`docs/LLM_EXTRACTION_INTERCHANGE.md`** together.
