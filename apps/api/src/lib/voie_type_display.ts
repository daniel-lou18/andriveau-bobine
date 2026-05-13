/**
 * Display rule for a canonical `voie_types.code` value (stored lowercase,
 * possibly multi-word, see `docs/DOMAIN_MODEL.md` -> voie_types).
 *
 * v1 rule: title-case each whitespace-separated token. The Q13 capitalization
 * convention is still TBD in the domain model; when it lands, update this
 * single function — no caller should branch on `type` shape.
 *
 * @example
 *  displayVoieType("rue")        // "Rue"
 *  displayVoieType("petite rue") // "Petite Rue"
 *  displayVoieType("cité")       // "Cité"
 */
export function displayVoieType(code: string): string {
  return code
    .split(/\s+/)
    .map((tok) =>
      tok.length === 0 ? tok : tok[0]!.toUpperCase() + tok.slice(1)
    )
    .join(" ");
}
