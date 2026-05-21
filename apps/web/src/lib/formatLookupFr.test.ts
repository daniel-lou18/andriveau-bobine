import type { LookupMatch, LookupProvenance } from "@andriveau-bobine/lookup";
import { describe, expect, it } from "vitest";
import {
  formatLookupIlotFr,
  formatLookupLocationFr,
  formatLookupProvenanceFr,
} from "./formatLookupFr";

describe("formatLookupFr", () => {
  it("formats arrondissement and quartier as secondary French location text", () => {
    const match: LookupMatch = {
      arrondissement: 6,
      quartier: "Notre-Dame-des-Champs",
      ilot: 4121,
    };

    expect(formatLookupLocationFr(match)).toBe(
      "6ᵉ arrondissement — Notre-Dame-des-Champs"
    );
  });

  it("formats îlot prominently in French", () => {
    const match: LookupMatch = {
      arrondissement: 6,
      quartier: "Notre-Dame-des-Champs",
      ilot: 4121,
    };

    expect(formatLookupIlotFr(match)).toBe("Îlot 4121");
  });

  it("formats provenance rows in French", () => {
    const entry: LookupProvenance = {
      bobine: 8,
      page: 2,
      sequence: 1,
      raw_text: "Ilot 4121 | rue de Test | 95",
    };

    expect(formatLookupProvenanceFr(entry)).toBe(
      "Bobine 8, page 2, seq. 1 : Ilot 4121 | rue de Test | 95"
    );
  });

  it("omits sequence when null in French provenance", () => {
    const entry: LookupProvenance = {
      bobine: 43,
      page: 12,
      sequence: null,
      raw_text: "Rue Example 10",
    };

    expect(formatLookupProvenanceFr(entry)).toBe(
      "Bobine 43, page 12 : Rue Example 10"
    );
  });
});
