import { describe, expect, it } from "vitest";
import { extractionBatchSchema } from "../src/loader/schema";

describe("extractionBatchSchema", () => {
  it("rejects a batch without document_scope", () => {
    const result = extractionBatchSchema.safeParse({ logical_records: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid batch shape", () => {
    const result = extractionBatchSchema.safeParse({
      document_scope: {
        quartier: "Notre-Dame-des-Champs",
        arrondissement: 6,
        bobine: 8,
      },
      logical_records: [],
    });
    expect(result.success).toBe(true);
  });
});
