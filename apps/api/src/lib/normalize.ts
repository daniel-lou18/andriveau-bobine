/**
 * Aggressive normalization for search keys:
 * - lowercase
 * - strip accents
 * - apostrophes and hyphens become spaces
 * - collapse whitespace
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
