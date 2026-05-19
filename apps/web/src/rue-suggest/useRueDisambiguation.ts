import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  SUGGEST_MIN_LENGTH,
  toResolvedRue,
  type ResolvedRue,
  type RueSuggestion,
} from "@andriveau-bobine/disambiguation";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { canSubmitLookup } from "./handoff";
import { rueSuggestionsQueryOptions } from "./rueSuggestionsQuery";

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
  const [resolvedRue, setResolvedRue] = useState<ResolvedRue | null>(null);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, DEBOUNCE_MS);
  const searchEnabled =
    resolvedRue === null && debouncedQuery.length >= SUGGEST_MIN_LENGTH;

  const {
    data: suggestions = [],
    isFetching,
    error: queryError,
  } = useQuery({
    ...rueSuggestionsQueryOptions(debouncedQuery),
    enabled: searchEnabled,
    placeholderData: keepPreviousData,
  });

  function setQuery(value: string) {
    setResolvedRue(null);
    setQueryState(value);
  }

  function selectSuggestion(suggestion: RueSuggestion) {
    const rue = toResolvedRue(suggestion);
    setResolvedRue(rue);
    setQueryState(rue.display);
    onResolved?.(rue);
  }

  function clearResolved() {
    setResolvedRue(null);
  }

  const showSuggestions = searchEnabled;
  const error =
    showSuggestions && queryError instanceof Error ? queryError.message : null;

  return {
    query,
    setQuery,
    suggestions: showSuggestions ? suggestions : [],
    loading: searchEnabled && isFetching,
    error,
    resolvedRue,
    canSubmitLookup: canSubmitLookup(resolvedRue),
    selectSuggestion,
    clearResolved,
  };
}
