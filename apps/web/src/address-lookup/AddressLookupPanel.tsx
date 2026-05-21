import { LOOKUP_SUFFIX_TOKENS } from "@andriveau-bobine/lookup";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AddressLookup } from "../lookup/useAddressLookup";
import { RueSuggestBox } from "../rue-suggest/RueSuggestBox";
import type { RueDisambiguation } from "../rue-suggest/useRueDisambiguation";
import { useAddressLookupForm } from "./useAddressLookupForm";

export type AddressLookupPanelProps = {
  disambiguation: RueDisambiguation;
  lookup: AddressLookup;
};

const NUMBER_INPUT_ID = "lookup-number-input";
const SUFFIX_SELECT_ID = "lookup-suffix-select";
const PROVENANCE_CHECKBOX_ID = "lookup-provenance-checkbox";

export function AddressLookupPanel({
  disambiguation,
  lookup,
}: AddressLookupPanelProps) {
  const form = useAddressLookupForm({
    resolvedRue: disambiguation.resolvedRue,
    lookup,
  });

  return (
    <Card data-testid="address-lookup-panel">
      <CardContent className="flex flex-col gap-6">
        <form className="flex flex-col gap-6" onSubmit={form.handleSubmit}>
          <RueSuggestBox
            disambiguation={disambiguation}
            numberInputId={NUMBER_INPUT_ID}
          />

          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            data-testid="address-lookup-row"
          >
            <Field>
              <FieldLabel htmlFor={NUMBER_INPUT_ID}>Numéro</FieldLabel>
              <Input
                id={NUMBER_INPUT_ID}
                type="number"
                min={1}
                step={1}
                value={form.n}
                disabled={!form.lookupFieldsEnabled}
                onChange={(event) => form.setN(event.target.value)}
                onKeyDown={form.handleNumberKeyDown}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={SUFFIX_SELECT_ID}>Suffixe</FieldLabel>
              <Select
                value={form.suffixSelectValue}
                disabled={!form.lookupFieldsEnabled}
                onValueChange={form.setSuffixFromSelect}
              >
                <SelectTrigger id={SUFFIX_SELECT_ID} className="w-full sm:w-32">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {LOOKUP_SUFFIX_TOKENS.map((token) => (
                    <SelectItem key={token} value={token}>
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Button
              type="submit"
              disabled={!form.canSubmit || lookup.loading}
              aria-busy={lookup.loading || undefined}
              className="w-full sm:w-auto sm:self-end"
            >
              <span
                className="inline-flex size-4 shrink-0 items-center justify-center"
                aria-hidden
              >
                {lookup.loading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SearchIcon className="size-4" />
                )}
              </span>
              Rechercher
              {lookup.loading ? (
                <span className="sr-only">Recherche en cours</span>
              ) : null}
            </Button>
          </div>

          <Field orientation="horizontal">
            <Checkbox
              id={PROVENANCE_CHECKBOX_ID}
              checked={form.provenance}
              onCheckedChange={(checked: boolean) =>
                form.setProvenance(checked === true)
              }
            />
            <FieldLabel htmlFor={PROVENANCE_CHECKBOX_ID}>
              Inclure la provenance des registres
            </FieldLabel>
          </Field>
        </form>
      </CardContent>
    </Card>
  );
}
