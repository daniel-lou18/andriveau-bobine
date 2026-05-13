# Source analysis: Bobine 8 — Notre-Dame-des-Champs (6ᵉ) lookup tables

This note describes the **logical data structures, relations, and hierarchies** implied by the handwritten “bobine” lookup document used to determine **îlot** numbers from **street + house number** in the **Notre-Dame-des-Champs** area of **Paris 6ᵉ arrondissement** (archival context **1946/8**, series reference **2MI 24** on the scans).

The PDF is **image-only** (no text layer). Structure below is inferred from visual layout across **six pages**, each using the same grid pattern.

**LLM interchange:** the repository-wide JSON shape, prompt-ready reading rules, and loader summary live in **`docs/LLM_EXTRACTION_INTERCHANGE.md`**. This note stays focused on **bobine 8** layout and column semantics.

**Other registers:** a second scribe (bobine **43**, **Grandes Carrières** 18ᵉ) uses **semicolons** in **N°**, **Adresse ditto `"`**, and **`NEANT`** skip rows — see **`data/docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`**.

## Document scope (root)

Each page shares a **header band** that fixes the scope of every row on that page:

| Level                        | Meaning on the source                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| **Quartier**                 | Notre-Dame-des-Champs (title text)                                                   |
| **Arrondissement**           | 6ᵉ                                                                                   |
| **Archival series / bobine** | References such as `2MI 24`, circled reel **⑧**, and “page _n_” in the BOBINE column |
| **Period**                   | `1946/8` (treated as provenance metadata, not a lookup key)                          |

**Implication:** every extracted row should carry **quartier + arrondissement + source page/reel** as provenance, while using the source **îlot number as a globally unique key** in the project model (see `docs/DOMAIN_MODEL.md`).

## Physical layout: two parallel tables per page

Each page is split **vertically** into **two identical four-column grids** (left and right), separated by a **thick double rule**. Reading order is **top-to-bottom within a column-set**, then typically **continue on the other half of the page** as space runs out (the list is one logical stream broken for typography, not two independent datasets).

The grid is **hand-ruled** (verticals and horizontals); column boundaries are reliable enough to treat **BOBINE | PAGE | ADRESSE | N°** as four lanes within each half-page. The **îlot** label in the PAGE column is often **visually centered** against the **first** address row of the block it introduces, while subsequent rows under the same îlot leave that column blank — use blank cells for sticky inheritance, not vertical span alone.

## Visual and transcription cues (LLM / OCR)

These observations come from the bobine 8 scans (including multi-line **ADRESSE** cells, dense **N°** blocks, and sparse **BOBINE** / **PAGE** columns). They **complement** the cross-bobine rules in **`docs/LLM_EXTRACTION_INTERCHANGE.md`**; persistence policy (reject vs parse) stays in **`docs/EXTRACTION.md`**.

### Header strip

The top of each page typically carries a **single line** fixing scope, e.g. quartier name, **6ᵉ**, archival series (**`2MI 24`** or close handwritten variants), and period **`1946/8`**. Treat spelling / spacing variants in the series token as **audit-only** provenance unless you normalize them deliberately; they do not replace `source_entries.bobine` (integer reel).

### Sticky **BOBINE** as well as **PAGE**

The **BOBINE** column is usually **almost empty**: one cell may hold a circled reel digit and a sheet hint (e.g. `⑧ page 2`). That **same reel context applies to the whole page** (and inherited row-to-row like the îlot column) until a new BOBINE cell is inked. For JSON: map the circled reel to the integer in `document_scope.bobine` / per-record provenance; keep the exact glyph string in `scan_note` if useful for QA.

### Multi-îlot cells (variants)

Besides two labels in one line (`Ilot 820` … `Ilot 821`), the scans sometimes show **stacked** or **repeated** îlot numbers in one PAGE cell (e.g. a vertical list or duplicated pairs). Emit **`ilot_numbers`** as the **ordered list of distinct** îlot integers as read (de-dupe while preserving order if the clerk repeated a pair intentionally — when in doubt, preserve source order and let QA reconcile).

### **N°** density and non-linear layout inside the cell

