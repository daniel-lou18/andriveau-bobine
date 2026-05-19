import { z } from "zod";

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
});

export type LookupParams = z.infer<typeof lookupParamsSchema>;
export type LookupQuery = z.infer<typeof lookupQuerySchema>;
