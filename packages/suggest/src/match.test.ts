import { describe, expect, it } from "vitest";
import {
  buildSuggestLikePatterns,
  buildSuggestMatchSpec,
  escapeLikeFragment,
} from "./match";

describe("escapeLikeFragment", () => {
  it("escapes LIKE metacharacters", () => {
    expect(escapeLikeFragment("de%25")).toBe("de\\%25");
    expect(escapeLikeFragment("a_b\\c")).toBe("a\\_b\\\\c");
  });
});

describe("buildSuggestMatchSpec", () => {
  it("includes article-expanded libellé prefixes and the full-key prefix", () => {
    const spec = buildSuggestMatchSpec("vau");
    expect(spec.fullKeyPrefix).toBe("vau");
    expect(spec.libellePrefixes).toContain("vau");
    expect(spec.libellePrefixes).toContain("de vau");
  });

  it("uses the normalized query as the full-key prefix when type-leading", () => {
    const spec = buildSuggestMatchSpec("rue de rennes");
    expect(spec.fullKeyPrefix).toBe("rue de rennes");
  });
});

describe("buildSuggestLikePatterns", () => {
  it("builds prefix-anchored LIKE patterns for each libellé branch and the full voie key", () => {
    const patterns = buildSuggestLikePatterns(buildSuggestMatchSpec("vau"));

    expect(patterns.libellePatterns).toContain("vau%");
    expect(patterns.libellePatterns).toContain("de vau%");
    expect(patterns.fullKeyPattern).toBe("vau%");
  });

  it("escapes metacharacters in bound patterns", () => {
    const patterns = buildSuggestLikePatterns(buildSuggestMatchSpec("de%25"));

    expect(patterns.libellePatterns).toContain("de\\%25%");
    expect(patterns.fullKeyPattern).toBe("de\\%25%");
  });

  it("produces one LIKE pattern per expanded libellé prefix", () => {
    const spec = buildSuggestMatchSpec("vau");
    const patterns = buildSuggestLikePatterns(spec);
    expect(patterns.libellePatterns).toHaveLength(spec.libellePrefixes.length);
  });
});
