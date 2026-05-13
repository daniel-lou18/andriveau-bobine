declare module "cloudflare:test" {
  interface ProvidedEnv extends Cloudflare.Env {
    /** Injected via `vitest.config.ts` -> `miniflare.bindings`. */
    TEST_MIGRATIONS: import("@cloudflare/vitest-pool-workers").D1Migration[];
  }
}
