# Source analysis: Bobine 43 — Grandes Carrières (18ᵉ) lookup tables

This note describes the **logical layout and scribal conventions** of a second handwritten bobine register: **Grandes Carrières**, **Paris 18ᵉ**, on scans that carry reel references such as **`(43) p.1`** / **`B p 7`** in the **Bobine** column. It is **image-only** like bobine 8; structure is inferred from sample pages.

**Cross-reference:** shared JSON interchange and loader rules — **`docs/LLM_EXTRACTION_INTERCHANGE.md`**. The **6ᵉ** Notre-Dame-des-Champs grid (bobine 8) is **`data/docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`**. Persistence semantics — **`docs/EXTRACTION.md`**.

## How this register differs from bobine 8 (NDDC)

| Aspect | Bobine 8 (NDDC) | This register (Grandes Carrières) |
| ------ | ---------------- | ---------------------------------- |
| Îlot column header | Printed **PAGE** (misleading) | Printed **Ilot** (explicit) |
| List separators in **N°** | Mostly **comma** | Mostly **semicolon**; **comma** still appears; **mixed** in one cell (e.g. `75, 77; 85`) |
| Address repetition | Usually rewrites the street name | Often a **ditto** **`"`** (double quote) alone in **Adresse** = same street as **row above** |
| Empty blocks | (Not prominent on bobine 8 samples) | **`NEANT`** in **Adresse** (+ often **`/`** in **N°**) = **no housing rows** for that îlot span — **skip** (no `logical_records`, no DB rows) |
| Îlot numbering | Three-digit examples on bobine 8 sheets | **Four-digit** îlot ids on these sheets (e.g. `4089`–`4096`, `4113`…) |
| Header wording | Title line with quartier + 6ᵉ + series | e.g. **`QUARTIER: GRANDES CARRIERES`**, **`XVIII eme ardt`** (spelling variants) |

Same as bobine 8 where not noted: **two half-page grids**, **thick double rule**, linear read **left column top→bottom then right column top→bottom**, **sticky Bobine** and **sticky îlot** via **blank cells**, **arrow ranges** in **N°**, **`bis`**, multi-line cells, stitching rules (`CONTEXT.md`).

## Document scope (root)

| Level | Meaning on the source |
| ----- | --------------------- |
| **Quartier** | Grandes Carrières (header text; tolerate `QUARTIER:` / `QUARTIER =` variants) |
| **Arrondissement** | 18ᵉ (`XVIII eme ardt`, etc.) |
| **Bobine / sheet** | e.g. `(43) p.1`, circled **`B p 5`**, **`Bp 7`** — map parenthesized **`43`** to `source_entries.bobine`; `p.k` informs `page` / `scan_note` per **`docs/LLM_EXTRACTION_INTERCHANGE.md`** |
| **Period / series** | If present in margin or title, **audit-only** unless you normalize deliberately |

## Physical layout

- **Two** identical **four-column** blocks per page: **Bobine | Ilot | Adresse | N°** (labels match semantics — no “PAGE” mislabel).
- **Hand-ruled** grid; same **one logical stream** across the gutter as bobine 8.
- An **îlot** block may **start at the bottom of the left half** and **continue at the top of the right half** — reading order still defines the true sequence.

## Column semantics

| Printed header | Role |
| -------------- | ---- |
| **Bobine** | Sparse; circled or parenthesized reel + sheet hint; **blank = inherit** |
| **Ilot** | Block id (integer); **blank = same îlot as above** |
| **Adresse** | Voie line; **`"`** alone = **ditto** → same **Adresse** string as previous row (see below) |
| **N°** | House-number micro-notation; **`;`** primary list separator; **`->`** ranges |

## Ditto mark **`"`** (Adresse column)

A cell that contains **only** a **double-quote** ditto (sometimes lightly drawn) means: **reuse the exact Adresse line from the immediately preceding row** in linear reading order. The **îlot** for that row still comes from the **sticky îlot** column (usually blank, inheriting the current block). Do **not** treat **`"`** as a street name.

## **NEANT** rows (skip entirely)

When **Adresse** is **`NEANT`** (or clearly “nothing here” with the same intent), the clerk often places a **single slash `/`** in **N°** and may annotate a **span of îlot numbers** in prose (e.g. **`4121 à 4126`**). **Policy:** **do not** emit any `logical_records[]` element for that printed row and **do not** insert `source_entries` / `street_segments` for it — there is no address span to index. Downstream lookup is unaffected (no false positives).

Crossed-out or superseded lines elsewhere remain governed by **`docs/EXTRACTION.md`** (typically skip).

## `N°` notation (this scribe)

- **`a -> b`** — closed range (same semantics as bobine 8).
- **`n; m; p`** or **`n, m`** — finite lists; **`;` and `,` may both appear** in one cell; transcribe **verbatim** in `numeros_raw`.
- **Mixed** — e.g. `1 -> 17; 21; 23; 27`, `2; 6 -> 12; 16 -> 22`.
- **Line breaks inside N°** — one printed row / one logical row continuation; join for `numeros_raw` like bobine 8.
- **`bis`** — suffix on the numeral token (`124 bis`, `7 bis`, `3 -> 7 bis`).
- **Ambiguous ranges** (e.g. a run that looks like **`10 -> 2`**) — transcribe as read; validator may reject or flag **`low_confidence`** per **`docs/EXTRACTION.md`**.

## Other patterns to watch

- **Non-monotonic îlot order** — the same îlot id can **reappear** later on the page after other blocks; extract as written.
- **Abbreviations** in Adresse — `Pl`, `Av`, `St`, `Bd` / `Bol`, `Pte`, etc.; expansion is the LLM + **`docs/EXTRACTION.md`** rue pipeline, not a special column rule.
- **Long voie** — wraps **inside** Adresse; still one row unless N° spills with blank Adresse (stitching rules unchanged).

## Mapping to the domain model

Same as **`data/docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`** → **`docs/DOMAIN_MODEL.md`**: header → quartier + arrondissement; îlot → `ilots.number`; `(voie, N°)` → `street_segments` + `segment_ilots`; provenance → `source_entries`.

## Machine-readability

Raster handwriting + ditto marks + dense **`;`** lists benefit from the same strategy as bobine 8: vision-capable model, optional geometric cues, human QA on low-confidence rows.

## Source file reference

Scan in the repo: **`data/source-tables/Bobine 43 - 18ème - GRANDES-CARRIERES.pdf`**. Sample interchange output: **`data/extracted-tables/bobine43-extraction.json`**.
