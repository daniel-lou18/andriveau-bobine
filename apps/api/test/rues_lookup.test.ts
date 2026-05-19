import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LookupResponse } from "@andriveau-bobine/lookup";
import { normalizeName } from "../src/lib/normalize";

type SeedSegment = {
  rueTypeCode: string;
  rueLibelle: string;
  parity: "odd" | "even";
  fromNumber: number;
  toNumber: number;
  fromSuffixRank?: number;
  toSuffixRank?: number;
  ilotNumber: number;
  arrondissementNumber: number;
  quartierName: string;
};

async function resetLookupFixtures(): Promise<void> {
  await env.DB.prepare("DELETE FROM segment_ilots").run();
  await env.DB.prepare("DELETE FROM street_segments").run();
  await env.DB.prepare("DELETE FROM source_entries").run();
  await env.DB.prepare("DELETE FROM rues").run();
  await env.DB.prepare("DELETE FROM ilots").run();
  await env.DB.prepare("DELETE FROM quartiers").run();
  await env.DB.prepare("DELETE FROM arrondissements").run();
}

async function seedLookupSegment(config: SeedSegment): Promise<{ rueId: number }> {
  await env.DB.prepare(
    "INSERT INTO arrondissements (number, name) VALUES (?1, ?2)"
  )
    .bind(config.arrondissementNumber, `${config.arrondissementNumber}e`)
    .run();

  const arrRow = await env.DB.prepare(
    "SELECT id FROM arrondissements WHERE number = ?1"
  )
    .bind(config.arrondissementNumber)
    .first<{ id: number }>();

  await env.DB.prepare(
    "INSERT INTO quartiers (arrondissement_id, name, name_normalized) VALUES (?1, ?2, ?3)"
  )
    .bind(
      arrRow!.id,
      config.quartierName,
      normalizeName(config.quartierName)
    )
    .run();

  const quartierRow = await env.DB.prepare(
    "SELECT id FROM quartiers WHERE name_normalized = ?1"
  )
    .bind(normalizeName(config.quartierName))
    .first<{ id: number }>();

  await env.DB.prepare("INSERT INTO ilots (quartier_id, number) VALUES (?1, ?2)")
    .bind(quartierRow!.id, config.ilotNumber)
    .run();

  const ilotRow = await env.DB.prepare(
    "SELECT id FROM ilots WHERE number = ?1"
  )
    .bind(config.ilotNumber)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO rues (type_id, libelle, libelle_normalized)
     VALUES ((SELECT id FROM voie_types WHERE code = ?1), ?2, ?3)`
  )
    .bind(
      normalizeName(config.rueTypeCode),
      config.rueLibelle,
      normalizeName(config.rueLibelle)
    )
    .run();

  const rueRow = await env.DB.prepare(
    "SELECT id FROM rues WHERE libelle = ?1"
  )
    .bind(config.rueLibelle)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO source_entries (quartier_id, bobine, page, raw_text, sequence)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(quartierRow!.id, 8, 1, "test raw", 0)
    .run();

  const sourceRow = await env.DB.prepare(
    "SELECT id FROM source_entries WHERE bobine = ?1"
  )
    .bind(8)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO street_segments (
       source_entry_id, rue_id, parity,
       from_number, from_suffix_rank, to_number, to_suffix_rank
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      sourceRow!.id,
      rueRow!.id,
      config.parity,
      config.fromNumber,
      config.fromSuffixRank ?? 0,
      config.toNumber,
      config.toSuffixRank ?? 0
    )
    .run();

  const segmentRow = await env.DB.prepare(
    "SELECT id FROM street_segments WHERE rue_id = ?1"
  )
    .bind(rueRow!.id)
    .first<{ id: number }>();

  await env.DB.prepare(
    "INSERT INTO segment_ilots (segment_id, ilot_id) VALUES (?1, ?2)"
  )
    .bind(segmentRow!.id, ilotRow!.id)
    .run();

  return { rueId: rueRow!.id };
}

type SeedMultiIlotSegment = Omit<SeedSegment, "ilotNumber"> & {
  ilotNumbers: number[];
};

async function seedLookupSegmentWithIlots(
  config: SeedMultiIlotSegment
): Promise<{ rueId: number }> {
  await env.DB.prepare(
    "INSERT INTO arrondissements (number, name) VALUES (?1, ?2)"
  )
    .bind(config.arrondissementNumber, `${config.arrondissementNumber}e`)
    .run();

  const arrRow = await env.DB.prepare(
    "SELECT id FROM arrondissements WHERE number = ?1"
  )
    .bind(config.arrondissementNumber)
    .first<{ id: number }>();

  await env.DB.prepare(
    "INSERT INTO quartiers (arrondissement_id, name, name_normalized) VALUES (?1, ?2, ?3)"
  )
    .bind(
      arrRow!.id,
      config.quartierName,
      normalizeName(config.quartierName)
    )
    .run();

  const quartierRow = await env.DB.prepare(
    "SELECT id FROM quartiers WHERE name_normalized = ?1"
  )
    .bind(normalizeName(config.quartierName))
    .first<{ id: number }>();

  const ilotIds: number[] = [];
  for (const ilotNumber of config.ilotNumbers) {
    await env.DB.prepare(
      "INSERT INTO ilots (quartier_id, number) VALUES (?1, ?2)"
    )
      .bind(quartierRow!.id, ilotNumber)
      .run();

    const ilotRow = await env.DB.prepare(
      "SELECT id FROM ilots WHERE number = ?1 AND quartier_id = ?2"
    )
      .bind(ilotNumber, quartierRow!.id)
      .first<{ id: number }>();

    ilotIds.push(ilotRow!.id);
  }

  await env.DB.prepare(
    `INSERT INTO rues (type_id, libelle, libelle_normalized)
     VALUES ((SELECT id FROM voie_types WHERE code = ?1), ?2, ?3)`
  )
    .bind(
      normalizeName(config.rueTypeCode),
      config.rueLibelle,
      normalizeName(config.rueLibelle)
    )
    .run();

  const rueRow = await env.DB.prepare(
    "SELECT id FROM rues WHERE libelle = ?1"
  )
    .bind(config.rueLibelle)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO source_entries (quartier_id, bobine, page, raw_text, sequence)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(quartierRow!.id, 8, 1, "test raw multi-ilot", 0)
    .run();

  const sourceRow = await env.DB.prepare(
    "SELECT id FROM source_entries WHERE bobine = ?1"
  )
    .bind(8)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO street_segments (
       source_entry_id, rue_id, parity,
       from_number, from_suffix_rank, to_number, to_suffix_rank
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      sourceRow!.id,
      rueRow!.id,
      config.parity,
      config.fromNumber,
      config.fromSuffixRank ?? 0,
      config.toNumber,
      config.toSuffixRank ?? 0
    )
    .run();

  const segmentRow = await env.DB.prepare(
    "SELECT id FROM street_segments WHERE rue_id = ?1"
  )
    .bind(rueRow!.id)
    .first<{ id: number }>();

  for (const ilotId of ilotIds) {
    await env.DB.prepare(
      "INSERT INTO segment_ilots (segment_id, ilot_id) VALUES (?1, ?2)"
    )
      .bind(segmentRow!.id, ilotId)
      .run();
  }

  return { rueId: rueRow!.id };
}

type AdditionalSourceSegment = {
  rueId: number;
  bobine: number;
  parity: "odd" | "even";
  fromNumber: number;
  toNumber: number;
  fromSuffixRank?: number;
  toSuffixRank?: number;
  ilotNumber: number;
  arrondissementNumber: number;
  quartierName: string;
};

async function seedAdditionalSourceSegment(
  config: AdditionalSourceSegment
): Promise<void> {
  const quartierRow = await env.DB.prepare(
    "SELECT id FROM quartiers WHERE name_normalized = ?1"
  )
    .bind(normalizeName(config.quartierName))
    .first<{ id: number }>();

  let ilotRow = await env.DB.prepare(
    "SELECT id FROM ilots WHERE number = ?1"
  )
    .bind(config.ilotNumber)
    .first<{ id: number }>();

  if (!ilotRow) {
    await env.DB.prepare(
      "INSERT INTO ilots (quartier_id, number) VALUES (?1, ?2)"
    )
      .bind(quartierRow!.id, config.ilotNumber)
      .run();

    ilotRow = await env.DB.prepare(
      "SELECT id FROM ilots WHERE number = ?1"
    )
      .bind(config.ilotNumber)
      .first<{ id: number }>();
  }

  await env.DB.prepare(
    `INSERT INTO source_entries (quartier_id, bobine, page, raw_text, sequence)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(quartierRow!.id, config.bobine, 1, `test raw bobine ${config.bobine}`, 0)
    .run();

  const sourceRow = await env.DB.prepare(
    "SELECT id FROM source_entries WHERE bobine = ?1"
  )
    .bind(config.bobine)
    .first<{ id: number }>();

  await env.DB.prepare(
    `INSERT INTO street_segments (
       source_entry_id, rue_id, parity,
       from_number, from_suffix_rank, to_number, to_suffix_rank
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      sourceRow!.id,
      config.rueId,
      config.parity,
      config.fromNumber,
      config.fromSuffixRank ?? 0,
      config.toNumber,
      config.toSuffixRank ?? 0
    )
    .run();

  const segmentRow = await env.DB.prepare(
    "SELECT id FROM street_segments WHERE source_entry_id = ?1"
  )
    .bind(sourceRow!.id)
    .first<{ id: number }>();

  await env.DB.prepare(
    "INSERT INTO segment_ilots (segment_id, ilot_id) VALUES (?1, ?2)"
  )
    .bind(segmentRow!.id, ilotRow!.id)
    .run();
}

describe("GET /api/rues/:rueId/lookup", () => {
  beforeEach(resetLookupFixtures);
  afterEach(resetLookupFixtures);

  it("returns 200 with one match when a singleton segment covers the address", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Lookup",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Notre-Dame-des-Champs",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(false);
    expect(body.matches).toEqual([
      {
        arrondissement: 6,
        quartier: "Notre-Dame-des-Champs",
        ilot: 4121,
      },
    ]);
  });

  it("returns 200 with one match when the number falls inside a multi-number segment", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Range",
      parity: "even",
      fromNumber: 10,
      toNumber: 20,
      ilotNumber: 5000,
      arrondissementNumber: 18,
      quartierName: "Grandes Carrieres",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=14`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(false);
    expect(body.matches).toEqual([
      {
        arrondissement: 18,
        quartier: "Grandes Carrieres",
        ilot: 5000,
      },
    ]);
  });

  it("returns 200 with an empty matches list when the rue exists but no segment covers the address", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Empty",
      parity: "odd",
      fromNumber: 1,
      toNumber: 9,
      ilotNumber: 6000,
      arrondissementNumber: 6,
      quartierName: "Test Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=11`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body).toEqual({ matches: [], conflict: false });
  });

  it("returns 404 when rue_id is well-formed but absent from rues", async () => {
    const res = await SELF.fetch(
      "https://example.com/api/rues/99999/lookup?n=10"
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("rue not found");
  });

  it("returns 400 when n is missing", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Validation",
      parity: "even",
      fromNumber: 10,
      toNumber: 10,
      ilotNumber: 7000,
      arrondissementNumber: 6,
      quartierName: "Validation Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup`
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns 400 when n is not positive", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Validation 2",
      parity: "even",
      fromNumber: 10,
      toNumber: 10,
      ilotNumber: 7001,
      arrondissementNumber: 6,
      quartierName: "Validation Quartier 2",
    });

    const resZero = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=0`
    );
    expect(resZero.status).toBe(400);

    const resNegative = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=-5`
    );
    expect(resNegative.status).toBe(400);
  });

  it("returns 400 when rueId is not numeric", async () => {
    const res = await SELF.fetch(
      "https://example.com/api/rues/abc/lookup?n=10"
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns 400 when rueId is not positive", async () => {
    const resZero = await SELF.fetch(
      "https://example.com/api/rues/0/lookup?n=10"
    );
    expect(resZero.status).toBe(400);
    const bodyZero = (await resZero.json()) as { error: string };
    expect(bodyZero.error).toMatch(/rueId must be a positive integer/);

    const resNegative = await SELF.fetch(
      "https://example.com/api/rues/-1/lookup?n=10"
    );
    expect(resNegative.status).toBe(400);
    const bodyNegative = (await resNegative.json()) as { error: string };
    expect(bodyNegative.error).toMatch(/rueId must be a positive integer/);
  });

  it("returns 200 with one match when suffix=bis covers (n, rank 1) on an 8 → 8bis segment", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Suffix Bis",
      parity: "even",
      fromNumber: 8,
      toNumber: 8,
      fromSuffixRank: 0,
      toSuffixRank: 1,
      ilotNumber: 8001,
      arrondissementNumber: 6,
      quartierName: "Suffix Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=8&suffix=bis`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(false);
    expect(body.matches).toEqual([
      {
        arrondissement: 6,
        quartier: "Suffix Quartier",
        ilot: 8001,
      },
    ]);
  });

  it("returns 200 with empty matches when suffix=ter is outside an 8 → 8bis segment", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Suffix Ter Miss",
      parity: "even",
      fromNumber: 8,
      toNumber: 8,
      fromSuffixRank: 0,
      toSuffixRank: 1,
      ilotNumber: 8002,
      arrondissementNumber: 6,
      quartierName: "Suffix Ter Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=8&suffix=ter`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body).toEqual({ matches: [], conflict: false });
  });

  it("returns 200 with empty matches when suffix=bis does not match a singleton 8 segment", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Singleton Eight",
      parity: "even",
      fromNumber: 8,
      toNumber: 8,
      fromSuffixRank: 0,
      toSuffixRank: 0,
      ilotNumber: 8003,
      arrondissementNumber: 6,
      quartierName: "Singleton Eight Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=8&suffix=bis`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body).toEqual({ matches: [], conflict: false });
  });

  it("returns 200 with a match for 10bis but not for 10ter on a 10 → 10bis segment", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Ten Bis Cap",
      parity: "even",
      fromNumber: 10,
      toNumber: 10,
      fromSuffixRank: 0,
      toSuffixRank: 1,
      ilotNumber: 8010,
      arrondissementNumber: 6,
      quartierName: "Ten Bis Quartier",
    });

    const resBis = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=10&suffix=bis`
    );
    expect(resBis.status).toBe(200);
    const bodyBis = (await resBis.json()) as LookupResponse;
    expect(bodyBis.matches).toHaveLength(1);

    const resTer = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=10&suffix=ter`
    );
    expect(resTer.status).toBe(200);
    const bodyTer = (await resTer.json()) as LookupResponse;
    expect(bodyTer).toEqual({ matches: [], conflict: false });
  });

  it("returns 400 when suffix is an unknown token", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Bad Suffix",
      parity: "even",
      fromNumber: 8,
      toNumber: 8,
      ilotNumber: 8099,
      arrondissementNumber: 6,
      quartierName: "Bad Suffix Quartier",
    });

    for (const token of ["octies", "foo", "1"]) {
      const res = await SELF.fetch(
        `https://example.com/api/rues/${rueId}/lookup?n=8&suffix=${token}`
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/suffix must be one of:/);
      expect(body.error).toMatch(/bis/);
    }
  });

  it("returns multiple matches with conflict false when one source asserts multiple ilots", async () => {
    const { rueId } = await seedLookupSegmentWithIlots({
      rueTypeCode: "rue",
      rueLibelle: "de Test Shared Edge",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumbers: [4121, 4122],
      arrondissementNumber: 6,
      quartierName: "Shared Edge Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(false);
    expect(body.matches).toHaveLength(2);
    expect(body.matches.map((m) => m.ilot).sort()).toEqual([4121, 4122]);
  });

  it("returns conflict true when two sources disagree on ilot for the same address", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Conflict Disagree",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Conflict Disagree Quartier",
    });

    await seedAdditionalSourceSegment({
      rueId,
      bobine: 43,
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4999,
      arrondissementNumber: 6,
      quartierName: "Conflict Disagree Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(true);
    expect(body.matches).toHaveLength(2);
    expect(body.matches.map((m) => m.ilot).sort()).toEqual([4121, 4999]);
  });

  it("returns provenance per match when provenance=1", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Provenance",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Provenance Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95&provenance=1`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(false);
    expect(body.matches).toEqual([
      {
        arrondissement: 6,
        quartier: "Provenance Quartier",
        ilot: 4121,
        provenance: [
          {
            bobine: 8,
            page: 1,
            sequence: 0,
            raw_text: "test raw",
          },
        ],
      },
    ]);
  });

  it("omits provenance on matches by default", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Provenance Default",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4122,
      arrondissementNumber: 6,
      quartierName: "Provenance Default Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.matches[0]).not.toHaveProperty("provenance");
  });

  it("returns 400 when provenance is not 0 or 1", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Bad Provenance",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4123,
      arrondissementNumber: 6,
      quartierName: "Bad Provenance Quartier",
    });

    for (const value of ["yes", "2", "true"]) {
      const res = await SELF.fetch(
        `https://example.com/api/rues/${rueId}/lookup?n=95&provenance=${value}`
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/provenance must be 0 or 1/);
    }
  });

  it("returns the same matches and conflict with or without provenance", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Provenance Parity",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Provenance Parity Quartier",
    });

    await seedAdditionalSourceSegment({
      rueId,
      bobine: 43,
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4999,
      arrondissementNumber: 6,
      quartierName: "Provenance Parity Quartier",
    });

    const without = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    const withProv = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95&provenance=1`
    );

    const bodyWithout = (await without.json()) as LookupResponse;
    const bodyWith = (await withProv.json()) as LookupResponse;

    expect(bodyWith.conflict).toBe(bodyWithout.conflict);
    expect(bodyWith.matches.map(({ provenance: _, ...match }) => match)).toEqual(
      bodyWithout.matches
    );
    expect(bodyWith.conflict).toBe(true);
    expect(bodyWith.matches.every((m) => m.provenance?.length === 1)).toBe(
      true
    );
  });

  it("dedupes matching triples and returns conflict true when two sources agree on ilot", async () => {
    const { rueId } = await seedLookupSegment({
      rueTypeCode: "rue",
      rueLibelle: "de Test Conflict Agree",
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Conflict Agree Quartier",
    });

    await seedAdditionalSourceSegment({
      rueId,
      bobine: 43,
      parity: "odd",
      fromNumber: 95,
      toNumber: 95,
      ilotNumber: 4121,
      arrondissementNumber: 6,
      quartierName: "Conflict Agree Quartier",
    });

    const res = await SELF.fetch(
      `https://example.com/api/rues/${rueId}/lookup?n=95`
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as LookupResponse;
    expect(body.conflict).toBe(true);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0]).toEqual({
      arrondissement: 6,
      quartier: "Conflict Agree Quartier",
      ilot: 4121,
    });
  });
});
