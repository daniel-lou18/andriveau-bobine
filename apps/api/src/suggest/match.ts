import { expandNormalizedLibelleSuggestPrefixes } from "./libelle_prefix_expand";

/**
 * SQLite `LIKE` treats `%`, `_` and the escape character as wildcards.
 * We anchor at the start via the `<prefix>%` shape, so any `%` or `_` inside
 * the user's fragment must be escaped to a literal. We use `\` as escape and
 * pass `ESCAPE '\\'` in the SQL.
 */
export function escapeLikeFragment(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Pure match inputs derived from a normalized query (no SQL). */
export type SuggestMatchSpec = {
  libellePrefixes: string[];
  fullKeyPrefix: string;
};

/**
 * Escaped, prefix-anchored `LIKE` patterns ready to bind in SQL (`pattern` with
 * `ESCAPE '\\'`). Built from {@link SuggestMatchSpec} — no Drizzle types here.
 */
export type SuggestLikePatterns = {
  libellePatterns: string[];
  fullKeyPattern: string;
};

function prefixLikePattern(normalizedPrefix: string): string {
  return `${escapeLikeFragment(normalizedPrefix)}%`;
}

export function buildSuggestMatchSpec(normalizedQuery: string): SuggestMatchSpec {
  return {
    libellePrefixes: expandNormalizedLibelleSuggestPrefixes(normalizedQuery),
    fullKeyPrefix: normalizedQuery,
  };
}

export function buildSuggestLikePatterns(
  spec: SuggestMatchSpec
): SuggestLikePatterns {
  return {
    libellePatterns: spec.libellePrefixes.map(prefixLikePattern),
    fullKeyPattern: prefixLikePattern(spec.fullKeyPrefix),
  };
}
