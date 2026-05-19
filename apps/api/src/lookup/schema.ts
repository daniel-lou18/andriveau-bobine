import {
  LOOKUP_SUFFIX_TOKENS,
  type LookupSuffixToken,
} from "@andriveau-bobine/lookup";
import { z } from "zod";

const allowedSuffixList = LOOKUP_SUFFIX_TOKENS.join(", ");
const unknownSuffixMessage = `suffix must be one of: ${allowedSuffixList} (or omitted for no suffix)`;

function normalizeLookupSuffixQueryParam(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed.toLowerCase();
  }
  return value;
}

export const lookupParamsSchema = z.object({
  rueId: z.coerce
    .number({ error: "rueId must be a positive integer" })
    .int()
    .positive({ message: "rueId must be a positive integer" }),
});

export const lookupQuerySchema = z.object({
  n: z.coerce
    .number({ error: "n must be a positive integer" })
    .int()
    .positive({ message: "n must be a positive integer" }),
  suffix: z.preprocess(
    normalizeLookupSuffixQueryParam,
    z
      .enum(LOOKUP_SUFFIX_TOKENS, { message: unknownSuffixMessage })
      .optional()
  ),
});

export type LookupParams = z.infer<typeof lookupParamsSchema>;
export type LookupQuery = z.infer<typeof lookupQuerySchema>;
export type { LookupSuffixToken };
