export const VOIE_TYPES = [
  "Rue",
  "Avenue",
  "Boulevard",
  "Place",
  "Quai",
  "Cours",
  "Allée",
  "Impasse",
  "Passage",
  "Square",
  "Villa",
  "Cité",
  "Galerie",
  "Pont",
  "Esplanade",
] as const;

export type VoieType = (typeof VOIE_TYPES)[number];

const VOIE_TYPE_ALIASES: Record<string, VoieType> = {
  rue: "Rue",
  r: "Rue",
  av: "Avenue",
  avenue: "Avenue",
  bd: "Boulevard",
  bld: "Boulevard",
  boulevard: "Boulevard",
  pl: "Place",
  place: "Place",
  quai: "Quai",
  cours: "Cours",
  allee: "Allée",
  all: "Allée",
  impasse: "Impasse",
  passage: "Passage",
  square: "Square",
  villa: "Villa",
  cite: "Cité",
  galerie: "Galerie",
  pont: "Pont",
  esplanade: "Esplanade",
};

function normalizeTypeToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\u2019'`]/g, "")
    .trim();
}

/**
 * Parses a source token (possibly abbreviated) into a canonical voie type.
 * Returns null for unknown/unsupported values so extractor can skip+log.
 */
export function parseVoieTypeFromSource(token: string): VoieType | null {
  const normalized = normalizeTypeToken(token);
  return VOIE_TYPE_ALIASES[normalized] ?? null;
}
