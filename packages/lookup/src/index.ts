/**
 * Shared lookup contract (ADR-0002, ADR-0003): request/response types for
 * `GET /api/rues/:rueId/lookup`.
 */

/** Canonical suffix tokens on the house-number axis (rank 0–6). */
export type SuffixToken =
  | ""
  | "bis"
  | "ter"
  | "quater"
  | "quinquies"
  | "sexies"
  | "septies";

/** Opt-in provenance row (`?provenance=1`; Slice 4). */
export type LookupProvenance = {
  bobine: number;
  page: number;
  sequence: number | null;
  raw_text: string;
};

/** One administrative triple returned by lookup. */
export type LookupMatch = {
  arrondissement: number;
  quartier: string;
  ilot: number;
  provenance?: LookupProvenance;
};

/** Successful lookup response (always a list, never a scalar). */
export type LookupResponse = {
  matches: LookupMatch[];
  conflict: boolean;
};
