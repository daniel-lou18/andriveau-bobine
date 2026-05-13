import { rankOfSuffix } from "../lib/suffix";
import type { ParsedEndpoint, ParsedToken } from "./types";
import type { SkipReason } from "./types";

const TOKEN_RE =
  /^(\d+)\s*(bis|ter|quater|quinquies|sexies|septies)?\s*(?:->\s*(\d+)\s*(bis|ter|quater|quinquies|sexies|septies)?)?\s*$/i;

function parseEndpoint(
  nStr: string,
  suffixRaw: string | undefined,
  token: string,
  rejects: Array<{ reason: SkipReason; detail: string }>
): ParsedEndpoint | null {
  const n = Number.parseInt(nStr, 10);
  if (Number.isNaN(n)) {
    rejects.push({
      reason: "EMPTY_OR_UNPARSEABLE_NUMEROS_RAW",
      detail: `Invalid number in token: ${JSON.stringify(token)}`,
    });
    return null;
  }
  const suf = suffixRaw?.toLowerCase() ?? "";
  let rank: number;
  try {
    rank = rankOfSuffix(suf || null);
  } catch {
    rejects.push({
      reason: "UNKNOWN_SUFFIX",
      detail: `Unknown suffix in token: ${JSON.stringify(token)}`,
    });
    return null;
  }
  return { n, suffix: suf || null, rank };
}

function compareEndpoints(a: ParsedEndpoint, b: ParsedEndpoint): number {
  if (a.n !== b.n) return a.n - b.n;
  return a.rank - b.rank;
}

export function parseNumerosRaw(text: string): {
  tokens: ParsedToken[];
  rejects: Array<{ reason: SkipReason; detail: string }>;
} {
  const rejects: Array<{ reason: SkipReason; detail: string }> = [];
  const tokens: ParsedToken[] = [];

  // Hyphen ranges (scribe variant): "75 - 77", "66-86" → canonical `->` before tokenizing.
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/(\d+)\s*-\s*(\d+)/g, "$1 -> $2")
    .trim();
  if (!normalized) {
    rejects.push({
      reason: "EMPTY_OR_UNPARSEABLE_NUMEROS_RAW",
      detail: "Empty numeros_raw",
    });
    return { tokens, rejects };
  }

  const rawTokens = normalized.split(/[,;\/]/).map((t) => t.trim());
  const nonEmpty = rawTokens.filter(Boolean);

  if (nonEmpty.length === 0) {
    rejects.push({
      reason: "EMPTY_OR_UNPARSEABLE_NUMEROS_RAW",
      detail: "No tokens after splitting numeros_raw",
    });
    return { tokens, rejects };
  }

  for (const token of nonEmpty) {
    const t = token.trim();
    if (/^\s*->/.test(t)) {
      rejects.push({
        reason: "OPEN_ENDED_RANGE",
        detail: `Leading arrow without left endpoint: ${JSON.stringify(t)}`,
      });
      continue;
    }
    if (/\+\s*$/.test(t) || /\.\.\./.test(t)) {
      rejects.push({
        reason: "OPEN_ENDED_RANGE",
        detail: `Open-ended notation: ${JSON.stringify(t)}`,
      });
      continue;
    }

    const m = t.match(TOKEN_RE);
    if (!m) {
      rejects.push({
        reason: "EMPTY_OR_UNPARSEABLE_NUMEROS_RAW",
        detail: `Unrecognized house-number token: ${JSON.stringify(t)}`,
      });
      continue;
    }

    const [, n1, suf1, n2, suf2] = m;

    if (n2 === undefined) {
      const ep = parseEndpoint(n1!, suf1, t, rejects);
      if (!ep) continue;
      tokens.push({
        kind: "singleton",
        n: ep.n,
        suffix: ep.suffix,
        rank: ep.rank,
      });
      continue;
    }

    const from = parseEndpoint(n1!, suf1, t, rejects);
    const to = parseEndpoint(n2, suf2, t, rejects);
    if (!from || !to) continue;

    if (from.n % 2 !== to.n % 2) {
      rejects.push({
        reason: "RANGE_ENDPOINT_PARITY_MISMATCH",
        detail: `Range endpoints have different parity: ${JSON.stringify(t)}`,
      });
      continue;
    }

    if (compareEndpoints(to, from) < 0) {
      rejects.push({
        reason: "INVERTED_RANGE",
        detail: `Range endpoints out of order: ${JSON.stringify(t)}`,
      });
      continue;
    }

    tokens.push({ kind: "range", from, to });
  }

  return { tokens, rejects };
}

export function parityForToken(token: ParsedToken): "odd" | "even" {
  if (token.kind === "singleton") {
    return token.n % 2 === 0 ? "even" : "odd";
  }
  return token.from.n % 2 === 0 ? "even" : "odd";
}
