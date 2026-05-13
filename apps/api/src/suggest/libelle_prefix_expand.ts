/**
 * Optional leading token chains on Paris voie libellés after {@link normalizeName}
 * (lowercase, accents stripped, apostrophe/hyphen → space).
 *
 * When the user omits these (e.g. types `vau` for `de Vaugirard` → stored
 * `de vaugirard`), suggest still prefix-matches by OR-ing equivalent prefixes:
 * `vau%`, `de vau%`, `du vau%`, …
 *
 * **Source of truth:** curated list maintained with the product (DOMAIN_MODEL
 * examples + common French patterns + spot-checks against
 * `data/extracted-tables/*.json`). It is *not* loaded from JSON at runtime —
 * extend this array deliberately when new openers appear in extraction.
 *
 * **Order:** longest chains first so `fragment.startsWith(art + " ")` skips
 * redundant `art + " " + fragment` (e.g. avoid `de de vau`).
 */
export const LIBELLE_LEADING_ARTICLE_CHAINS: readonly string[] = [
  "de la",
  "de l",
  "de le",
  "chemin du",
  "chemin de",
  "place du",
  "place des",
  "cours du",
  "cours de",
  "des",
  "du",
  "de",
  "aux",
  "au",
  "la",
  "le",
  "les",
  "l",
  "a la",
  "a l",
  "d",
];

/**
 * Builds distinct normalized prefixes to try against `rues.libelle_normalized`
 * (each used as `LIKE prefix || '%'` elsewhere).
 *
 * Always includes `normalizedFragment`. For each known leading chain `art`,
 * adds `art + " " + normalizedFragment` unless the user fragment already
 * starts with that opener (so `de vau` does not become `de de vau`).
 */
export function expandNormalizedLibelleSuggestPrefixes(
  normalizedFragment: string
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (p: string) => {
    if (seen.has(p)) return;
    seen.add(p);
    out.push(p);
  };

  push(normalizedFragment);

  for (const art of LIBELLE_LEADING_ARTICLE_CHAINS) {
    if (
      normalizedFragment === art ||
      normalizedFragment.startsWith(`${art} `)
    ) {
      continue;
    }
    push(`${art} ${normalizedFragment}`);
  }

  return out;
}
