import { LOOKUP_SUFFIX_TOKENS } from "@andriveau-bobine/lookup";
import { SUGGEST_MIN_LENGTH } from "@andriveau-bobine/suggest";

/** Shown when the API error string is unknown or unmapped. */
export const GENERIC_API_ERROR_FR =
  "Une erreur s'est produite. Veuillez réessayer.";

const SUFFIX_ERROR_EN = `suffix must be one of: ${LOOKUP_SUFFIX_TOKENS.join(", ")} (or omitted for no suffix)`;

/** Exact English API `error` strings → French user copy. */
export const API_ERROR_FR_BY_EN: Readonly<Record<string, string>> = {
  "rue not found": "Rue introuvable.",
  "rueId must be a positive integer":
    "Identifiant de rue invalide.",
  "n must be a positive integer": "Le numéro doit être un entier positif.",
  "provenance must be 0 or 1":
    "Le paramètre de provenance est invalide.",
  "Internal Server Error": "Erreur serveur. Veuillez réessayer plus tard.",
  "invalid JSON body": "Requête invalide.",
  [`Query must contain at least ${SUGGEST_MIN_LENGTH} characters after normalization.`]:
    `Saisissez au moins ${SUGGEST_MIN_LENGTH} caractères après normalisation.`,
  [SUFFIX_ERROR_EN]:
    "Le suffixe doit être l'un des suivants : bis, ter, quater, quinquies, sexies, septies (ou laissé vide).",
};

/**
 * Maps an English API `{ error }` string (and optional HTTP status) to French
 * copy for the UI. Internal logs and API bodies stay English.
 */
export function mapApiErrorFr(error: string, status?: number): string {
  const trimmed = error.trim();
  const exact = API_ERROR_FR_BY_EN[trimmed];
  if (exact) return exact;

  if (trimmed.startsWith("HTTP ")) {
    const code = status ?? parseHttpStatus(trimmed);
    if (code !== undefined) return mapHttpStatusFr(code);
    return GENERIC_API_ERROR_FR;
  }

  if (status !== undefined) {
    const byStatus = mapHttpStatusFr(status);
    if (byStatus !== GENERIC_API_ERROR_FR) return byStatus;
  }

  return GENERIC_API_ERROR_FR;
}

function parseHttpStatus(message: string): number | undefined {
  const match = /^HTTP (\d+)/.exec(message);
  if (!match) return undefined;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : undefined;
}

function mapHttpStatusFr(status: number): string {
  if (status === 404) return "Ressource introuvable.";
  if (status === 400) return "Requête invalide.";
  if (status >= 500) return "Erreur serveur. Veuillez réessayer plus tard.";
  if (status >= 400) return "Requête invalide.";
  return GENERIC_API_ERROR_FR;
}
