import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Used by Drizzle Kit: `generate`, and (with credentials below) `push` / `migrate` / `studio`.
 *
 * Local DB: `npm run db:generate` then `npm run db:migrate:local`. For Drizzle Studio against that
 * same local D1 SQLite file, set `DRIZZLE_STUDIO_DATABASE_URL` — e.g.
 * `file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite`
 * (the larger `*.sqlite` in **miniflare-D1DatabaseObject**, not `metadata.sqlite`).
 * Do not use the sibling `d1/<hash>.sqlite` at the folder root — it can exist empty while the real DB
 * lives under `miniflare-D1DatabaseObject/`; opening the wrong file shows no tables.
 * Paths are relative to `apps/api` when you run Drizzle Kit from there.
 *
 * Remote: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN — see
 * https://orm.drizzle.team/docs/connect-cloudflare-d1
 */
const remoteD1 = Boolean(process.env.CLOUDFLARE_DATABASE_ID);
const localStudioUrl = process.env.DRIZZLE_STUDIO_DATABASE_URL;

export default defineConfig({
  // One entry module with explicit re-exports (`src/db/schema.ts`); add new tables there + under `schemas/`.
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...(remoteD1
    ? {
        driver: "d1-http",
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }
    : localStudioUrl
      ? {
          dbCredentials: {
            url: localStudioUrl,
          },
        }
      : {}),
});
