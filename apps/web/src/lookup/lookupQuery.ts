import { queryOptions } from "@tanstack/react-query";
import { fetchLookup } from "./api";

/** Stable query-key factory for address lookup reads. */
export const lookupKeys = {
  all: ["rues", "lookup"] as const,
  search: (rueId: number, n: number, suffix?: string) =>
    [...lookupKeys.all, rueId, n, suffix ?? ""] as const,
};

export function lookupQueryOptions(
  rueId: number,
  n: number,
  suffix?: string
) {
  return queryOptions({
    queryKey: lookupKeys.search(rueId, n, suffix),
    queryFn: async ({ signal }) => {
      const result = await fetchLookup(rueId, n, suffix, signal);
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
