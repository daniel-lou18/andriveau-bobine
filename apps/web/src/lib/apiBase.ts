/**
 * Worker API URL prefix for browser `fetch`.
 * Dev: unset → relative `/api/...` (Vite proxy to `wrangler dev`).
 * Production (Pages): set `VITE_API_URL` to the Worker origin (no trailing slash).
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${normalizedPath}`;
}
