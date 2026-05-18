import { describe, expect, it } from "vitest";
import { SUGGEST_MIN_LENGTH } from "@andriveau-bobine/disambiguation";
import { suggestQuerySchema } from "../src/suggest/schema";

describe("suggestQuerySchema", () => {
  it("rejects queries shorter than the shared minimum after normalization", () => {
    const result = suggestQuerySchema.safeParse({ q: "a" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(String(SUGGEST_MIN_LENGTH));
    }
  });

  it("accepts queries at or above the minimum and returns the normalized form", () => {
    const result = suggestQuerySchema.safeParse({ q: "Du Cher" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ q: "du cher" });
    }
  });

  it("treats a missing q as empty and rejects after normalization", () => {
    const result = suggestQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
