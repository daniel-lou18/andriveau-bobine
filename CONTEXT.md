# Andriveau-Bobine

Address-based lookup over historical Paris registers ("bobines"). Given a street name and house number, return the administrative location at the time the register was compiled (`arrondissement`, `quartier`, `ilot`).

## Language

### Source provenance

**Bobine**:
An archival reel of scanned register pages from the Paris archives. Each bobine covers a specific area of the city.
_Avoid_: reel, microfilm.

**Page**:
A page within a bobine. Carries the `quartier` and `arrondissement` as page-level metadata in the source.
_Avoid_: sheet, scan.

**Source entry**:
One notation line on a bobine page. The literal text is preserved verbatim in `source_entries.raw_text` for audit; one source entry can produce multiple `street_segments`.
_Avoid_: row, record, line.

### Administrative hierarchy

**Arrondissement**:
Top-level Paris administrative division. Stable across the period covered by the bobines.

**Quartier**:
Subdivision of an arrondissement. Page-level metadata in the bobines (the page header names the quartier).

**Îlot**:
Numbered block inside a quartier. **Row-level data** in the bobines: each source entry names its îlot directly. Not derived from anything else.
_Avoid_: block, parcel.

### Address mapping

**Rue**:
A canonical Paris voie. Decomposed into `type` and `libellé` (see below). The table is named `rues` for source fidelity, but it represents **any voie**, regardless of `type`.
_Avoid_: street, voie (as a column or table name; only used informally).

**Type** (of voie):
The canonical first-token classifier of a rue: one of a fixed enum (`Rue`, `Avenue`, `Boulevard`, `Place`, `Quai`, `Cours`, `Allée`, `Impasse`, `Passage`, `Square`, `Villa`, `Cité`, `Galerie`, `Pont`, `Esplanade`). Stored canonical; abbreviation expansion (`Bd → Boulevard`, `av. → Avenue`) happens once in the extractor.
_Avoid_: kind, category, prefix.

**Libellé**:
The remainder of the rue name after the `type` is removed, in canonical display form. Examples: `de Vaugirard`, `du Cherche-Midi`, `Notre-Dame-des-Champs`, `d'Assas`. Hyphens and apostrophes preserved for display; abbreviations inside the libellé (`St → Saint`, `Ste → Sainte`) are expanded by the extractor.
_Avoid_: name (ambiguous), street name.

**Normalized form**:
The match-time projection of a name. Aggressive rule: lowercase, strip accents (NFD + combining-mark removal), replace `'` and `-` with space, collapse whitespace. Used for both `rues.libelle_normalized` and `quartiers.name_normalized`. Computed by a single shared function; the same rule applies everywhere.
_Avoid_: slug, key.

**Street segment**:
A `(rue, parity, ordered range)` unit. Multiple segments of the same `rue` map to different ilots over different number ranges. Singletons are represented by equal endpoints.

**Parity**:
Strictly `odd` or `even`. Range endpoints share parity; singletons inherit from the number. Never `both`.

**Suffix**:
Ordered sub-position on the house-number axis: none `0`, `bis 1`, `ter 2`, `quater 3`, `quinquies 4`. Single source of truth in `apps/api/src/lib/suffix.ts`.

## Relationships

- An **Arrondissement** has many **Quartiers**.
- A **Quartier** has many **Îlots**.
- A **Rue** is composed of a **Type** + a **Libellé**, and is uniquely identified by `(type, libellé_normalized)`.
- A **Source entry** can produce many **Street segments** (one per `(rue, parity, range)` produced by that line).
- A **Street segment** can map to several **Îlots** within the same quartier.
- A **Bobine page** carries the **Quartier** as header metadata; each row carries an **Îlot**, a **Rue**, and one or more number ranges.

## Example dialogue

> **Dev:** "If I see `Bd Raspail 95` on a page, what gets written?"
> **Domain expert:** "One **Source entry** with the literal text `Bd Raspail 95`. The extractor parses it: **Type** = `Boulevard`, **Libellé** = `Raspail`, **Libellé_normalized** = `raspail`. We look up or create a **Rue** with `(type='Boulevard', libellé_normalized='raspail')`. Then a **Street segment** with `from=to=95`, `parity='odd'`. The page header tells us this is in the **Quartier** `Notre-Dame-des-Champs`, **Arrondissement** 6. The row's **Îlot** column gives us which **Îlot** to link via `segment_ilots`."
>
> **Dev:** "What if the same page later has `Boulevard Raspail 97`?"
> **Domain expert:** "Same **Rue**, because `(Boulevard, raspail)` is the unique key. New **Source entry** (different `raw_text`), new **Street segment**."

## Flagged ambiguities

- **"Rue" is overloaded.** It means both (a) the table name for all voies, regardless of type, and (b) one specific `type` value. Resolution: the table `rues` covers all voies; the column `type` carries the kind. When a domain expert says "rue", treat it as (a) unless context narrows it.
- **"Adresse" in the source.** The bobine's `ADRESSE` column header refers to the rue name only, not the full address. Number ranges live in the `N°` column. We've split this into `rues` + `street_segments` and never use "adresse" as a domain term.
- **"Faubourg" is not a type.** It's part of the libellé (e.g., `Rue du Faubourg-Saint-Honoré` has `type='Rue'`, `libellé='du Faubourg-Saint-Honoré'`). Same for `Petite`, `Grande`, `Vieux`, `Abbé`, `Père`.
