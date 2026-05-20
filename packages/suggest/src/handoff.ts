import type { ResolvedRue, RueSuggestion } from "./types";

export function formatSuggestionLabel(s: RueSuggestion): string {
  return `${s.type} ${s.libelle}`;
}

export function toResolvedRue(s: RueSuggestion): ResolvedRue {
  return {
    rueId: s.rue_id,
    display: formatSuggestionLabel(s),
  };
}
