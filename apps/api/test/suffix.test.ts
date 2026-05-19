import { describe, expect, it } from "vitest";
import {
  rankOfSuffix,
  SUFFIX_RANK,
  suffixOfRank,
} from "../src/lib/suffix";

describe("rankOfSuffix", () => {
  it.each([
    [null, 0],
    ["", 0],
    ["bis", 1],
    ["BIS", 1],
    ["ter", 2],
    ["septies", 6],
  ] as const)("maps %j → rank %i", (suffix, expected) => {
    expect(rankOfSuffix(suffix)).toBe(expected);
  });

  it("throws on unknown suffix tokens", () => {
    expect(() => rankOfSuffix("octies")).toThrow(/Unknown house-number suffix/);
  });

  it("covers every rank in SUFFIX_RANK", () => {
    for (const [token, rank] of Object.entries(SUFFIX_RANK)) {
      expect(rankOfSuffix(token === "" ? null : token)).toBe(rank);
    }
  });
});

describe("suffixOfRank", () => {
  it.each([
    [0, null],
    [1, "bis"],
    [2, "ter"],
    [6, "septies"],
  ] as const)("maps rank %i → %j", (rank, expected) => {
    expect(suffixOfRank(rank)).toBe(expected);
  });

  it("throws on unknown rank", () => {
    expect(() => suffixOfRank(99)).toThrow(/Unknown house-number rank/);
  });

  it("round-trips with rankOfSuffix for canonical tokens", () => {
    for (const token of ["bis", "ter", "quater"] as const) {
      expect(suffixOfRank(rankOfSuffix(token))).toBe(token);
    }
    expect(suffixOfRank(rankOfSuffix(null))).toBeNull();
  });
});
