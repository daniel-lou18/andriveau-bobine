import { queryOptions } from "@tanstack/react-query";
import { fetchRueSuggestions } from "./api";

/** Stable query-key factory for rue suggest reads. */
export const rueSuggestKeys = {
  all: ["rues", "suggest"] as const,
  search: (q: string) => [...rueSuggestKeys.all, q] as const,
};

export function rueSuggestionsQueryOptions(q: string) {
  return queryOptions({
    queryKey: rueSuggestKeys.search(q),
    queryFn: async ({ signal }) => {
      const result = await fetchRueSuggestions(q, signal);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.results;
    },
    staleTime: 60000,
    retry: false,
  });
}
