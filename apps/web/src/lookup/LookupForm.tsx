import { useState, type FormEvent } from "react";
import type { ResolvedRue } from "@andriveau-bobine/disambiguation";
import {
  LOOKUP_SUFFIX_TOKENS,
  type LookupSuffixToken,
} from "@andriveau-bobine/lookup";
import { canSubmitLookup } from "../rue-suggest/handoff";
import type { AddressLookup } from "./useAddressLookup";

export type LookupFormProps = {
  resolvedRue: ResolvedRue | null;
  lookup: AddressLookup;
};

export function LookupForm({ resolvedRue, lookup }: LookupFormProps) {
  const [n, setN] = useState("");
  const [suffix, setSuffix] = useState<LookupSuffixToken | "">("");
  const parsedN = Number(n);
  const hasPositiveN = Number.isInteger(parsedN) && parsedN > 0;
  const canSubmit = canSubmitLookup(resolvedRue) && hasPositiveN;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || resolvedRue === null) return;
    lookup.submit({
      rueId: resolvedRue.rueId,
      n: parsedN,
      suffix: suffix === "" ? undefined : suffix,
    });
  }

  return (
    <form className="lookup-form" onSubmit={handleSubmit}>
      <label htmlFor="lookup-number-input">House number</label>
      <input
        id="lookup-number-input"
        type="number"
        min={1}
        step={1}
        value={n}
        onChange={(e) => setN(e.target.value)}
      />

      <label htmlFor="lookup-suffix-select">Suffix</label>
      <select
        id="lookup-suffix-select"
        value={suffix}
        onChange={(e) =>
          setSuffix(e.target.value as LookupSuffixToken | "")
        }
      >
        <option value="">(none)</option>
        {LOOKUP_SUFFIX_TOKENS.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </select>

      <button type="submit" disabled={!canSubmit || lookup.loading}>
        Look up
      </button>
    </form>
  );
}
