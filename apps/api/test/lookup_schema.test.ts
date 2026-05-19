import { describe, expect, it } from "vitest";
import { lookupParamsSchema, lookupQuerySchema } from "../src/lookup/schema";

describe("lookupParamsSchema", () => {
  it("accepts a positive integer rueId", () => {
    const result = lookupParamsSchema.safeParse({ rueId: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rueId).toBe(42);
    }
  });

  it("rejects a non-numeric rueId", () => {
    const result = lookupParamsSchema.safeParse({ rueId: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive rueId", () => {
    expect(lookupParamsSchema.safeParse({ rueId: "0" }).success).toBe(false);
    expect(lookupParamsSchema.safeParse({ rueId: "-1" }).success).toBe(false);
  });
});

describe("lookupQuerySchema", () => {
  it("accepts a positive integer n", () => {
    const result = lookupQuerySchema.safeParse({ n: "95" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.n).toBe(95);
    }
  });

  it("rejects missing n", () => {
    expect(lookupQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-positive n", () => {
    expect(lookupQuerySchema.safeParse({ n: "0" }).success).toBe(false);
    expect(lookupQuerySchema.safeParse({ n: "-3" }).success).toBe(false);
  });
});
