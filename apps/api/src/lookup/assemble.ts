import type {
  LookupMatch,
  LookupProvenance,
  LookupResponse,
} from "@andriveau-bobine/lookup";

export type LookupRawRow = {
  arrondissement: number;
  quartier: string;
  ilot: number;
  sourceEntryId: number;
  bobine: number;
  page: number;
  sequence: number | null;
  raw_text: string;
};

export type AssembleLookupOptions = {
  provenance?: boolean;
};

function tripleKey(row: Pick<LookupRawRow, "arrondissement" | "quartier" | "ilot">): string {
  return `${row.arrondissement}-${row.quartier}-${row.ilot}`;
}

function provenanceKey(entry: LookupProvenance): string {
  return `${entry.bobine}-${entry.page}-${entry.sequence}-${entry.raw_text}`;
}

function dedupeProvenance(rows: LookupRawRow[]): LookupProvenance[] {
  const seen = new Set<string>();
  const provenance: LookupProvenance[] = [];

  for (const row of rows) {
    const entry: LookupProvenance = {
      bobine: row.bobine,
      page: row.page,
      sequence: row.sequence,
      raw_text: row.raw_text,
    };
    const key = provenanceKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    provenance.push(entry);
  }

  return provenance;
}

export function assembleLookupResult(
  rows: LookupRawRow[],
  options?: AssembleLookupOptions
): LookupResponse {
  if (rows.length === 0) {
    return { matches: [], conflict: false };
  }

  const rowsByTriple = new Map<string, LookupRawRow[]>();
  for (const row of rows) {
    const key = tripleKey(row);
    const group = rowsByTriple.get(key);
    if (group) {
      group.push(row);
    } else {
      rowsByTriple.set(key, [row]);
    }
  }

  const matches: LookupMatch[] = [];
  const seenTriples = new Set<string>();

  for (const row of rows) {
    const key = tripleKey(row);
    if (seenTriples.has(key)) {
      continue;
    }
    seenTriples.add(key);

    const match: LookupMatch = {
      arrondissement: row.arrondissement,
      quartier: row.quartier,
      ilot: row.ilot,
    };

    if (options?.provenance) {
      match.provenance = dedupeProvenance(rowsByTriple.get(key) ?? []);
    }

    matches.push(match);
  }

  const distinctSourceEntries = new Set(rows.map((row) => row.sourceEntryId));
  const conflict = distinctSourceEntries.size > 1;

  return { matches, conflict };
}
