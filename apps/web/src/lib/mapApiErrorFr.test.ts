import { LOOKUP_SUFFIX_TOKENS } from "@andriveau-bobine/lookup";
import { SUGGEST_MIN_LENGTH } from "@andriveau-bobine/suggest";
import { describe, expect, it } from "vitest";
import {
  API_ERROR_FR_BY_EN,
  GENERIC_API_ERROR_FR,
  mapApiErrorFr,
} from "./mapApiErrorFr";

const SUFFIX_ERROR_EN = `suffix must be one of: ${LOOKUP_SUFFIX_TOKENS.join(", ")} (or omitted for no suffix)`;

describe("mapApiErrorFr", () => {
  it("maps every known exact API error string", () => {
    for (const [en, fr] of Object.entries(API_ERROR_FR_BY_EN)) {
      expect(mapApiErrorFr(en)).toBe(fr);
    }
  });

  it("maps suggest min-length validation", () => {
    expect(
      mapApiErrorFr(
        `Query must contain at least ${SUGGEST_MIN_LENGTH} characters after normalization.`
      )
    ).toBe(
      `Saisissez au moins ${SUGGEST_MIN_LENGTH} caractères après normalisation.`
    );
  });

  it("maps lookup suffix validation", () => {
    expect(mapApiErrorFr(SUFFIX_ERROR_EN)).toBe(API_ERROR_FR_BY_EN[SUFFIX_ERROR_EN]);
  });

  it("maps rue not found", () => {
    expect(mapApiErrorFr("rue not found", 404)).toBe("Rue introuvable.");
  });

  it("maps HTTP status fallbacks", () => {
    expect(mapApiErrorFr("HTTP 500", 500)).toBe(
      "Erreur serveur. Veuillez réessayer plus tard."
    );
    expect(mapApiErrorFr("HTTP 404", 404)).toBe("Ressource introuvable.");
  });

  it("uses status when message is unknown", () => {
    expect(mapApiErrorFr("Server error", 500)).toBe(
      "Erreur serveur. Veuillez réessayer plus tard."
    );
  });

  it("returns generic French for unknown errors", () => {
    expect(mapApiErrorFr("something unexpected")).toBe(GENERIC_API_ERROR_FR);
  });
});
