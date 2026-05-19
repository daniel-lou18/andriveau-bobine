import type { ResolvedRue } from "@andriveau-bobine/suggest";

/** True when the user has picked a suggestion and lookup may proceed (ADR-0002). */
export function canSubmitLookup(resolvedRue: ResolvedRue | null): boolean {
  return resolvedRue !== null;
}

/**
 * Opaque `rue_id` for the number-bearing lookup API — never derive this from
 * {@link ResolvedRue.display}.
 */
export function rueIdForLookup(resolvedRue: ResolvedRue): number {
  return resolvedRue.rueId;
}
