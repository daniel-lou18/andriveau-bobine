import type { LookupMatch, LookupProvenance } from "./types";

/** Stable React list key for an administrative triple. */
export function lookupTripleKey(
  match: Pick<LookupMatch, "arrondissement" | "quartier" | "ilot">
): string {
  return `${match.arrondissement}-${match.quartier}-${match.ilot}`;
}

/** Stable key for a provenance row. */
export function lookupProvenanceKey(entry: LookupProvenance): string {
  return `${entry.bobine}-${entry.page}-${entry.sequence}-${entry.raw_text}`;
}

/** Display label for one lookup match (arrondissement ordinal + quartier + îlot). */
export function formatLookupTriple(match: LookupMatch): string {
  return `${match.arrondissement}e — ${match.quartier} — îlot ${match.ilot}`;
}

/** Display label for one provenance row. */
export function formatLookupProvenance(entry: LookupProvenance): string {
  const seq =
    entry.sequence !== null ? `, seq ${entry.sequence}` : "";
  return `Bobine ${entry.bobine}, page ${entry.page}${seq}: ${entry.raw_text}`;
}
