import type { SuffixToken } from "@andriveau-bobine/lookup";

export const SUFFIX_RANK = {
  "": 0,
  bis: 1,
  ter: 2,
  quater: 3,
  quinquies: 4,
  sexies: 5,
  septies: 6,
} as const satisfies Record<SuffixToken, number>;

export function rankOfSuffix(suffix: string | null | undefined): number {
  const key = (suffix ?? "").trim().toLowerCase() as SuffixToken;
  if (!(key in SUFFIX_RANK)) {
    throw new Error(`Unknown house-number suffix: ${JSON.stringify(suffix)}`);
  }
  return SUFFIX_RANK[key];
}

export function suffixOfRank(rank: number): string | null {
  for (const [key, value] of Object.entries(SUFFIX_RANK)) {
    if (value === rank) {
      return key === "" ? null : key;
    }
  }
  throw new Error(`Unknown house-number rank: ${rank}`);
}
