import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { LookupResponse } from "@andriveau-bobine/lookup";
import { lookupQueryOptions } from "./lookupQuery";

export type LookupSubmitInput = {
  rueId: number;
  n: number;
  suffix?: string;
};

export type AddressLookup = {
  result: LookupResponse | null;
  loading: boolean;
  error: string | null;
  submit: (input: LookupSubmitInput) => void;
  clear: () => void;
};

export function useAddressLookup(): AddressLookup {
  const [submitted, setSubmitted] = useState<LookupSubmitInput | null>(null);

  const {
    data: result = null,
    isFetching,
    error: queryError,
  } = useQuery({
    ...lookupQueryOptions(
      submitted?.rueId ?? 0,
      submitted?.n ?? 0,
      submitted?.suffix
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
