import { and, eq } from "drizzle-orm";
import type { Database } from "../db";
import {
  arrondissements,
  ilots,
  quartiers,
} from "../db/schema";
import { normalizeName } from "../lib/normalize";
import type { ExtractionBatch } from "./validate";

/** French ordinal display name for `arrondissements.name` (integer 1..20). */
const ARR_DISPLAY_NAME: Record<number, string> = {
  1: "1er",
  2: "2e",
  3: "3e",
  4: "4e",
  5: "5e",
  6: "6e",
  7: "7e",
  8: "8e",
  9: "9e",
  10: "10e",
  11: "11e",
  12: "12e",
  13: "13e",
  14: "14e",
  15: "15e",
  16: "16e",
  17: "17e",
  18: "18e",
  19: "19e",
  20: "20e",
};

export type BootstrapResult = {
  arrondissementId: number;
  quartierId: number;
  ilotIdByNumber: Map<number, number>;
  inserted: { arrondissements: number; quartiers: number; ilots: number };
  crossQuartierIlots: Set<number>;
};

export async function bootstrapGeography(
  db: Database,
  scope: ExtractionBatch["document_scope"],
  allIlotNumbers: ReadonlySet<number>
): Promise<BootstrapResult> {
  const arrName = ARR_DISPLAY_NAME[scope.arrondissement];
  if (arrName === undefined) {
    throw new Error(`Unsupported arrondissement: ${scope.arrondissement}`);
  }

  const inserted = { arrondissements: 0, quartiers: 0, ilots: 0 };
  const crossQuartierIlots = new Set<number>();

  const arrIns = await db
    .insert(arrondissements)
    .values({ number: scope.arrondissement, name: arrName })
    .onConflictDoNothing({ target: arrondissements.number })
    .returning({ id: arrondissements.id });
  if (arrIns.length > 0) inserted.arrondissements += 1;

  const [arrRow] = await db
    .select({ id: arrondissements.id })
    .from(arrondissements)
    .where(eq(arrondissements.number, scope.arrondissement))
    .limit(1);
  if (!arrRow) throw new Error("arrondissement row missing after upsert");
  const arrondissementId = arrRow.id;

  const qNorm = normalizeName(scope.quartier);
  const qIns = await db
    .insert(quartiers)
    .values({
      arrondissementId,
      name: scope.quartier,
      normalizedName: qNorm,
    })
    .onConflictDoNothing({
      target: [quartiers.arrondissementId, quartiers.normalizedName],
    })
    .returning({ id: quartiers.id });
  if (qIns.length > 0) inserted.quartiers += 1;

  const [qRow] = await db
    .select({ id: quartiers.id })
    .from(quartiers)
    .where(
      and(
        eq(quartiers.arrondissementId, arrondissementId),
        eq(quartiers.normalizedName, qNorm)
      )
    )
    .limit(1);
  if (!qRow) throw new Error("quartier row missing after upsert");
  const quartierId = qRow.id;

  const ilotIdByNumber = new Map<number, number>();

  for (const num of allIlotNumbers) {
    const iIns = await db
      .insert(ilots)
      .values({ quartierId, number: num })
      .onConflictDoNothing({ target: ilots.number })
      .returning({ id: ilots.id });
    if (iIns.length > 0) inserted.ilots += 1;

    const [iRow] = await db
      .select({ id: ilots.id, quartierId: ilots.quartierId })
      .from(ilots)
      .where(eq(ilots.number, num))
      .limit(1);
    if (!iRow) throw new Error(`ilot ${num} missing after upsert`);

    if (iRow.quartierId !== quartierId) {
      crossQuartierIlots.add(num);
    }
    ilotIdByNumber.set(num, iRow.id);
  }

  return {
    arrondissementId,
    quartierId,
    ilotIdByNumber,
    inserted,
    crossQuartierIlots,
  };
}
