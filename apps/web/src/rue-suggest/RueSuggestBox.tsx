import {
  formatSuggestionLabel,
  SUGGEST_MIN_LENGTH,
  type RueSuggestion,
} from "@andriveau-bobine/suggest";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { XIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { RueDisambiguation } from "./useRueDisambiguation";

export type { ResolvedRue as SelectedRue } from "@andriveau-bobine/suggest";

export type RueSuggestBoxProps = {
  /** State from {@link useRueDisambiguation} — parent owns lookup handoff. */
  disambiguation: RueDisambiguation;
  /** House-number input to focus after a suggestion is picked. */
  numberInputId?: string;
};

const inputClassName = cn(
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
);

const popupClassName = cn(
  "z-50 w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
);

const listClassName = cn(
  "max-h-[min(22.5rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none"
);

const itemClassName = cn(
  "relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
);

export function RueSuggestBox({
  disambiguation,
  numberInputId = "lookup-number-input",
}: RueSuggestBoxProps) {
  const {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    resolvedRue,
    selectSuggestion,
  } = disambiguation;

  const trimmedQuery = query.trim();
  const searchActive =
    resolvedRue === null && trimmedQuery.length >= SUGGEST_MIN_LENGTH;
  const showEmptyState =
    searchActive && !loading && suggestions.length === 0 && !error;
  const showPopup =
    searchActive && (loading || suggestions.length > 0 || showEmptyState);

  function focusNumberInput() {
    queueMicrotask(() => {
      document.getElementById(numberInputId)?.focus();
    });
  }

  function handleValueChange(
    value: string,
    details: Autocomplete.Root.ChangeEventDetails
  ) {
    if (details.reason === "item-press") {
      const match = suggestions.find(
        (suggestion) => formatSuggestionLabel(suggestion) === value
      );
      if (match) {
        selectSuggestion(match);
        focusNumberInput();
      }
      return;
    }

    if (details.reason === "clear-press" || details.reason === "input-clear") {
      setQuery("");
      return;
    }

    setQuery(value);
  }

  return (
    <Field data-testid="rue-suggest-field">
      <Autocomplete.Root
        items={searchActive ? suggestions : []}
        value={query}
        onValueChange={handleValueChange}
        itemToStringValue={formatSuggestionLabel}
        filter={null}
        open={showPopup ? true : false}
        modal={false}
        autoHighlight
      >
        <FieldLabel htmlFor="rue-suggest-input">Rue</FieldLabel>
        <Autocomplete.InputGroup
          className={cn(
            "relative flex w-full items-center",
            query ? "has-[input]:pr-8" : ""
          )}
        >
          <Autocomplete.Input
            id="rue-suggest-input"
            autoComplete="off"
            placeholder="Saisir au moins 2 caractères…"
            className={inputClassName}
          />
          <Autocomplete.Clear
            className={cn(
              "absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100",
              "data-[visible=false]:pointer-events-none data-[visible=false]:opacity-0"
            )}
            aria-label="Effacer la rue"
          >
            <XIcon className="size-4" aria-hidden />
          </Autocomplete.Clear>
        </Autocomplete.InputGroup>

        <Autocomplete.Portal>
          <Autocomplete.Positioner className="z-50 outline-none" sideOffset={4}>
            <Autocomplete.Popup className={popupClassName}>
              {loading ? (
                <Autocomplete.Status>
                  <div
                    role="status"
                    className="px-2 py-3 text-sm text-muted-foreground"
                  >
                    Recherche…
                  </div>
                </Autocomplete.Status>
              ) : null}
              <Autocomplete.Empty>
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  Aucune rue trouvée
                </div>
              </Autocomplete.Empty>
              <Autocomplete.List className={listClassName}>
                {(suggestion: RueSuggestion) => (
                  <Autocomplete.Item
                    key={suggestion.rue_id}
                    value={suggestion}
                    className={itemClassName}
                  >
                    {formatSuggestionLabel(suggestion)}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
