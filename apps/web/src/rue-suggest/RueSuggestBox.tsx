import {
  formatSuggestionLabel,
  type ResolvedRue,
} from "@andriveau-bobine/suggest";
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
    <div className="rue-suggest-box">
      <label htmlFor="rue-suggest-input">Street (libellé)</label>
      <input
        id="rue-suggest-input"
        type="search"
        autoComplete="off"
        placeholder="Type at least 2 characters…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p role="status">Searching…</p>}
      {error && <p role="alert">{error}</p>}

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
