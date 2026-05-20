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

export const SUGGEST_MIN_LENGTH = 2;
export const SUGGEST_MAX_RESULTS = 20;
