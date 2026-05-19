import { and, eq, sql } from "drizzle-orm";
import type { LookupMatch } from "@andriveau-bobine/lookup";
import type { Database } from "../db";
import {
  arrondissements,
  ilots,
  quartiers,
  segmentIlots,
  sourceEntries,
  streetSegments,
} from "../db/schema";
import type { ParsedLookupInput } from "./parse-input";

export async function queryLookupMatches(
  db: Database,
  rueId: number,
  input: ParsedLookupInput
): Promise<LookupMatch[]> {
  const rows = await db
    .select({
      arrondissement: arrondissements.number,
      quartier: quartiers.name,
      ilot: ilots.number,
      bobine: sourceEntries.bobine,
      page: sourceEntries.page,
      sequence: sourceEntries.sequence,
      raw_text: sourceEntries.rawText,
    })
    .from(streetSegments)
    .innerJoin(
      sourceEntries,
      eq(sourceEntries.id, streetSegments.sourceEntryId)
    )
    .innerJoin(segmentIlots, eq(segmentIlots.segmentId, streetSegments.id))
    .innerJoin(ilots, eq(ilots.id, segmentIlots.ilotId))
    .innerJoin(quartiers, eq(quartiers.id, ilots.quartierId))
    .innerJoin(
      arrondissements,
      eq(arrondissements.id, quartiers.arrondissementId)
    )
    .where(
      and(
        eq(streetSegments.rueId, rueId),
        eq(streetSegments.parity, input.parity),
        sql`(${streetSegments.fromNumber}, ${streetSegments.fromSuffixRank}) <= (${input.n}, ${input.n_rank})`,
        sql`(${input.n}, ${input.n_rank}) <= (${streetSegments.toNumber}, ${streetSegments.toSuffixRank})`
      )
    )
    .orderBy(
      sourceEntries.bobine,
      sourceEntries.page,
      sql`COALESCE(${sourceEntries.sequence}, 0)`,
      ilots.number
    );

  return rows.map(({ arrondissement, quartier, ilot }) => ({
    arrondissement,
    quartier,
    ilot,
  }));
}
