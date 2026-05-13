import { describe, expect, it } from "vitest";
import {
  expandNormalizedLibelleSuggestPrefixes,
  LIBELLE_LEADING_ARTICLE_CHAINS,
} from "../src/suggest/libelle_prefix_expand";

describe("expandNormalizedLibelleSuggestPrefixes", () => {
  it("includes the raw fragment plus article-prefixed variants", () => {
    const p = expandNormalizedLibelleSuggestPrefixes("vau");
    expect(p).toContain("vau");
    expect(p).toContain("de vau");
    expect(p).toContain("du vau");
    expect(p).toContain("de la vau");
  });

  it("does not double when the user already typed the same opener", () => {
    const p = expandNormalizedLibelleSuggestPrefixes("de vau");
    expect(p).toContain("de vau");
    expect(p).not.toContain("de de vau");
  });

  it("does not double du when the fragment already starts with du", () => {
    const p = expandNormalizedLibelleSuggestPrefixes("du lav");
    expect(p).toContain("du lav");
    expect(p).not.toContain("du du lav");
  });

  it("still prepends other openers when one opener is already present", () => {
    const p = expandNormalizedLibelleSuggestPrefixes("la forge");
    expect(p).toContain("la forge");
    expect(p).toContain("de la forge");
    expect(p).not.toContain("la la forge");
  });

  it("keeps LIBELLE_LEADING_ARTICLE_CHAINS sorted longest-first for skip logic", () => {
    const idxDeLa = LIBELLE_LEADING_ARTICLE_CHAINS.indexOf("de la");
    const idxDe = LIBELLE_LEADING_ARTICLE_CHAINS.indexOf("de");
    expect(idxDeLa).toBeGreaterThanOrEqual(0);
    expect(idxDe).toBeGreaterThanOrEqual(0);
    expect(idxDeLa).toBeLessThan(idxDe);
  });
});
