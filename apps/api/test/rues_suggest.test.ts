import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizeName } from "../src/lib/normalize";

type SeedRue = { typeCode: string; libelle: string };

async function seedRues(rues: SeedRue[]): Promise<void> {
  for (const r of rues) {
    await env.DB.prepare(
      `INSERT INTO rues (type_id, libelle, libelle_normalized)
       VALUES ((SELECT id FROM voie_types WHERE code = ?1), ?2, ?3)`
    )
      .bind(normalizeName(r.typeCode), r.libelle, normalizeName(r.libelle))
      .run();
  }
}

async function resetRues(): Promise<void> {
  await env.DB.prepare("DELETE FROM rues").run();
}

describe("GET /api/rues/suggest", () => {
  beforeEach(resetRues);
  afterEach(resetRues);

  it("returns 200 with empty results when no rues match the prefix", async () => {
    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=ab");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
  });

  it("returns 400 when the normalized query is shorter than 2 characters", async () => {
    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=a");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns rues whose libellé_normalized starts with the (normalized) query, shaped as { rue_id, type, libelle }", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de Vaugirard" },
      { typeCode: "boulevard", libelle: "Raspail" },
      { typeCode: "rue", libelle: "Saint-Honoré" },
    ]);

    const res = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=ras"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { rue_id: number; type: string; libelle: string }[];
    };
    expect(body.results).toHaveLength(1);
    const [hit] = body.results;
    expect(hit).toBeDefined();
    expect(hit!.libelle).toBe("Raspail");
    expect(hit!.type).toBe("Boulevard");
    expect(typeof hit!.rue_id).toBe("number");
    expect(hit!.rue_id).toBeGreaterThan(0);
  });

  it("caps results at 20 even when more rues match the prefix", async () => {
    const seed: SeedRue[] = Array.from({ length: 25 }, (_, i) => ({
      typeCode: "rue",
      libelle: `de Test${String(i).padStart(2, "0")}`,
    }));
    await seedRues(seed);

    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=de");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { rue_id: number; type: string; libelle: string }[];
    };
    expect(body.results).toHaveLength(20);
  });

  it("orders results alphabetically by libellé with a stable tie-break on rue_id", async () => {
    // Insertion order intentionally non-alphabetical; two rows share libellé to
    // exercise the rue_id tie-break (allowed because `(type_id, libelle_normalized)` is unique).
    await seedRues([
      { typeCode: "rue", libelle: "de Cherche" },
      { typeCode: "rue", libelle: "de Assas" },
      { typeCode: "rue", libelle: "de Bobine" },
      { typeCode: "boulevard", libelle: "de Bobine" },
    ]);

    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=de");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { rue_id: number; type: string; libelle: string }[];
    };
    expect(body.results.map((r) => r.libelle)).toEqual([
      "de Assas",
      "de Bobine",
      "de Bobine",
      "de Cherche",
    ]);
    const [, b1, b2] = body.results;
    expect(b1!.rue_id).toBeLessThan(b2!.rue_id);
  });

  it("applies aggressive normalization to the query (accents/apostrophe/hyphen stripped) before matching libelle_normalized", async () => {
    await seedRues([
      // libelle keeps display form; libelle_normalized strips accents and turns "'" / "-" into spaces.
      { typeCode: "rue", libelle: "du Cherche-Midi" },
      { typeCode: "rue", libelle: "d'Assas" },
      { typeCode: "rue", libelle: "Notre-Dame-des-Champs" },
    ]);

    // "Cherche-Midi" -> normalized "cherche midi" -> prefix "cherche" matches "du cherche midi"? No, anchored to start.
    // Query "Du Cher" -> normalized "du cher" -> matches "du cherche midi".
    const res1 = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=Du%20Cher"
    );
    expect(res1.status).toBe(200);
    const b1 = (await res1.json()) as { results: { libelle: string }[] };
    expect(b1.results.map((r) => r.libelle)).toEqual(["du Cherche-Midi"]);

    // Apostrophe in input is treated as space (and lowercased + accent-stripped).
    const res2 = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=D%27As"
    );
    expect(res2.status).toBe(200);
    const b2 = (await res2.json()) as { results: { libelle: string }[] };
    expect(b2.results.map((r) => r.libelle)).toEqual(["d'Assas"]);

    // Accents in the input are stripped before matching the (already stripped) column.
    const res3 = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=N%C3%B4tre"
    );
    expect(res3.status).toBe(200);
    const b3 = (await res3.json()) as { results: { libelle: string }[] };
    expect(b3.results.map((r) => r.libelle)).toEqual(["Notre-Dame-des-Champs"]);
  });

  it("matches libellé when the user omits a leading French article (e.g. vau → de Vaugirard)", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de Vaugirard" },
      { typeCode: "rue", libelle: "Vauvenargues" },
    ]);

    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=vau");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { libelle: string }[] };
    expect(body.results.map((r) => r.libelle)).toEqual([
      "Vauvenargues",
      "de Vaugirard",
    ]);
  });

  it("still rejects true infix matches (no substring match on the stem)", async () => {
    await seedRues([{ typeCode: "rue", libelle: "de Vaugirard" }]);

    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=gir");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { libelle: string }[] };
    expect(body.results).toEqual([]);
  });

  it("treats SQL LIKE metacharacters in the query as literals (no wildcard injection)", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de Vaugirard" },
      { typeCode: "rue", libelle: "de Bobine" },
    ]);

    // "%" would otherwise match any sequence; ensure it does NOT match
    // "de vaugirard" or "de bobine" when fed verbatim as a prefix LIKE.
    const res = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=de%25"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { libelle: string }[] };
    expect(body.results).toEqual([]);
  });

  it("matches when the user types type + libellé (e.g. rue de rennes)", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de Rennes" },
      { typeCode: "boulevard", libelle: "de Rennes" },
      { typeCode: "rue", libelle: "Saint-Placide" },
    ]);

    const res = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=rue%20de%20rennes"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      results: { type: string; libelle: string }[];
    };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]!.type).toBe("Rue");
    expect(body.results[0]!.libelle).toBe("de Rennes");
  });

  it("still matches libellé-only when type is omitted (rennes → de Rennes)", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de Rennes" },
      { typeCode: "boulevard", libelle: "Rennes" },
    ]);

    const res = await SELF.fetch("https://example.com/api/rues/suggest?q=rennes");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { libelle: string }[] };
    expect(body.results.map((r) => r.libelle).sort()).toEqual(
      ["Rennes", "de Rennes"].sort()
    );
  });

  it("matches full normalized voie key prefix (e.g. rue de la → all Rue de la …)", async () => {
    await seedRues([
      { typeCode: "rue", libelle: "de la Forge" },
      { typeCode: "rue", libelle: "de la Paix" },
      { typeCode: "rue", libelle: "de la Santé" },
      { typeCode: "rue", libelle: "de Lorient" },
      { typeCode: "boulevard", libelle: "de la Tour" },
    ]);

    const res = await SELF.fetch(
      "https://example.com/api/rues/suggest?q=rue%20de%20la"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: { type: string; libelle: string }[] };
    expect(body.results).toHaveLength(3);
    expect(body.results.every((r) => r.type === "Rue")).toBe(true);
    expect(body.results.map((r) => r.libelle).sort()).toEqual(
      ["de la Forge", "de la Paix", "de la Santé"].sort()
    );
  });
});
