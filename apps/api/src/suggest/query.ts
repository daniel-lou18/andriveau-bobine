import { asc, eq, or, sql } from "drizzle-orm";
import { SUGGEST_MAX_RESULTS } from "@andriveau-bobine/disambiguation";
import type { Database } from "../db";
import { rues, voieTypes } from "../db/schema";
import { escapeLikeFragment, type SuggestMatchSpec } from "./match";

export type SuggestQueryRow = {
  rue_id: number;
  type_code: string;
  libelle: string;
};

export async function querySuggestRues(
  db: Database,
  spec: SuggestMatchSpec
): Promise<SuggestQueryRow[]> {
  const libelleLikeClauses = spec.libellePrefixes.map((prefix) => {
    const pattern = `${escapeLikeFragment(prefix)}%`;
    return sql`${rues.libelleNormalized} LIKE ${pattern} ESCAPE '\\'`;
  });

  const fullKeyPattern = `${escapeLikeFragment(spec.fullKeyPrefix)}%`;
  const fullKeyClause = sql`(${voieTypes.code} || ' ' || ${rues.libelleNormalized}) LIKE ${fullKeyPattern} ESCAPE '\\'`;

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
