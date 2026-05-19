import type { LookupMatch, LookupResponse } from "@andriveau-bobine/lookup";

export type LookupRawRow = {
  arrondissement: number;
  quartier: string;
  ilot: number;
  sourceEntryId: number;
};

export type AssembleLookupOptions = {
  provenance?: boolean;
};

export function assembleLookupResult(
  rows: LookupRawRow[],
  _options?: AssembleLookupOptions
): LookupResponse {
  if (rows.length === 0) {
    return { matches: [], conflict: false };
  }

  const seen = new Set<string>();
  const matches: LookupMatch[] = [];

  for (const row of rows) {
    const key = `${row.arrondissement}-${row.quartier}-${row.ilot}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    matches.push({
      arrondissement: row.arrondissement,
      quartier: row.quartier,
      ilot: row.ilot,
    });
  }

  const distinctSourceEntries = new Set(rows.map((row) => row.sourceEntryId));
  const conflict = distinctSourceEntries.size > 1;

  return { matches, conflict };
}
