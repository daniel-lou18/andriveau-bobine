import { describe, expect, it } from "vitest";
import { buildSuggestMatchSpec, escapeLikeFragment } from "../src/suggest/match";

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
