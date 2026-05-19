import { describe, expect, it } from "vitest";
import { displayVoieType } from "../src/lib/voie_type_display";

/**
 * v1 display rule for canonical `voie_types.code` (see module JSDoc).
 * When DOMAIN_MODEL Q13 lands, update expectations here only.
 */
describe("displayVoieType", () => {
  it.each([
    ["rue", "Rue"],
    ["boulevard", "Boulevard"],
    ["petite rue", "Petite Rue"],
    ["cite", "Cite"],
    ["cité", "Cité"],
    ["grand boulevard", "Grand Boulevard"],
  ])("title-cases %j → %j", (code, expected) => {
    expect(displayVoieType(code)).toBe(expected);
  });

  it("collapses extra whitespace between tokens", () => {
    expect(displayVoieType("petite  rue")).toBe("Petite Rue");
  });

  it("returns empty string for empty input", () => {
    expect(displayVoieType("")).toBe("");
  });
});
