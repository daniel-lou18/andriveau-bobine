import type { LookupResponse } from "@andriveau-bobine/lookup";
import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { rues } from "../db/schema";
import { parseLookupInput } from "./parse-input";
import { queryLookupMatches } from "./query";

export type { LookupMatch, LookupResponse } from "@andriveau-bobine/lookup";
export { parseLookupInput } from "./parse-input";
export { lookupParamsSchema, lookupQuerySchema } from "./schema";
export type { LookupParams, LookupQuery } from "./schema";

export async function lookupRue(
  db: Database,
  rueId: number,
  n: number,
  suffix?: string
): Promise<LookupResponse | "not_found"> {
  const rue = await db
    .select({ id: rues.id })
    .from(rues)
    .where(eq(rues.id, rueId))
    .limit(1);

  if (rue.length === 0) {
    return "not_found";
  }

  const input = parseLookupInput(n, suffix);
  const matches = await queryLookupMatches(db, rueId, input);

  return { matches, conflict: false };
}
