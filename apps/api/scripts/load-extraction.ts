/**
 * Thin client: POST extraction JSON to the Worker's loader route.
 * Run with API dev server: `npm run dev -w api` then:
 *   npm run loader:run -w api -- --file ../../data/extracted-tables/bobine8-extraction.json
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

type LoaderReport = {
  bobine: number;
  inserted: Record<string, number>;
  skipped: Array<{ reading_order_index: number; reason: string; detail: string }>;
};

function parseArgs(argv: string[]) {
  let file: string | undefined;
  let apiUrl = "http://127.0.0.1:8787";
  let token = process.env.LOADER_TOKEN;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" && argv[i + 1]) {
      file = argv[++i];
    } else if (a === "--api-url" && argv[i + 1]) {
      apiUrl = argv[++i];
    } else if (a === "--token" && argv[i + 1]) {
      token = argv[++i];
    }
  }
  return { file, apiUrl, token };
}

async function main() {
  const { file, apiUrl, token } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error("Usage: load-extraction.ts --file <path> [--api-url URL] [--token SECRET]");
    process.exit(2);
  }
  if (!token) {
    console.error("Missing LOADER_TOKEN (env) or --token");
    process.exit(2);
  }

  const abs = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  const raw = await readFile(abs, "utf8");
  const json = JSON.parse(raw) as unknown;

  const url = `${apiUrl.replace(/\/$/, "")}/api/_loader/extraction`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(json),
  });

  const body = (await res.json()) as LoaderReport | { error?: string; issues?: unknown };

  if (!res.ok) {
    console.error(`HTTP ${res.status}`, body);
    process.exit(1);
  }

  const report = body as LoaderReport;
  console.log("Inserted:", JSON.stringify(report.inserted, null, 2));
  console.log(`Skipped rows: ${report.skipped.length}`);

  const byReason = new Map<string, number>();
  for (const s of report.skipped) {
    byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  }
  if (byReason.size > 0) {
    console.log("Skipped by reason:");
    for (const [reason, n] of [...byReason.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${reason}: ${n}`);
    }
    for (const s of report.skipped) {
      console.log(`  [${s.reading_order_index}] ${s.reason}: ${s.detail}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
