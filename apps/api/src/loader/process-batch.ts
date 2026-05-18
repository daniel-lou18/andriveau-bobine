import { and, eq } from "drizzle-orm";
import type { Database } from "../db";
import {
  rues,
  segmentIlots,
  sourceEntries,
  streetSegments,
  voieTypes,
} from "../db/schema";
import { SEGMENT_QUALITY } from "../lib/quality_flags";
import { normalizeName } from "../lib/normalize";
import { suffixOfRank } from "../lib/suffix";
import { bootstrapGeography } from "./bootstrap";
import { parseNumerosRaw, parityForToken } from "./parse-numeros";
import type { ExtractionBatch } from "./schema";
import type { LoaderReport, ParsedToken, SkipReason } from "./types";

function dedupeSkips(
  items: Array<{ reason: SkipReason; detail: string }>
): Array<{ reason: SkipReason; detail: string }> {
  const seen = new Set<string>();
  const out: Array<{ reason: SkipReason; detail: string }> = [];
  for (const it of items) {
    const k = `${it.reason}:${it.detail}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function tokenToSegmentValues(
  token: ParsedToken,
  sourceEntryId: number,
  rueId: number,
  typeInferred: boolean,
  qualityFlags: number
) {
  const parity = parityForToken(token);
  if (token.kind === "singleton") {
    return {
      sourceEntryId,
      rueId,
      parity,
      fromNumber: token.n,
      fromSuffixRank: token.rank,
      toNumber: token.n,
      toSuffixRank: token.rank,
      fromSuffix: token.suffix,
      toSuffix: token.suffix,
      typeInferred,
      qualityFlags,
    };
  }
  return {
    sourceEntryId,
    rueId,
    parity,
    fromNumber: token.from.n,
    fromSuffixRank: token.from.rank,
    toNumber: token.to.n,
    toSuffixRank: token.to.rank,
    fromSuffix: suffixOfRank(token.from.rank),
    toSuffix: suffixOfRank(token.to.rank),
    typeInferred,
    qualityFlags,
  };
}

/**
 * Persists a validated extraction batch: replaces prior rows for the bobine,
 * bootstraps geography, and inserts source entries, segments, and segment–îlot links.
 */
export async function processExtractionBatch(
  db: Database,
  batch: ExtractionBatch
): Promise<LoaderReport> {
  const scope = batch.document_scope;
  const bobine = scope.bobine;

  const report: LoaderReport = {
    bobine,
    inserted: {
      arrondissements: 0,
      quartiers: 0,
      ilots: 0,
      rues: 0,
      source_entries: 0,
      street_segments: 0,
      segment_ilots: 0,
    },
    skipped: [],
  };

  const allIlotNumbers = new Set<number>();
  for (const rec of batch.logical_records) {
    for (const n of rec.ilot_numbers) {
      allIlotNumbers.add(n);
    }
  }

  await db.delete(sourceEntries).where(eq(sourceEntries.bobine, bobine));

  const boot = await bootstrapGeography(db, scope, allIlotNumbers);
  report.inserted.arrondissements += boot.inserted.arrondissements;
  report.inserted.quartiers += boot.inserted.quartiers;
  report.inserted.ilots += boot.inserted.ilots;

  const voieRows = await db
    .select({ id: voieTypes.id, code: voieTypes.code })
    .from(voieTypes);
  const voieByCode = new Map(voieRows.map((r) => [r.code, r.id]));

  for (const rec of batch.logical_records) {
    const idx = rec.reading_order_index;

    if (rec.ilot_numbers.length === 0) {
      report.skipped.push({
        reading_order_index: idx,
        reason: "MISSING_ILOT_NUMBERS",
        detail: "ilot_numbers is empty",
      });
      continue;
    }

    const badIlot = rec.ilot_numbers.find((n) => boot.crossQuartierIlots.has(n));
    if (badIlot !== undefined) {
      report.skipped.push({
        reading_order_index: idx,
        reason: "CROSS_QUARTIER_ILOT",
        detail: `ilot ${badIlot} already exists under another quartier`,
      });
      continue;
    }

    const typeCode = normalizeName(rec.rue.type.trim());
    const typeId = voieByCode.get(typeCode);
    if (typeId === undefined) {
      report.skipped.push({
        reading_order_index: idx,
        reason: "UNKNOWN_VOIE_TYPE",
        detail: `Unknown voie type code: ${JSON.stringify(typeCode)}`,
      });
      continue;
    }

    const libNorm = normalizeName(rec.rue.libelle);
    const rueIns = await db
      .insert(rues)
      .values({
        typeId,
        libelle: rec.rue.libelle,
        libelleNormalized: libNorm,
      })
      .onConflictDoNothing({
        target: [rues.typeId, rues.libelleNormalized],
      })
      .returning({ id: rues.id });
    if (rueIns.length > 0) report.inserted.rues += 1;

    const [rueRow] = await db
      .select({ id: rues.id })
      .from(rues)
      .where(and(eq(rues.typeId, typeId), eq(rues.libelleNormalized, libNorm)))
      .limit(1);
    if (!rueRow) {
      report.skipped.push({
        reading_order_index: idx,
        reason: "UNKNOWN_VOIE_TYPE",
        detail: "Failed to resolve rue after insert",
      });
      continue;
    }
    const rueId = rueRow.id;

    const { tokens, rejects } = parseNumerosRaw(rec.numeros_raw);

    if (tokens.length === 0) {
      for (const r of dedupeSkips(rejects)) {
        report.skipped.push({
          reading_order_index: idx,
          reason: r.reason,
          detail: r.detail,
        });
      }
      continue;
    }

    for (const r of dedupeSkips(rejects)) {
      report.skipped.push({
        reading_order_index: idx,
        reason: r.reason,
        detail: r.detail,
      });
    }

    const typeInferred = rec.rue.inferred === true;
    const qualityFlags = rec.low_confidence
      ? SEGMENT_QUALITY.LOW_CONFIDENCE_EXTRACTION
      : 0;

    const page = rec.page ?? rec.pdf_page;
    const sequence = rec.sequence ?? rec.reading_order_index;

    const [seRow] = await db
      .insert(sourceEntries)
      .values({
        quartierId: boot.quartierId,
        bobine,
        page,
        rawText: rec.raw_text,
        sequence,
        notes: rec.scan_note ?? null,
      })
      .returning({ id: sourceEntries.id });
    if (!seRow) throw new Error("source_entries insert returned no row");
    report.inserted.source_entries += 1;
    const sourceEntryId = seRow.id;

    const segValues = tokens.map((tok) =>
      tokenToSegmentValues(
        tok,
        sourceEntryId,
        rueId,
        typeInferred,
        qualityFlags
      )
    );

    const segmentIds: number[] = [];
    for (const vals of segValues) {
      const [row] = await db
        .insert(streetSegments)
        .values(vals)
        .returning({ id: streetSegments.id });
      if (!row) throw new Error("street_segments insert returned no row");
      segmentIds.push(row.id);
      report.inserted.street_segments += 1;
    }

    const ilotIds = rec.ilot_numbers.map((n) => {
      const id = boot.ilotIdByNumber.get(n);
      if (id === undefined) throw new Error(`ilot ${n} not in map`);
      return id;
    });

    for (const segId of segmentIds) {
      for (const ilotId of ilotIds) {
        await db.insert(segmentIlots).values({ segmentId: segId, ilotId });
        report.inserted.segment_ilots += 1;
      }
    }
  }

  return report;
}
