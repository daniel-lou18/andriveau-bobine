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

  it("accepts canonical suffix tokens", () => {
    for (const suffix of ["bis", "ter", "quater", "quinquies", "sexies", "septies"]) {
      const result = lookupQuerySchema.safeParse({ n: "8", suffix });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suffix).toBe(suffix);
      }
    }
  });

  it("accepts omitted or empty suffix as undefined", () => {
    const omitted = lookupQuerySchema.safeParse({ n: "8" });
    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.suffix).toBeUndefined();
    }

    const empty = lookupQuerySchema.safeParse({ n: "8", suffix: "" });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.suffix).toBeUndefined();
    }
  });

  it("rejects unknown suffix tokens with a message naming allowed values", () => {
    for (const suffix of ["octies", "foo", "1"]) {
      const result = lookupQuerySchema.safeParse({ n: "8", suffix });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/suffix must be one of:/);
      }
    }
  });

  it("parses provenance=1 as true and provenance=0 as false", () => {
    const on = lookupQuerySchema.safeParse({ n: "95", provenance: "1" });
    expect(on.success).toBe(true);
    if (on.success) {
      expect(on.data.provenance).toBe(true);
    }

    const off = lookupQuerySchema.safeParse({ n: "95", provenance: "0" });
    expect(off.success).toBe(true);
    if (off.success) {
      expect(off.data.provenance).toBe(false);
    }
  });
});
