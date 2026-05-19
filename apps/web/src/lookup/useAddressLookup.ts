import type { LookupRequest, LookupResponse } from "@andriveau-bobine/lookup";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { lookupKeys, lookupQueryOptions } from "./lookupQuery";

export type LookupSubmitInput = LookupRequest;

export type AddressLookup = {
  result: LookupResponse | null;
  loading: boolean;
  error: string | null;
  submit: (input: LookupSubmitInput) => void;
  clear: () => void;
};

const idleQueryOptions = {
  queryKey: lookupKeys.all,
  queryFn: async (): Promise<LookupResponse> => {
    throw new Error("lookup query invoked without submitted input");
  },
  staleTime: 60_000,
  retry: false as const,
};

export function useAddressLookup(): AddressLookup {
  const [submitted, setSubmitted] = useState<LookupSubmitInput | null>(null);

  const {
    data: result = null,
    isFetching,
    error: queryError,
  } = useQuery({
    ...(submitted
      ? lookupQueryOptions(
          submitted.rueId,
          submitted.n,
          submitted.suffix,
          submitted.provenance ?? false
        )
      : idleQueryOptions),
    enabled: submitted !== null,
  });

  function submit(input: LookupSubmitInput) {
    setSubmitted(input);
  }

  function clear() {
    setSubmitted(null);
  }

  const error =
    submitted !== null && queryError instanceof Error
      ? queryError.message
      : null;

  return {
    result: submitted !== null ? result : null,
    loading: submitted !== null && isFetching,
    error,
    submit,
    clear,
  };
}
