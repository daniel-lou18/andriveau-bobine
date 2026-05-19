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
     ) VALUES (?1, ?2, ?3, ?4, 0, ?5, 0)`
  )
    .bind(
      sourceRow!.id,
      rueRow!.id,
      config.parity,
      config.fromNumber,
      config.toNumber
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
});