- **Several lines of ink inside one N° cell** (stacked or wrapped) still belong to the **same printed row**’s address unless the **N°** clearly continues **downward** beside a **blank ADRESSE** (then stitch into one logical row per `CONTEXT.md`).
- **Comma lists** may run in **street order** either ascending or descending (e.g. `56, 54, 52, …`) — they remain a **finite set**; transcribe **verbatim** in `numeros_raw`.
- **`/` notation** (e.g. `10/12`) appears on the sheets. Transcribe **as written**; do not silently split or merge until the validated parser (`docs/EXTRACTION.md`) defines behavior.
- **Handwriting corrections** (digits written over other digits): prefer the **final** intended value when legible; if two readings remain plausible, emit the best reading in `numeros_raw` and set **`low_confidence`** (`docs/LLM_EXTRACTION_INTERCHANGE.md`).
- **Leading arrow only** (e.g. `-> 132, 136` with no left endpoint in the same cell): **appears in the corpus** — still transcribe verbatim; whether the loader accepts it is governed by **`docs/EXTRACTION.md`** (finite ranges / no-gos), not by the vision model.

### Margin marks

Small **dots, ticks, or checkmarks** in the margins are common; they are **not** part of the address mapping unless product policy says otherwise. Omit from structured fields; optional mention in freeform audit notes only.

## Column semantics (printed headers vs actual use)

| Printed header | Typical content                     | Semantic role                                                                                  |
| -------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| **BOBINE**     | Mostly blank; occasional `⑧ page k` | **Microfilm reel** and **sheet/page within this PDF** — provenance pointer, not an address key |
| **PAGE**       | `Ilot NNN` (handwritten)            | **Îlot identifier** — the **primary grouping key** for the rows below until the next `Ilot …`  |
| **ADRESSE**    | Street / voie name (cursive)        | **Rue (or place, bd, av., etc.)** — the street facet of the address                            |
| **N°**         | House numbers, lists, ranges        | **Numéro** side of the address, in a **domain-specific micro-notation**                        |

**Important:** the column printed **PAGE** holds **îlot** labels, not pagination. Any digitization pipeline should **rename** this field to `ilot` (or `ilot_label`) to avoid confusion with PDF page numbers.

## Core hierarchy (nested)

The table is a **three-level repeating group** with **sticky** parent keys:

```text
Document scope (header: quartier, arrondissement, series, date)
  └── Row stream (linear reading order; see Physical layout)
        ├── Sticky BOBINE hint   [sparse: circled reel + optional “page k”; blank = inherit]
        ├── Sticky Ilot N        [PAGE column: blank = same îlot as above]
        └── ADRESSE + N°
              (multiple **printed** rows per îlot; one **logical** provenance row may span several ruled lines when **N°** overflows downward — see `CONTEXT.md` / `docs/EXTRACTION.md` Provenance Model)
```

There is **no deeper printed level** (no “îlot section”, no building id). The **atomic published fact** in the source is best modeled as:

> **(ilot_number, voie_label_as_written, numero_notation_as_written)**

Normalization into typed house numbers and canonical street entities is a **downstream** concern.

## Relations (cardinality)

### Ilot → rows (one-to-many)

One **îlot** groups **many** `(ADRESSE, N°)` rows until the scribe writes the next `Ilot …`. Empty cells in the **PAGE** column mean **“same îlot as above”** (inheritance / carry-forward). Empty cells in the **BOBINE** column mean **“same reel / sheet note as above”** within the same linear reading order on that page.

### Street ↔ îlot (many-to-many)

The same **street name** appears under **different îlots** with **different number sets**. Example pattern seen on the scans: long axes such as _Rue Notre-Dame-des-Champs_, _Rue de Rennes_, _Bd du Montparnasse_ each recur under successive îlots with disjoint or adjacent number bands.

**Implication:** the source is **not** a function `(street) → îlot`. The lookup direction implemented in the domain model — **`(street, house number) → îlot`** (possibly multiple) — matches the table’s intent.

### One printed row → multiple logical segments

A single **printed grid row** (one horizontal band of cells) can encode **several disjoint ranges or lists** in **N°** (commas, multiple arrows, line breaks **inside** the N° cell). For a relational model, that content is often split into **several `street_segments`** sharing the same **îlot** and **street**. A **logical** `source_entries` row can also **stitch** N° ink that continues **down** across further ruled lines (blank ADRESSE beside the continuation) — same story: multiple segments, one provenance row (`CONTEXT.md`).

### Boundary and ambiguity cases

_What the paper shows; **ingestion policy** (skip vs persist, `raw_text` stitching, `segment_ilots`) is canonical in **`CONTEXT.md`** and **`docs/EXTRACTION.md`**._

