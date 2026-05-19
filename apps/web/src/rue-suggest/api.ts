import type { RueSuggestion } from "@andriveau-bobine/suggest";

export type { RueSuggestion };

export type SuggestResponse =
  | { ok: true; results: RueSuggestion[] }
  | { ok: false; status: number; error: string };

/**
 * Hits the Worker's read endpoint through the Vite `/api` proxy.
 * The web app never sends queries shorter than the API minimum; callers gate
 * the request on the user's input length before invoking this.
 */
export async function fetchRueSuggestions(
  q: string,
  signal?: AbortSignal
): Promise<SuggestResponse> {
  const url = `/api/rues/suggest?q=${encodeURIComponent(q)}`;
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
  const body = (await res.json()) as { results: RueSuggestion[] };
  return { ok: true, results: body.results };
}
