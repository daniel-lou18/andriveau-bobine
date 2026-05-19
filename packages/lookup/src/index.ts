/**
 * Shared lookup contract and domain projection (ADR-0002, ADR-0003).
 */

export {
  assembleLookupResult,
  type AssembleLookupOptions,
  type LookupRawRow,
} from "./assemble";
export {
  formatLookupProvenance,
  formatLookupTriple,
  lookupProvenanceKey,
  lookupTripleKey,
} from "./format";
export { parseLookupInput, type ParsedLookupInput } from "./parse-input";
export { rankOfSuffix, suffixOfRank, SUFFIX_RANK } from "./suffix-rank";
export {
  LOOKUP_SUFFIX_TOKENS,
  type LookupMatch,
  type LookupProvenance,
  type LookupRequest,
  type LookupResponse,
  type LookupSuffixToken,
  type SuffixToken,
} from "./types";
