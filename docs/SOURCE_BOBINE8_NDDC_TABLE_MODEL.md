# Source analysis: Bobine 8 — Notre-Dame-des-Champs (6ᵉ) lookup tables

This note describes the **logical data structures, relations, and hierarchies** implied by the handwritten “bobine” lookup document used to determine **îlot** numbers from **street + house number** in the **Notre-Dame-des-Champs** area of **Paris 6ᵉ arrondissement** (archival context **1946/8**, series reference **2MI 24** on the scans).

The PDF is **image-only** (no text layer). Structure below is inferred from visual layout across **six pages**, each using the same grid pattern.

## Document scope (root)

Each page shares a **header band** that fixes the scope of every row on that page:

| Level | Meaning on the source |
|--------|------------------------|
| **Quartier** | Notre-Dame-des-Champs (title text) |
| **Arrondissement** | 6ᵉ |
| **Archival series / bobine** | References such as `2MI 24`, circled reel **⑧**, and “page *n*” in the BOBINE column |
| **Period** | `1946/8` (treated as provenance metadata, not a lookup key) |

**Implication:** every extracted row should carry **quartier + arrondissement + source page/reel** as provenance, while using the source **îlot number as a globally unique key** in the project model (see `docs/DOMAIN_MODEL.md`).

## Physical layout: two parallel tables per page

Each page is split **vertically** into **two identical four-column grids** (left and right), separated by a **thick double rule**. Reading order is **top-to-bottom within a column-set**, then typically **continue on the other half of the page** as space runs out (the list is one logical stream broken for typography, not two independent datasets).

## Column semantics (printed headers vs actual use)

| Printed header | Typical content | Semantic role |
|----------------|-----------------|---------------|
| **BOBINE** | Mostly blank; occasional `⑧ page k` | **Microfilm reel** and **sheet/page within this PDF** — provenance pointer, not an address key |
| **PAGE** | `Ilot NNN` (handwritten) | **Îlot identifier** — the **primary grouping key** for the rows below until the next `Ilot …` |
| **ADRESSE** | Street / voie name (cursive) | **Rue (or place, bd, av., etc.)** — the street facet of the address |
| **N°** | House numbers, lists, ranges | **Numéro** side of the address, in a **domain-specific micro-notation** |

**Important:** the column printed **PAGE** holds **îlot** labels, not pagination. Any digitization pipeline should **rename** this field to `ilot` (or `ilot_label`) to avoid confusion with PDF page numbers.

## Core hierarchy (nested)

The table is a **three-level repeating group** with **sticky** parent keys:

```text
Document scope (header: quartier, arrondissement, series, date)
  └── Ilot N          [PAGE column; repeats only when N changes — “sticky” ilot]
        └── Row       [ADRESSE + N°]
              (multiple rows per ilot; multiple rows per street within same ilot)
```

There is **no deeper printed level** (no “îlot section”, no building id). The **atomic published fact** in the source is best modeled as:

> **(ilot_number, voie_label_as_written, numero_notation_as_written)**

Normalization into typed house numbers and canonical street entities is a **downstream** concern.

## Relations (cardinality)

### Ilot → rows (one-to-many)

One **îlot** groups **many** `(ADRESSE, N°)` rows until the scribe writes the next `Ilot …`. Empty cells in the **PAGE** column mean **“same îlot as above”** (inheritance / carry-forward).

### Street ↔ îlot (many-to-many)

The same **street name** appears under **different îlots** with **different number sets**. Example pattern seen on the scans: long axes such as *Rue Notre-Dame-des-Champs*, *Rue de Rennes*, *Bd du Montparnasse* each recur under successive îlots with disjoint or adjacent number bands.

**Implication:** the source is **not** a function `(street) → îlot`. The lookup direction implemented in the domain model — **`(street, house number) → îlot`** (possibly multiple) — matches the table’s intent.

### One row → multiple logical segments

A single handwritten row can encode **several disjoint ranges or lists** in **N°** (commas, multiple arrows, line breaks inside the cell). For a relational model, that row is often easier to treat as **several `street_segment`-like facts** sharing the same **îlot** and **street**.

### Boundary and ambiguity cases

- **Two îlot labels in one cell** (e.g. `Ilot 820` and `Ilot 821` together): marks a **shared edge**, **correction**, or **transition**. Extraction should preserve **both labels** plus **verbatim cell text** and flag **manual review**.
- **Strikethroughs and superscripts** (e.g. wrong îlot crossed out, replaced): treat as **versioning at source**; store **raw** + **interpreted** with a **confidence / needs_review** flag.
- **Multi-line street names**: a single voie may be split across two lines in **ADRESSE**; merge on **same îlot** when the second line has **empty N°** continuation pattern (heuristic).

## `N°` column: notation grammar (informal)

The **N°** field behaves like a **small DSL** rather than a single integer:

| Pattern | Meaning |
|---------|---------|
| `a -> b` | Inclusive (or street-order) **range** from `a` to `b` |
| `n, m, p` | **Finite set** of numbers |
| Mix of commas and `->` | **Union** of sets/ranges in one cell |
| `bis`, `ter`, … | French **suffix** forms (e.g. `4 bis`, `4ter`) — must remain **suffixes on the preceding numeral token**, not separate tokens |
| Leading zeros (`05`) | Filing / handwriting convention — normalize to integer + suffix in structured data |
| Line breaks inside cell | Same logical row continued — join before parsing |

**Parity:** the table does **not** consistently print separate columns for **pair / impair**; when the domain model stores parity, it is **derived** from parsed numbers and local street context, not from this column header.

## Mapping to the repository domain model

Alignment with `docs/DOMAIN_MODEL.md` (conceptual, not a mandate to change schema):

| Source construct | Domain analogue |
|------------------|-----------------|
| Header (6ᵉ, Notre-Dame-des-Champs) | `arrondissement` + `quartier` context for every `ilot` |
| `Ilot N` | `ilots.number` (globally unique), with `ilots.quartier_id` carrying hierarchy attachment |
| `(ADRESSE, N°)` rows under one îlot | One or more **`street_segments`** (parsed ranges/suffixes) linked via **`segment_ilots`** |
| BOBINE / page of bobine | **`source_entries`** provenance (reel, sheet, scan page) |

The source **does not** split voie into **type + libellé**; that split is a **canonicalization** choice documented elsewhere (see `rues` in `DOMAIN_MODEL.md`).

## Suggested normalized extraction shape (logical)

For each **interpreted** line after sticky-îlot resolution:

```json
{
  "quartier": "Notre-Dame-des-Champs",
  "arrondissement": 6,
  "ilot_numbers": [818],
  "voie_raw": "Rue Madame",
  "numeros_raw": "8 -> 10",
  "source": {
    "bobine": 8,
    "pdf_page": 1,
    "scan_note": "⑧ page 1"
  }
}
```

Use an **array** for `ilot_numbers` when the PAGE cell lists more than one îlot.

## Machine-readability note

The file analyzed is **raster-only** (JPEG tiles per page). Reliable full transcription requires **OCR tuned for French handwriting** or **manual keying**. Automated geometric table extraction may still help for **cell boundaries**, but **N°** parsing needs the DSL rules above plus human review for crossed-out cells.

## Source file reference

Original PDF path (local Cursor workspace storage; not committed to this repo):

`Bobine 8 - 6ème - NOTRE-DAME-DES-CHAMPS.pdf` (six pages).
