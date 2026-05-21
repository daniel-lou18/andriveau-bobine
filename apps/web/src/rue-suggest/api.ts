import type { RueSuggestion } from "@andriveau-bobine/suggest";
import { apiUrl } from "@/lib/apiBase";

export type { RueSuggestion };

export type SuggestResponse =
  | { ok: true; results: RueSuggestion[] }
  | { ok: false; status: number; error: string };

/**
 * Hits the Worker suggest endpoint. Local dev: Vite `/api` proxy when `VITE_API_URL` is unset.
 * The web app never sends queries shorter than the API minimum; callers gate
 * the request on the user's input length before invoking this.
 */
export async function fetchRueSuggestions(
  q: string,
  signal?: AbortSignal
): Promise<SuggestResponse> {
  const url = apiUrl(`/api/rues/suggest?q=${encodeURIComponent(q)}`);
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
