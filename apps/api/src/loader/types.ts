export const SKIP_REASON = {
  OPEN_ENDED_RANGE: "OPEN_ENDED_RANGE",
  INVERTED_RANGE: "INVERTED_RANGE",
  RANGE_ENDPOINT_PARITY_MISMATCH: "RANGE_ENDPOINT_PARITY_MISMATCH",
  UNKNOWN_VOIE_TYPE: "UNKNOWN_VOIE_TYPE",
  UNKNOWN_SUFFIX: "UNKNOWN_SUFFIX",
  CROSS_QUARTIER_ILOT: "CROSS_QUARTIER_ILOT",
  EMPTY_OR_UNPARSEABLE_NUMEROS_RAW: "EMPTY_OR_UNPARSEABLE_NUMEROS_RAW",
  MISSING_ILOT_NUMBERS: "MISSING_ILOT_NUMBERS",
} as const;

export type SkipReason = keyof typeof SKIP_REASON;

export type LoaderReport = {
  bobine: number;
  inserted: {
    arrondissements: number;
    quartiers: number;
    ilots: number;
    rues: number;
    source_entries: number;
    street_segments: number;
    segment_ilots: number;
  };
  skipped: Array<{
    reading_order_index: number;
    reason: SkipReason;
    detail: string;
  }>;
};

export type ParsedEndpoint = {
  n: number;
  suffix: string | null;
  rank: number;
};

export type ParsedToken =
  | { kind: "singleton"; n: number; suffix: string | null; rank: number }
  | {
      kind: "range";
      from: ParsedEndpoint;
      to: ParsedEndpoint;
    };
