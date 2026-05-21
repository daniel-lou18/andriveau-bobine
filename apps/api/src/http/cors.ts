/** Origins allowed to call the API from a browser (Pages + local Vite). */
const STATIC_ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://andriveau-bobine.pages.dev",
]);

/** Pages preview deployments: `https://<hash>.andriveau-bobine.pages.dev` */
const PAGES_PREVIEW_HOST_SUFFIX = ".andriveau-bobine.pages.dev";

export function isAllowedCorsOrigin(origin: string): boolean {
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(PAGES_PREVIEW_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function resolveCorsOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  return isAllowedCorsOrigin(origin) ? origin : undefined;
}
