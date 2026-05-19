import { describe, expect, it } from "vitest";
import {
  parseNumerosRaw,
  parityForToken,
} from "../src/loader/parse-numeros";
import { SKIP_REASON } from "../src/loader/types";

describe("parseNumerosRaw", () => {
  it("rejects empty numeros_raw", () => {
    const { tokens, rejects } = parseNumerosRaw("   ");
    expect(tokens).toEqual([]);
    expect(rejects).toContainEqual(
      expect.objectContaining({
        reason: SKIP_REASON.EMPTY_OR_UNPARSEABLE_NUMEROS_RAW,
      })
    );
  });

  it("parses a singleton", () => {
    const { tokens, rejects } = parseNumerosRaw("65");
    expect(rejects).toEqual([]);
    expect(tokens).toEqual([
      { kind: "singleton", n: 65, suffix: null, rank: 0 },
    ]);
  });

  it("parses a singleton with suffix", () => {
    const { tokens } = parseNumerosRaw("8bis");
    expect(tokens).toEqual([
      { kind: "singleton", n: 8, suffix: "bis", rank: 1 },
    ]);
  });

  it("parses a closed range with arrow", () => {
    const { tokens, rejects } = parseNumerosRaw("57 -> 63");
    expect(rejects).toEqual([]);
    expect(tokens).toHaveLength(1);
    const t = tokens[0]!;
    expect(t.kind).toBe("range");
    if (t.kind === "range") {
      expect(t.from).toEqual({ n: 57, suffix: null, rank: 0 });
      expect(t.to).toEqual({ n: 63, suffix: null, rank: 0 });
    }
  });

  it("normalizes hyphen ranges to arrow form", () => {
    const { tokens, rejects } = parseNumerosRaw("75 - 77");
    expect(rejects).toEqual([]);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.kind).toBe("range");
  });

  it("splits list separators (comma, semicolon, slash)", () => {
    const slash = parseNumerosRaw("10/12");
    expect(slash.tokens).toHaveLength(2);
    expect(slash.tokens.map((t) => (t.kind === "singleton" ? t.n : -1))).toEqual([
      10, 12,
    ]);

    const mixed = parseNumerosRaw("65, 57 -> 63");
    expect(mixed.tokens).toHaveLength(2);
    expect(mixed.rejects).toEqual([]);
  });

  it("rejects open-ended notation", () => {
    const plus = parseNumerosRaw("8+");
    expect(plus.tokens).toEqual([]);
    expect(plus.rejects[0]?.reason).toBe(SKIP_REASON.OPEN_ENDED_RANGE);

    const ellipsis = parseNumerosRaw("1...");
    expect(ellipsis.rejects[0]?.reason).toBe(SKIP_REASON.OPEN_ENDED_RANGE);
  });

  it("rejects inverted ranges", () => {
    const { tokens, rejects } = parseNumerosRaw("63 -> 57");
    expect(tokens).toEqual([]);
    expect(rejects[0]?.reason).toBe(SKIP_REASON.INVERTED_RANGE);
  });

  it("rejects ranges with mismatched endpoint parity", () => {
    const { tokens, rejects } = parseNumerosRaw("57 -> 64");
    expect(tokens).toEqual([]);
    expect(rejects[0]?.reason).toBe(SKIP_REASON.RANGE_ENDPOINT_PARITY_MISMATCH);
  });

  it("rejects glued unknown suffix text as unparseable (not in TOKEN_RE)", () => {
    const { tokens, rejects } = parseNumerosRaw("8octies");
    expect(tokens).toEqual([]);
    expect(rejects[0]?.reason).toBe(
      SKIP_REASON.EMPTY_OR_UNPARSEABLE_NUMEROS_RAW
    );
  });

  it("rejects unknown suffix when separated but not in the canonical table", () => {
    const { tokens, rejects } = parseNumerosRaw("42 foo");
    expect(tokens).toEqual([]);
    expect(rejects[0]?.reason).toBe(
      SKIP_REASON.EMPTY_OR_UNPARSEABLE_NUMEROS_RAW
    );
  });

  it("rejects unrecognized tokens", () => {
    const { tokens, rejects } = parseNumerosRaw("foo");
    expect(tokens).toEqual([]);
    expect(rejects[0]?.reason).toBe(
      SKIP_REASON.EMPTY_OR_UNPARSEABLE_NUMEROS_RAW
    );
  });
});

describe("parityForToken", () => {
  it("derives parity from singleton numbers", () => {
    const { tokens } = parseNumerosRaw("65");
    expect(parityForToken(tokens[0]!)).toBe("odd");
    const even = parseNumerosRaw("10");
    expect(parityForToken(even.tokens[0]!)).toBe("even");
  });

  it("derives parity from range start endpoint", () => {
    const { tokens } = parseNumerosRaw("57 -> 63");
    expect(parityForToken(tokens[0]!)).toBe("odd");
  });

  it("suffix does not change parity (8bis is even)", () => {
    const { tokens } = parseNumerosRaw("8bis");
    expect(parityForToken(tokens[0]!)).toBe("even");
  });
});
