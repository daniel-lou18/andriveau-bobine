import {
  buildSuggestLikePatterns,
  buildSuggestMatchSpec,
  type RueSuggestion,
} from "@andriveau-bobine/suggest";
import type { Database } from "../db";
import { displayVoieType } from "../lib/voie_type_display";
import { querySuggestRues } from "./query";

export { suggestQuerySchema } from "./schema";
export type { SuggestQuery } from "./schema";

/**
 * Read-only suggest for rues by libellé prefix.
 *
 * Expects `normalizedQuery` already normalized with the same rule as
 * `rues.libelle_normalized` (see `docs/DOMAIN_MODEL.md` -> Normalized form).
 * Callers at the HTTP seam validate and normalize via `suggestQuerySchema`.
 *
 * Prefix-matches the normalized column. Common leading French articles
 * (`de`, `du`, …) omitted by the user are handled by OR-ing equivalent
 * prefixes (see `@andriveau-bobine/suggest` libelle-prefix-expand).
 *
 * When the query includes the voie **type** token (canonical `code`, e.g.
 * `rue`, `boulevard`, `petite rue`) before the libellé, it also matches the
 * concatenated key `code || ' ' || libelle_normalized` so inputs like
 * `rue de rennes` or `rue de la` behave as users expect.
 *
 * Caps results at 20, ordered alphabetically by libellé with a stable
 * tie-break on `rue_id`. Display rule for `type` lives in `displayVoieType`.
 */
export async function suggestRues(
  db: Database,
  normalizedQuery: string
): Promise<RueSuggestion[]> {
  const spec = buildSuggestMatchSpec(normalizedQuery);
  const patterns = buildSuggestLikePatterns(spec);
  const rows = await querySuggestRues(db, patterns);

  return rows.map((r) => ({
    rue_id: r.rue_id,
    type: displayVoieType(r.type_code),
    libelle: r.libelle,
  }));
}
