/**
 * Shared suggest contract and matching (ADR-0002).
 */

export {
  buildSuggestLikePatterns,
  buildSuggestMatchSpec,
  escapeLikeFragment,
  type SuggestLikePatterns,
  type SuggestMatchSpec,
} from "./match";
export {
  expandNormalizedLibelleSuggestPrefixes,
  LIBELLE_LEADING_ARTICLE_CHAINS,
} from "./libelle-prefix-expand";
export { formatSuggestionLabel, toResolvedRue } from "./handoff";
export {
  SUGGEST_MAX_RESULTS,
  SUGGEST_MIN_LENGTH,
  type ResolvedRue,
  type RueSuggestion,
} from "./types";
