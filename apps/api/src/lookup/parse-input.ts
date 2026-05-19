import { rankOfSuffix } from "../lib/suffix";

export type ParsedLookupInput = {
  n: number;
  n_rank: number;
  parity: "odd" | "even";
};

/** Parity from `n`; suffix maps to `n_rank` via the canonical rank table. */
export function parseLookupInput(
  n: number,
  suffix?: string
): ParsedLookupInput {
  return {
    n,
    n_rank: rankOfSuffix(suffix ?? ""),
    parity: n % 2 === 0 ? "even" : "odd",
  };
}
