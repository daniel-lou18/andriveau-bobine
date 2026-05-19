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

/** Non-empty suffix tokens accepted on `GET …/lookup?suffix=…`. */
export const LOOKUP_SUFFIX_TOKENS = [
  "bis",
  "ter",
  "quater",
  "quinquies",
  "sexies",
  "septies",
] as const;

export type LookupSuffixToken = (typeof LOOKUP_SUFFIX_TOKENS)[number];

/** Client-side mirror of lookup query params (not wire JSON). */
export type LookupRequest = {
  rueId: number;
  n: number;
  suffix?: LookupSuffixToken;
  provenance?: boolean;
};

/** Opt-in provenance row (`?provenance=1`). */
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
  /** Present only when `?provenance=1`; deduped per match. */
  provenance?: LookupProvenance[];
};

/** Successful lookup response (always a list, never a scalar). */
export type LookupResponse = {
  matches: LookupMatch[];
  conflict: boolean;
};
