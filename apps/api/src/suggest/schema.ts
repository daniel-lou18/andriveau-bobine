import { SUGGEST_MIN_LENGTH } from "@andriveau-bobine/suggest";
import { z } from "zod";
import { normalizeName } from "../lib/normalize";

export const suggestQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .default("")
    .transform(normalizeName)
    .pipe(
      z.string().min(SUGGEST_MIN_LENGTH, {
        message: `Query must contain at least ${SUGGEST_MIN_LENGTH} characters after normalization.`,
      })
    ),
});

export type SuggestQuery = z.infer<typeof suggestQuerySchema>;