- **Two îlot labels in one cell** (e.g. `Ilot 820` and `Ilot 821` together), or **bracket grouping** of several îlots for one address: often a **shared edge** or clerk grouping on the sheet. In the DB, **multiple îlots** on the same segments are **`segment_ilots`** (same quartier).
- **Strikethroughs and superscripts** (e.g. wrong îlot crossed out, replaced): **versioning at source** on the scan. The **v1 extractor skips** crossed-out / rejected lines rather than persisting a parallel “interpreted” row (`docs/EXTRACTION.md`).
- **Multi-line voie in ADRESSE**: long names normally **wrap inside the printed address cell** (several lines of cursive **within** the box). Do not confuse with **N°** continuing **down** ruled rows beside a blank ADRESSE (**sticky street** + tall number block — `CONTEXT.md`).

## `N°` column: notation grammar (informal)

The **N°** field behaves like a **small DSL** rather than a single integer:

| Pattern                                           | Meaning                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `a -> b`                                          | Inclusive (or street-order) **range** from `a` to `b`                                                                         |
| `n, m, p`                                         | **Finite set** of numbers (order may follow street direction — ascending or descending on the axis)                           |
| Mix of commas and `->`                            | **Union** of sets/ranges in one cell                                                                                          |
| Semicolon (`;`) between tokens                    | Used heavily by **other scribes** (e.g. bobine 43); **same union semantics** as comma — see **`docs/EXTRACTION.md`** / **`data/docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`** |
| `n / m` (slash)                                   | **Third union separator**, equivalent to `,` and `;` (`docs/EXTRACTION.md` → List separators / Mixed singleton + range list). `10/12` → singletons `10` and `12` under one `source_entries`; `5 -> 7 / 6` → range `5..7` + singleton `6`. Adjacent-civic-number convention on Haussmann parcels.    |
| `-> b` or `-> b, c` (no left endpoint in cell)    | **Appears** in the corpus; transcribe verbatim; acceptance is **not** assumed — see **`docs/EXTRACTION.md`** → No-Go Cases      |
| `bis`, `ter`, …                                   | French **suffix** forms (e.g. `4 bis`, `4ter`, `59 -> 61 bis`) — suffix stays on the **numeral token** it modifies              |
| Leading zeros (`05`, `07`)                        | Filing / handwriting convention — normalize to integer + suffix in structured data                                            |
| Line breaks / stacked ink inside N° cell          | Same logical **notation** for that printed row — join sensibly for `numeros_raw`; do not split into two logical records without a blank ADRESSE continuation |
| N° continues on ruled lines below (ADRESSE blank) | Same **logical** `source_entries` row — **stitch** for `raw_text`, then parse (`CONTEXT.md`)                                  |

**Parity:** on this bobine the table does **not** consistently print separate columns for **pair / impair**; parity in the model is usually **derived** from parsed numbers. If a source layout uses explicit pair/impair columns, see **`docs/EXTRACTION.md`**.

## Mapping to the repository domain model

Alignment with `docs/DOMAIN_MODEL.md` (conceptual, not a mandate to change schema):

| Source construct                    | Domain analogue                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Header (6ᵉ, Notre-Dame-des-Champs)  | `arrondissement` + `quartier` context for every `ilot`                                    |
| `Ilot N`                            | `ilots.number` (globally unique), with `ilots.quartier_id` carrying hierarchy attachment  |
| `(ADRESSE, N°)` rows under one îlot | One or more **`street_segments`** (parsed ranges/suffixes) linked via **`segment_ilots`** |
| BOBINE / page of bobine             | **`source_entries`** provenance (reel, sheet, scan page)                                  |

The source **does not** split voie into **type + libellé**; that split is a **canonicalization** choice documented elsewhere (see `rues` in `DOMAIN_MODEL.md`).

## Suggested normalized extraction shape (logical)

The **canonical** batch JSON (`document_scope` + `logical_records[]` with structured `rue`, `raw_text`, `numeros_raw`, and provenance fields) is defined in **`docs/LLM_EXTRACTION_INTERCHANGE.md`**.

For each **interpreted** line after sticky-îlot resolution, that document’s `logical_records[]` elements replace the older minimal sketch. In particular, emit **`ilot_numbers`** as an array when the PAGE cell lists more than one îlot, and use the structured **`rue`** object (`type` + `libelle` per `docs/EXTRACTION.md`), not only a raw voie string.

## Machine-readability note

The file analyzed is **raster-only** (JPEG tiles per page). Reliable full transcription requires **OCR tuned for French handwriting** or **manual keying**. Automated geometric table extraction may still help for **cell boundaries**, but **N°** parsing needs the DSL rules above plus human review for crossed-out cells.

## Source file reference

Scan in the repo: **`data/source-tables/Bobine 8 - 6ème - NOTRE-DAME-DES-CHAMPS.pdf`** (six pages). Sample interchange output: **`data/extracted-tables/bobine8-extraction.json`**.
