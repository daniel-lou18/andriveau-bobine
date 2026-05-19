import { useState, type FormEvent } from "react";
import type { ResolvedRue } from "@andriveau-bobine/disambiguation";
import { canSubmitLookup } from "../rue-suggest/handoff";
import type { AddressLookup } from "./useAddressLookup";

export type LookupFormProps = {
  resolvedRue: ResolvedRue | null;
  lookup: AddressLookup;
};

export function LookupForm({ resolvedRue, lookup }: LookupFormProps) {
  const [n, setN] = useState("");
  const parsedN = Number(n);
  const hasPositiveN = Number.isInteger(parsedN) && parsedN > 0;
  const canSubmit = canSubmitLookup(resolvedRue) && hasPositiveN;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || resolvedRue === null) return;
    lookup.submit({ rueId: resolvedRue.rueId, n: parsedN });
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
      <button type="submit" disabled={!canSubmit || lookup.loading}>
        Look up
      </button>
    </form>
  );
}
