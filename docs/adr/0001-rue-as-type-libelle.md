# Store rues as `(type, libellé)`, not as a single name

Paris voies inherently decompose into a `type` (`Rue`, `Avenue`, `Boulevard`, …) and a `libellé` (`de Vaugirard`, `du Cherche-Midi`). Source notations in the bobines confirm this — types are always present, sometimes abbreviated (`Bd`, `av.`), and the libellé carries the disambiguating semantics. Homonyms across types exist (`Rue de Vaugirard` vs `Boulevard de Vaugirard`; `Rue Saint-Honoré` vs `Rue du Faubourg-Saint-Honoré`-style clusters), so the unique key must include the type. Storing the two parts as separate columns (`type` enum + `libelle` + `libelle_normalized`, unique on `(type, libelle_normalized)`) gives us: (a) faithful disambiguation, (b) cheap libellé-only autocomplete as the primary search UX, (c) one place — the extractor — where abbreviation expansion happens, and (d) a clean two-stage pipeline of canonicalization → normalization. The display string is computed at the API serialization layer; no `name` column is stored.

## Considered Options

- **Single `name` + `name_normalized` column** (the original schema). Rejected: doesn't model the type/libellé distinction the source actually carries; libellé-only autocomplete becomes a substring hack on `name_normalized`; abbreviation expansion has to be encoded inside the normalization function.
- **Both: split columns plus a denormalized `name`.** Rejected: redundant; risk of drift; no read pattern needs an indexed `name`.
- **FK to a `voie_types` lookup table.** Rejected for now: the type set is small (~15) and stable; an inline `CHECK` enum matching the existing `parity` precedent is simpler. Revisit only if per-type metadata is needed.
