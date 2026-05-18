import { useEffect, useRef, useState } from "react";
import {
  formatSuggestionLabel,
  SUGGEST_MIN_LENGTH,
  toResolvedRue,
  type ResolvedRue,
  type RueSuggestion,
} from "@andriveau-bobine/disambiguation";
import { fetchRueSuggestions } from "./api";

/** Debounce window between keystroke and request. */
const DEBOUNCE_MS = 150;

export type { ResolvedRue as SelectedRue };

export type RueSuggestBoxProps = {
  onSelect?: (rue: ResolvedRue) => void;
};

export function RueSuggestBox({ onSelect }: RueSuggestBoxProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<RueSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResolvedRue | null>(null);

  // Track the in-flight request so a slow earlier response cannot overwrite
  // a fresher one for a more recent fragment.
  const requestSeq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SUGGEST_MIN_LENGTH) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const result = await fetchRueSuggestions(trimmed, controller.signal);
      if (seq !== requestSeq.current) return;
      if (result.ok) {
        setSuggestions(result.results);
        setError(null);
      } else {
        setSuggestions([]);
        setError(result.error);
      }
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleSelect(s: RueSuggestion) {
    const choice = toResolvedRue(s);
    setSelected(choice);
    setQuery(choice.display);
    setSuggestions([]);
    onSelect?.(choice);
  }

  return (
    <div className="rue-suggest-box">
      <label htmlFor="rue-suggest-input">
        Street (libellé)
      </label>
      <input
        id="rue-suggest-input"
        type="search"
        autoComplete="off"
        placeholder="Type at least 2 characters…"
        value={query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
        }}
      />

      {loading && <p role="status">Searching…</p>}
      {error && <p role="alert">{error}</p>}

      {suggestions.length > 0 && (
        <ul role="listbox" aria-label="Rue suggestions">
          {suggestions.map((s) => (
            <li key={s.rue_id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => handleSelect(s)}
              >
                {formatSuggestionLabel(s)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p data-testid="rue-suggest-selected">
          Selected: <strong>{selected.display}</strong>{" "}
          <code>rue_id={selected.rueId}</code>
        </p>
      )}
    </div>
  );
}
