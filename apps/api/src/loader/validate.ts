import { z } from "zod";

const rueSchema = z.object({
  type: z.string().min(1),
  libelle: z.string().min(1),
  inferred: z.boolean().optional(),
});

const logicalRecordSchema = z.object({
  reading_order_index: z.number().int().nonnegative(),
  pdf_page: z.number().int().positive(),
  page: z.number().int().positive().optional(),
  ilot_numbers: z.array(z.number().int()),
  raw_text: z.string().min(1),
  rue: rueSchema,
  numeros_raw: z.string(),
  sequence: z.number().int().optional(),
  scan_note: z.string().nullable().optional(),
  low_confidence: z.boolean().optional(),
});

export const extractionBatchSchema = z.object({
  document_scope: z.object({
    quartier: z.string().min(1),
    arrondissement: z.number().int().min(1).max(20),
    bobine: z.number().int(),
    audit: z.record(z.string(), z.unknown()).optional(),
  }),
  logical_records: z.array(logicalRecordSchema),
});

export type ExtractionBatch = z.infer<typeof extractionBatchSchema>;

export function parseExtractionBatch(
  payload: unknown
):
  | { ok: true; data: ExtractionBatch }
  | { ok: false; issues: z.ZodError<unknown>["issues"] } {
  const parsed = extractionBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues };
  }
  return { ok: true, data: parsed.data };
}
