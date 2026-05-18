import { zValidator } from "@hono/zod-validator";
import { invalidExtractionBatch } from "../http/errors";
import { extractionBatchSchema } from "./schema";

/** Validates POST JSON against the extraction interchange schema at the HTTP seam. */
export const extractionBatchValidator = zValidator(
  "json",
  extractionBatchSchema,
  (result) => {
    if (!result.success) {
      throw invalidExtractionBatch(result.error);
    }
  }
);
