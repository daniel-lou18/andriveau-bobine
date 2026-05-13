import { applyD1Migrations, env } from "cloudflare:test";

// Setup files run outside per-test-file storage isolation and may be re-run.
// `applyD1Migrations()` only applies migrations not yet recorded, so it is
// safe to invoke unconditionally here.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
