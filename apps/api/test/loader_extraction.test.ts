import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEST_BOBINE = 99_901;
const LOADER_PATH = "https://example.com/api/_loader/extraction";

type LoaderReport = {
  bobine: number;
  inserted: Record<string, number>;
  skipped: Array<{
    reading_order_index: number;
    reason: string;
    detail: string;
  }>;
};

type LoaderAuth =
  | "default"
  | "none"
  | { bearer: string };

function authHeaders(auth: LoaderAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth === "default") {
    headers.Authorization = `Bearer ${env.LOADER_TOKEN}`;
  } else if (auth !== "none") {
    headers.Authorization = `Bearer ${auth.bearer}`;
  }
  return headers;
}

async function postExtraction(
  body: unknown,
  auth: LoaderAuth = "default"
): Promise<Response> {
  return SELF.fetch(LOADER_PATH, {
    method: "POST",
    headers: authHeaders(auth),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function minimalBatch(overrides?: {
  bobine?: number;
  logical_records?: unknown[];
}) {
  return {
    document_scope: {
      quartier: "Test Quartier Loader",
      arrondissement: 6,
      bobine: overrides?.bobine ?? TEST_BOBINE,
    },
    logical_records: overrides?.logical_records ?? [
      {
        reading_order_index: 0,
        pdf_page: 1,
        ilot_numbers: [99_001],
        raw_text: "Ilot 99001 | Rue de Test Loader | 42",
        rue: { type: "rue", libelle: "de Test Loader" },
        numeros_raw: "42",
      },
    ],
  };
}

async function cleanupBobine(bobine: number): Promise<void> {
  await env.DB.prepare("DELETE FROM source_entries WHERE bobine = ?1")
    .bind(bobine)
    .run();
}

describe("POST /api/_loader/extraction", () => {
  beforeEach(() => cleanupBobine(TEST_BOBINE));
  afterEach(() => cleanupBobine(TEST_BOBINE));

  it("returns 401 without Authorization", async () => {
    const res = await postExtraction(minimalBatch(), "none");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await postExtraction(minimalBatch(), { bearer: "wrong-token" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await postExtraction("{not-json");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid JSON body");
  });

  it("returns 400 with issues when the batch fails schema validation", async () => {
    const res = await postExtraction({ logical_records: [] });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid extraction batch JSON");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns 200 with a LoaderReport and persists rows for a valid batch", async () => {
    const res = await postExtraction(minimalBatch());
    expect(res.status).toBe(200);
    const report = (await res.json()) as LoaderReport;

    expect(report.bobine).toBe(TEST_BOBINE);
    expect(report.inserted.source_entries).toBe(1);
    expect(report.inserted.street_segments).toBe(1);
    expect(report.inserted.segment_ilots).toBe(1);
    expect(report.skipped).toEqual([]);

    const se = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM source_entries WHERE bobine = ?1"
    )
      .bind(TEST_BOBINE)
      .first<{ n: number }>();
    expect(se?.n).toBe(1);

    const rue = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM rues
       WHERE libelle_normalized = ?1
         AND type_id = (SELECT id FROM voie_types WHERE code = 'rue')`
    )
      .bind("de test loader")
      .first<{ n: number }>();
    expect(rue?.n).toBeGreaterThanOrEqual(1);
  });

  it("replaces prior rows for the same bobine on reload", async () => {
    const first = await postExtraction(minimalBatch());
    expect(first.status).toBe(200);

    const reload = await postExtraction(
      minimalBatch({
        logical_records: [
          {
            reading_order_index: 0,
            pdf_page: 2,
            ilot_numbers: [99_001],
            raw_text: "reload row",
            rue: { type: "rue", libelle: "de Test Loader Reload" },
            numeros_raw: "44",
          },
          {
            reading_order_index: 1,
            pdf_page: 2,
            ilot_numbers: [99_001],
            raw_text: "second row",
            rue: { type: "rue", libelle: "de Test Loader Reload" },
            numeros_raw: "46",
          },
        ],
      })
    );
    expect(reload.status).toBe(200);
    const report = (await reload.json()) as LoaderReport;
    expect(report.inserted.source_entries).toBe(2);

    const se = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM source_entries WHERE bobine = ?1"
    )
      .bind(TEST_BOBINE)
      .first<{ n: number }>();
    expect(se?.n).toBe(2);
  });

  it("returns 200 with skipped rows when a record has no ilot numbers", async () => {
    const res = await postExtraction(
      minimalBatch({
        logical_records: [
          {
            reading_order_index: 0,
            pdf_page: 1,
            ilot_numbers: [],
            raw_text: "no ilot",
            rue: { type: "rue", libelle: "Sans Ilot" },
            numeros_raw: "1",
          },
        ],
      })
    );
    expect(res.status).toBe(200);
    const report = (await res.json()) as LoaderReport;
    expect(report.inserted.source_entries).toBe(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]?.reason).toBe("MISSING_ILOT_NUMBERS");
  });

  it("skips records with unparseable numeros_raw but still returns 200", async () => {
    const res = await postExtraction(
      minimalBatch({
        logical_records: [
          {
            reading_order_index: 0,
            pdf_page: 1,
            ilot_numbers: [99_001],
            raw_text: "bad numbers",
            rue: { type: "rue", libelle: "de Bad Numeros" },
            numeros_raw: "not-a-number",
          },
        ],
      })
    );
    expect(res.status).toBe(200);
    const report = (await res.json()) as LoaderReport;
    expect(report.inserted.source_entries).toBe(0);
    expect(report.skipped.some((s) => s.reason.includes("NUMEROS"))).toBe(
      true
    );
  });
});
