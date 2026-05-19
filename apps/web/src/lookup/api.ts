import type { LookupResponse } from "@andriveau-bobine/lookup";

export type LookupFetchResponse =
  | { ok: true; data: LookupResponse }
  | { ok: false; status: number; error: string };

export async function fetchLookup(
  rueId: number,
  n: number,
  signal?: AbortSignal
): Promise<LookupFetchResponse> {
  const url = `/api/rues/${encodeURIComponent(String(rueId))}/lookup?n=${encodeURIComponent(String(n))}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let error = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (typeof body.error === "string") error = body.error;
    } catch {
      // body is not JSON; keep generic status message
    }
    return { ok: false, status: res.status, error };
  }
  const data = (await res.json()) as LookupResponse;
  return { ok: true, data };
}
