import { useEffect, useState } from "react";

/**
 * Returns `value` after it has been stable for `delayMs`.
 * Used to debounce fast-changing inputs (e.g. search boxes) before firing queries.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
