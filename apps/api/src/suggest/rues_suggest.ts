import { asc, eq, or, sql } from "drizzle-orm";
import type { Database } from "../db";
import { rues, voieTypes } from "../db/schema";
import { normalizeName } from "../lib/normalize";
import { displayVoieType } from "../lib/voie_type_display";
import { expandNormalizedLibelleSuggestPrefixes } from "./libelle_prefix_expand";

/**
 * SQLite `LIKE` treats `%`, `_` and the escape character as wildcards.
 * We anchor at the start of `libelle_normalized` via the `<prefix>%` shape,
 * so any `%` or `_` inside the user's fragment must be escaped to a literal.
 * We use `\` as escape and pass `ESCAPE '\\'` in the SQL.
 */
function escapeLikeFragment(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export const SUGGEST_MIN_LENGTH = 2;
export const SUGGEST_MAX_RESULTS = 20;

export type RueSuggestion = {
  rue_id: number;
  type: string;
  libelle: string;
};

export type SuggestRuesResult =
  | { status: 200; body: { results: RueSuggestion[] } }
  | { status: 400; body: { error: string } };

/**
 * Read-only suggest for rues by libellé prefix.
 *
 * Normalizes the user fragment with the same rule as `rues.libelle_normalized`
 * (see `docs/DOMAIN_MODEL.md` -> Normalized form), enforces a minimum length
 * of {@link SUGGEST_MIN_LENGTH}, and prefix-matches the normalized column.
 * Common leading French articles (`de`, `du`, …) omitted by the user are
 * handled by OR-ing equivalent prefixes (see `libelle_prefix_expand.ts`).
 *
 * When the query includes the voie **type** token (canonical `code`, e.g.
 * `rue`, `boulevard`, `petite rue`) before the libellé, it also matches the
 * concatenated key `code || ' ' || libelle_normalized` so inputs like
 * `rue de rennes` or `rue de la` behave as users expect.
 *
 * Caps results at {@link SUGGEST_MAX_RESULTS}, ordered alphabetically by
 * libellé with a stable tie-break on `rue_id`.
 *
 * Display rule for `type` lives in `displayVoieType` (separate module).
 */
export async function suggestRues(
  db: Database,
  rawQuery: string
): Promise<SuggestRuesResult> {
  const q = normalizeName(rawQuery ?? "");
  if (q.length < SUGGEST_MIN_LENGTH) {
    return {
      status: 400,
      body: {
        error: `Query must contain at least ${SUGGEST_MIN_LENGTH} characters after normalization.`,
      },
    };
  }

  const prefixes = expandNormalizedLibelleSuggestPrefixes(q);
  const libelleLikeClauses = prefixes.map((prefix) => {
    const pattern = `${escapeLikeFragment(prefix)}%`;
    return sql`${rues.libelleNormalized} LIKE ${pattern} ESCAPE '\\'`;
  });

  /** Same shape as stored matching: canonical `voie_types.code` + space + `libelle_normalized`. */
  const fullKeyPattern = `${escapeLikeFragment(q)}%`;
  const fullKeyClause = sql`(${voieTypes.code} || ' ' || ${rues.libelleNormalized}) LIKE ${fullKeyPattern} ESCAPE '\\'`;

  const whereCombined = or(...libelleLikeClauses, fullKeyClause);

  const rows = await db
    .select({
      rue_id: rues.id,
      type_code: voieTypes.code,
      libelle: rues.libelle,
    })
    .from(rues)
    .innerJoin(voieTypes, eq(voieTypes.id, rues.typeId))
    .where(whereCombined)
    .orderBy(asc(rues.libelle), asc(rues.id))
    .limit(SUGGEST_MAX_RESULTS);

  const results: RueSuggestion[] = rows.map((r) => ({
    rue_id: r.rue_id,
    type: displayVoieType(r.type_code),
    libelle: r.libelle,
  }));
  return { status: 200, body: { results } };
}
