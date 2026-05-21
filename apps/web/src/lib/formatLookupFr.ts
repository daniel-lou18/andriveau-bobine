import type { LookupMatch, LookupProvenance } from "@andriveau-bobine/lookup";

/** French secondary line: ordinal arrondissement + quartier name. */
export function formatLookupLocationFr(
  match: Pick<LookupMatch, "arrondissement" | "quartier">
): string {
  return `${match.arrondissement}ᵉ arrondissement — ${match.quartier}`;
}

/** French primary îlot label for match cards. */
export function formatLookupIlotFr(match: Pick<LookupMatch, "ilot">): string {
  return `Îlot ${match.ilot}`;
}

/** French display label for one provenance row. */
export function formatLookupProvenanceFr(entry: LookupProvenance): string {
  const seq =
    entry.sequence !== null ? `, seq. ${entry.sequence}` : "";
  return `Bobine ${entry.bobine}, page ${entry.page}${seq} : ${entry.raw_text}`;
}
