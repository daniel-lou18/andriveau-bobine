import { normalizeName } from "./normalize";
import { parseVoieTypeFromSource, type VoieType } from "./voie-type";

export type CanonicalRue = {
  type: VoieType;
  libelle: string;
  libelleNormalized: string;
};

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function expandLibelleAbbreviations(libelle: string): string {
  return (
    libelle
      // St / Ste are common in source notations.
      .replace(/\bSt\.?\b/gi, "Saint")
      .replace(/\bSte\.?\b/gi, "Sainte")
  );
}

/**
 * Canonicalizes one source ADRESSE value into rue columns.
 * Returns null when no known voie type can be parsed.
 */
export function canonicalizeRueFromSource(rawAddress: string): CanonicalRue | null {
  const input = normalizeSpaces(rawAddress);
  if (!input) return null;

  const [rawTypeToken, ...restTokens] = input.split(" ");
  if (!rawTypeToken) return null;
  const voieType = parseVoieTypeFromSource(rawTypeToken);
  if (!voieType) return null;

  const rawLibelle = normalizeSpaces(restTokens.join(" "));
  if (!rawLibelle) return null;

  const libelle = normalizeSpaces(expandLibelleAbbreviations(rawLibelle));
  const libelleNormalized = normalizeName(libelle);

  return {
    type: voieType,
    libelle,
    libelleNormalized,
  };
}
