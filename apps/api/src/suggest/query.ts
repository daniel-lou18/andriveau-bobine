import { asc, eq, or, sql } from "drizzle-orm";
import { SUGGEST_MAX_RESULTS } from "@andriveau-bobine/suggest";
import type { Database } from "../db";
import { rues, voieTypes } from "../db/schema";
import type { SuggestLikePatterns } from "@andriveau-bobine/suggest";

export type SuggestQueryRow = {
  rue_id: number;
  type_code: string;
  libelle: string;
};

export async function querySuggestRues(
  db: Database,
  patterns: SuggestLikePatterns
): Promise<SuggestQueryRow[]> {
  const libelleLikeClauses = patterns.libellePatterns.map(
    (pattern) => sql`${rues.libelleNormalized} LIKE ${pattern} ESCAPE '\\'`
  );

  const fullKeyClause = sql`(${voieTypes.code} || ' ' || ${rues.libelleNormalized}) LIKE ${patterns.fullKeyPattern} ESCAPE '\\'`;

  const whereCombined = or(...libelleLikeClauses, fullKeyClause);

  return db
    .select({
      rue_id: rues.id,
      type_code: voieTypes.code,
      libelle: rues.libelle,
    })
    .from(rues)
    .innerJoin(voieTypes, eq(voieTypes.id, rues.typeId))
    .where(whereCombined)
    .orderBy(asc(rues.libelle), asc(rues.id))
    .limit(SUGGEST_MAX_RESULTS);
}
