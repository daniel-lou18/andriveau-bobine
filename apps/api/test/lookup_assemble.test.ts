import { describe, expect, it } from "vitest";
import {
  assembleLookupResult,
  type LookupRawRow,
} from "../src/lookup/assemble";

function row(
  overrides: Partial<LookupRawRow> & Pick<LookupRawRow, "ilot">
): LookupRawRow {
  return {
    arrondissement: 6,
    quartier: "Notre-Dame-des-Champs",
    sourceEntryId: 1,
    ...overrides,
  };
}

describe("assembleLookupResult", () => {
  it("returns empty matches and conflict false for no rows", () => {
    expect(assembleLookupResult([])).toEqual({
      matches: [],
      conflict: false,
    });
  });

  it("returns one match with conflict false for a single source and single ilot", () => {
    expect(assembleLookupResult([row({ ilot: 4121 })])).toEqual({
      matches: [
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4121,
        },
      ],
      conflict: false,
    });
  });

  it("returns multiple matches with conflict false when one source asserts multiple ilots", () => {
    expect(
      assembleLookupResult([
        row({ ilot: 4121 }),
        row({ ilot: 4122 }),
      ])
    ).toEqual({
      matches: [
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4121,
        },
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4122,
        },
      ],
      conflict: false,
    });
  });

  it("returns conflict true when two sources disagree on ilot", () => {
    expect(
      assembleLookupResult([
        row({ sourceEntryId: 1, ilot: 4121 }),
        row({ sourceEntryId: 2, ilot: 4999 }),
      ])
    ).toEqual({
      matches: [
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4121,
        },
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4999,
        },
      ],
      conflict: true,
    });
  });

  it("dedupes matching triples and still returns conflict true when two sources agree on ilot", () => {
    expect(
      assembleLookupResult([
        row({ sourceEntryId: 1, ilot: 4121 }),
        row({ sourceEntryId: 2, ilot: 4121 }),
      ])
    ).toEqual({
      matches: [
        {
          arrondissement: 6,
          quartier: "Notre-Dame-des-Champs",
          ilot: 4121,
        },
      ],
      conflict: true,
    });
  });
});
