import type { LookupRequest, LookupResponse } from "@andriveau-bobine/lookup";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { lookupQueryOptions } from "./lookupQuery";

export type LookupSubmitInput = LookupRequest;

export type AddressLookup = {
  result: LookupResponse | null;
  loading: boolean;
  error: string | null;
  submit: (input: LookupSubmitInput) => void;
  clear: () => void;
};

export function useAddressLookup(): AddressLookup {
  const [submitted, setSubmitted] = useState<LookupSubmitInput | null>(null);
  const request = submitted ?? {
    rueId: 0,
    n: 0,
    suffix: undefined,
    provenance: false,
  };

  const {
    data: result = null,
    isFetching,
    error: queryError,
  } = useQuery({
    ...lookupQueryOptions(
      request.rueId,
      request.n,
      request.suffix,
      request.provenance ?? false
    ),
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
