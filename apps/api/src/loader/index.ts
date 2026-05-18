import type { Database } from "../db";
import { processExtractionBatch } from "./process-batch";
import type { ExtractionBatch } from "./schema";
import type { LoaderReport } from "./types";

export type { ExtractionBatch } from "./schema";
export { extractionBatchSchema } from "./schema";
export type { LoaderReport, ParsedToken, SkipReason } from "./types";
export { SKIP_REASON } from "./types";

/**
 * Loads a validated extraction batch into D1 (see `process-batch.ts`).
 * HTTP validation and auth live in `routes.ts`.
 */
export async function loadBatch(
  db: Database,
  batch: ExtractionBatch
): Promise<LoaderReport> {
  return processExtractionBatch(db, batch);
}
