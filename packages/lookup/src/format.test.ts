import { describe, expect, it } from "vitest";
import {
  formatLookupProvenance,
  formatLookupTriple,
  lookupProvenanceKey,
  lookupTripleKey,
} from "./format";

describe("lookupTripleKey", () => {
  it("joins arrondissement, quartier, and ilot", () => {
    expect(
      lookupTripleKey({
        arrondissement: 6,
        quartier: "Notre-Dame-des-Champs",
        ilot: 4121,
      })
    ).toBe("6-Notre-Dame-des-Champs-4121");
  });
});

describe("formatLookupTriple", () => {
  it("formats arrondissement ordinal, quartier, and ilot", () => {
    expect(
      formatLookupTriple({
        arrondissement: 6,
        quartier: "Notre-Dame-des-Champs",
        ilot: 4121,
      })
    ).toBe("6e — Notre-Dame-des-Champs — îlot 4121");
  });
});

describe("formatLookupProvenance", () => {
  it("includes bobine, page, sequence, and raw_text", () => {
    expect(
      formatLookupProvenance({
        bobine: 8,
        page: 2,
        sequence: 1,
        raw_text: "Ilot 4121 | rue de Test | 95",
      })
    ).toBe(
      "Bobine 8, page 2, seq 1: Ilot 4121 | rue de Test | 95"
    );
  });

  it("omits sequence when null", () => {
    expect(
      formatLookupProvenance({
        bobine: 8,
        page: 1,
        sequence: null,
        raw_text: "test",
      })
    ).toBe("Bobine 8, page 1: test");
  });
});

describe("lookupProvenanceKey", () => {
  it("matches assemble dedupe key shape", () => {
    const entry = {
      bobine: 8,
      page: 1,
      sequence: 0,
      raw_text: "test raw",
    };
    expect(lookupProvenanceKey(entry)).toBe("8-1-0-test raw");
  });
});
