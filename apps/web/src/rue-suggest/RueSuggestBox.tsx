import {
  formatSuggestionLabel,
  type ResolvedRue,
} from "@andriveau-bobine/suggest";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RueDisambiguation } from "./useRueDisambiguation";

export type { ResolvedRue as SelectedRue };

export type RueSuggestBoxProps = {
  /** State from {@link useRueDisambiguation} — parent owns lookup handoff. */
  disambiguation: RueDisambiguation;
};

export function RueSuggestBox({ disambiguation }: RueSuggestBoxProps) {
  const {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    resolvedRue,
    selectSuggestion,
  } = disambiguation;

  return (
    <div className="rue-suggest-box flex flex-col gap-3">
      <label htmlFor="rue-suggest-input" className="text-sm font-medium">
        Street (libellé)
      </label>
      <input
        id="rue-suggest-input"
        type="search"
        autoComplete="off"
        placeholder="Type at least 2 characters…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Searching…
        </p>
      )}
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {suggestions.length > 0 && (
        <ul role="listbox" aria-label="Rue suggestions">
          {suggestions.map((s) => (
            <li key={s.rue_id} role="option" aria-selected="false">
              <button type="button" onClick={() => selectSuggestion(s)}>
                {formatSuggestionLabel(s)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {resolvedRue && (
        <p data-testid="rue-suggest-selected">
          Selected: <strong>{resolvedRue.display}</strong>{" "}
          <code>rue_id={resolvedRue.rueId}</code>
        </p>
      )}
    </div>
  );
}
