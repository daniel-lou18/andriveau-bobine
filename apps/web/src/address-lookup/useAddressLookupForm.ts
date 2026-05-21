import type { LookupSuffixToken } from "@andriveau-bobine/lookup";
import type { ResolvedRue } from "@andriveau-bobine/suggest";
import { useState, type KeyboardEvent, type SubmitEvent } from "react";
import type { AddressLookup } from "../lookup/useAddressLookup";
import { canSubmitLookup, rueIdForLookup } from "../rue-suggest/handoff";

export type UseAddressLookupFormInput = {
  resolvedRue: ResolvedRue | null;
  lookup: AddressLookup;
};

export type AddressLookupForm = {
  n: string;
  setN: (value: string) => void;
  suffixSelectValue: string;
  setSuffixFromSelect: (value: string) => void;
  provenance: boolean;
  setProvenance: (value: boolean) => void;
  lookupFieldsEnabled: boolean;
  canSubmit: boolean;
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  handleNumberKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function useAddressLookupForm({
  resolvedRue,
  lookup,
}: UseAddressLookupFormInput): AddressLookupForm {
  const [n, setN] = useState("");
  const [suffix, setSuffix] = useState<LookupSuffixToken | "">("");
  const [provenance, setProvenance] = useState(false);
  const parsedN = Number(n);
  const hasPositiveN = Number.isInteger(parsedN) && parsedN > 0;
  const lookupFieldsEnabled = canSubmitLookup(resolvedRue);
  const canSubmit = lookupFieldsEnabled && hasPositiveN;

  function submitLookup() {
    if (!canSubmit || resolvedRue === null) return;
    lookup.submit({
      rueId: rueIdForLookup(resolvedRue),
      n: parsedN,
      suffix: suffix === "" ? undefined : suffix,
      provenance: provenance || undefined,
    });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submitLookup();
  }

  function handleNumberKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitLookup();
    }
  }

  function setSuffixFromSelect(value: string) {
    setSuffix(value === "none" ? "" : (value as LookupSuffixToken));
  }

  return {
    n,
    setN,
    suffixSelectValue: suffix === "" ? "none" : suffix,
    setSuffixFromSelect,
    provenance,
    setProvenance,
    lookupFieldsEnabled,
    canSubmit,
    handleSubmit,
    handleNumberKeyDown,
  };
}
