import { useEffect, useRef, useState } from "react";
import {
  SUGGEST_MIN_LENGTH,
  toResolvedRue,
  type ResolvedRue,
  type RueSuggestion,
} from "@andriveau-bobine/disambiguation";
import { fetchRueSuggestions } from "./api";
import { canSubmitLookup } from "./handoff";

const DEBOUNCE_MS = 150;

export type UseRueDisambiguationOptions = {
  /** Called when the user picks a row from the suggest list. */
  onResolved?: (rue: ResolvedRue) => void;
};

export type RueDisambiguation = {
  query: string;
  setQuery: (value: string) => void;
  suggestions: RueSuggestion[];
  loading: boolean;
  error: string | null;
  /** Set after a list selection; cleared when the user edits the query. */
  resolvedRue: ResolvedRue | null;
  /** Whether number-bearing lookup may be submitted. */
  canSubmitLookup: boolean;
  selectSuggestion: (suggestion: RueSuggestion) => void;
  clearResolved: () => void;
};

/**
 * Rue disambiguation state for ADR-0002: resolve `rue_id` once via suggest,
 * then pass {@link ResolvedRue.rueId} to lookup — never re-parse `display`.
 */
export function useRueDisambiguation(
  options: UseRueDisambiguationOptions = {}
): RueDisambiguation {
  const { onResolved } = options;
  const [query, setQueryState] = useState("");
  const [suggestions, setSuggestions] = useState<RueSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedRue, setResolvedRue] = useState<ResolvedRue | null>(null);

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

  function setQuery(value: string) {
    setResolvedRue(null);
    setQueryState(value);
  }

  function selectSuggestion(suggestion: RueSuggestion) {
    const rue = toResolvedRue(suggestion);
    setResolvedRue(rue);
    setQueryState(rue.display);
    setSuggestions([]);
    setError(null);
    onResolved?.(rue);
  }

  function clearResolved() {
    setResolvedRue(null);
    setSuggestions([]);
    setError(null);
  }

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    resolvedRue,
    canSubmitLookup: canSubmitLookup(resolvedRue),
    selectSuggestion,
    clearResolved,
  };
}
