/**
 * Shared suggest contract (ADR-0002): response shape, limits,
 * and client handoff types used before number-bearing lookup.
 */

export const SUGGEST_MIN_LENGTH = 2;
export const SUGGEST_MAX_RESULTS = 20;

/** One row from `GET /api/rues/suggest`. */
export type RueSuggestion = {
  rue_id: number;
  type: string;
  libelle: string;
};

/** Client-side choice after the user picks a suggestion (opaque `rue_id` for lookup). */
export type ResolvedRue = {
  rueId: number;
  display: string;
};

export function formatSuggestionLabel(s: RueSuggestion): string {
  return `${s.type} ${s.libelle}`;
}

export function toResolvedRue(s: RueSuggestion): ResolvedRue {
  return {
    rueId: s.rue_id,
    display: formatSuggestionLabel(s),
  };
}
