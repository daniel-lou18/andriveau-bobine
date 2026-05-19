import { describe, expect, it } from "vitest";
import { normalizeName } from "../src/lib/normalize";

/**
 * Examples from `docs/DOMAIN_MODEL.md` → Normalized form.
 * Single source of truth: `apps/api/src/lib/normalize.ts`.
 */
describe("normalizeName", () => {
  it.each([
    ["de Vaugirard", "de vaugirard"],
    ["du Cherche-Midi", "du cherche midi"],
    ["d'Assas", "d assas"],
    ["Notre-Dame-des-Champs", "notre dame des champs"],
  ])("maps %j → %j (DOMAIN_MODEL)", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it("strips accents (NFD + combining marks)", () => {
    expect(normalizeName("Cité")).toBe("cite");
    expect(normalizeName("Nôtre")).toBe("notre");
    expect(normalizeName("École")).toBe("ecole");
  });

  it("treats curly apostrophe like straight apostrophe", () => {
    expect(normalizeName("d\u2019Assas")).toBe("d assas");
  });

  it("lowercases and trims", () => {
    expect(normalizeName("  RUE DE RENNES  ")).toBe("rue de rennes");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeName("rue   de    rennes")).toBe("rue de rennes");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});
