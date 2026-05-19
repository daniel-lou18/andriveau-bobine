export type ParsedLookupInput = {
  n: number;
  n_rank: 0;
  parity: "odd" | "even";
};

/** Slice 1: parity from `n`; suffix rank fixed at 0 until Slice 2. */
export function parseLookupInput(n: number): ParsedLookupInput {
  return {
    n,
    n_rank: 0,
    parity: n % 2 === 0 ? "even" : "odd",
  };
}
