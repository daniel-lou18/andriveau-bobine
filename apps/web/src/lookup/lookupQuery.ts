import { queryOptions } from "@tanstack/react-query";
import { fetchLookup } from "./api";

/** Stable query-key factory for address lookup reads. */
export const lookupKeys = {
  all: ["rues", "lookup"] as const,
  search: (rueId: number, n: number, suffix?: string, provenance = false) =>
    [...lookupKeys.all, rueId, n, suffix ?? "", provenance] as const,
};

export function lookupQueryOptions(
  rueId: number,
  n: number,
  suffix?: string,
  provenance = false
) {
  return queryOptions({
    queryKey: lookupKeys.search(rueId, n, suffix, provenance),
    queryFn: async ({ signal }) => {
      const result = await fetchLookup(rueId, n, suffix, provenance, signal);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: false,
    staleTime: 60_000,
    retry: false,
  });
}
