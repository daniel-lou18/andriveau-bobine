# Agent and contributor guide

This document describes the **andriveau-bobine** monorepo: layout, commands, and conventions. Update it when workflows or tooling change.

## Stack

- **Monorepo:** npm workspaces (`apps/*`).
- **`apps/web`:** React 19 + TypeScript + Vite 8 + **TanStack Query** (`@tanstack/react-query` v5) for server/async state.
- **`apps/api`:** Cloudflare Worker with **Hono**, **Wrangler** (v4), TypeScript. Config in **`wrangler.jsonc`** (preferred over TOML for current Wrangler features and schema support).

## Repository layout

```
apps/
  web/          # Frontend SPA
  api/          # Worker (Hono)
packages/
  suggest/          # @andriveau-bobine/suggest — suggest contract, matching, handoff
  lookup/           # @andriveau-bobine/lookup — lookup contract, assembly, suffix ranks
```
Address extraction mapping rules and domain conventions are documented in **`docs/EXTRACTION.md`**.
**`docs/LLM_EXTRACTION_INTERCHANGE.md`** defines the LLM-facing JSON payload and paper-reading rules before validation and D1 load.
**`docs/LLM_EXTRACTION_PROMPT.md`** — copy-paste prompt for vision/LLM extraction into that JSON.
Register layout notes: **`data/docs/SOURCE_BOBINE8_NDDC_TABLE_MODEL.md`**, **`data/docs/SOURCE_BOBINE43_GRANDES_CARRIERES_TABLE_MODEL.md`**. Scans live under **`data/source-tables/`**; interchange JSON under **`data/extracted-tables/`**.
Domain entities, relations, and lookup optimization are documented in **`docs/DOMAIN_MODEL.md`**.

## Prerequisites

- **Node.js** and **npm** (workspaces require npm at the repository root).
- Install dependencies once from the **repository root:**

  ```bash
  npm install
  ```

## Commands (from repository root)

| Script              | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev:web`   | Start Vite dev server for `apps/web`.                           |
| `npm run dev:api`   | Start `wrangler dev` for `apps/api`.                            |
| `npm run build`     | Run each workspace’s `build` script if present.                 |
| `npm run test:web`    | Vitest suite for `apps/web` (happy-dom + Testing Library).      |
| `npm run test:lookup` | Vitest suite for `packages/lookup` (assembly, parse, suffix).   |
| `npm run test:suggest` | Vitest suite for `packages/suggest` (match, prefix expand).      |
| `npm run types:api`   | Regenerate Worker TypeScript types (`wrangler types` in `api`). |

## Commands (inside each app)

**`apps/web`**

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Vite dev server (default port **5173**). |
| `npm run build`   | `tsc -b` then production bundle.         |
| `npm run lint`        | ESLint.                                  |
| `npm run preview`     | Preview production build locally.        |
| `npm run test`        | Vitest (`vitest.config.ts`, happy-dom).  |
| `npm run test:watch`  | Same suite in watch mode.                |

**`apps/api`**

| Script                      | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`               | `wrangler dev` (default local URL typically **http://127.0.0.1:8787**). |
| `npm run deploy`            | Deploy Worker to Cloudflare.                                            |
| `npm run types`             | Regenerate **`worker-configuration.d.ts`** from `wrangler.jsonc`.       |
| `npm run check`             | `wrangler deploy --dry-run` (validate deploy without publishing).       |
| `npm run typecheck`         | `tsc --noEmit` for the Worker source.                                   |
| `npm run db:generate`       | `drizzle-kit generate` — SQL + `meta/` from `src/db/schema.ts`.         |
| `npm run db:migrate:local`  | Apply `drizzle/*.sql` to **local** D1.                                  |
| `npm run db:migrate:remote` | Apply to **remote** D1.                                                 |
| `npm run db:studio`         | Drizzle Studio.                                                         |
| `npm run loader:run`      | POST a file to **`POST /api/_loader/extraction`** (requires **`npm run dev`** and **`LOADER_TOKEN`**). |
| `npm run test`              | Worker Vitest suite (uses `@cloudflare/vitest-pool-workers`; applies `drizzle/*.sql` to an isolated D1 via `test/apply-migrations.ts`). |
| `npm run test:watch`        | Same suite in watch mode. |

Workspace-aware variants from root: `npm run <script> -w web` or `-w api`.

### Extraction loader (local)

1. Apply migrations: `npm run db:migrate:local -w api`.
2. Set **`LOADER_TOKEN`** in **`apps/api/.dev.vars`** (same value you pass to the CLI).
3. Start the Worker: `npm run dev:api` (or `npm run dev -w api`).
4. Load JSON: `npm run loader:run -w api -- --file ../../data/extracted-tables/bobine8-extraction.json --token <LOADER_TOKEN>`.

See **`docs/EXTRACTION.md`** (Loader Field Mapping) and **`docs/adr/0004`**–**`0006`** for semantics. Each load **replaces** all rows for that file’s `document_scope.bobine` (`DELETE` cascades segments and `segment_ilots`).

## Local development

1. **API:** From root, `npm run dev:api` (or `cd apps/api && npm run dev`).
2. **Web:** From root, `npm run dev:web` (or `cd apps/web && npm run dev`).

**Vite proxy:** Requests from the browser to paths starting with **`/api`** are proxied to the Worker at **`http://127.0.0.1:8787`**. Use relative URLs such as `fetch("/api/...")` during local dev so the proxy applies.

**CORS:** The Worker enables CORS for common Vite dev origins (`localhost` / `127.0.0.1` on port **5173**). Tighten or extend this when production origins are known.

## Cloudflare Worker (`apps/api`)

- **Entry:** `src/index.ts` (must match `main` in `wrangler.jsonc`).
- **Types:** Runtime and `Env` typings live in **`worker-configuration.d.ts`**, generated by **`npm run types`** (Wrangler **`wrangler types`**). **Re-run `npm run types`** (or root **`npm run types:api`**) after any change to **`wrangler.jsonc`** that affects bindings, variables, or compatible runtime options reflected in types.
- **Do not** hand-edit **`worker-configuration.d.ts`**; regenerate it.
- **Secrets:** Use Wrangler secrets / **`.dev.vars`** for local secrets. **`.dev.vars`** and **`.wrangler`** are gitignored; never commit secrets.
- **Compatibility:** Set `compatibility_date` in `wrangler.jsonc` to a current date when starting out; bump it deliberately when adopting newer platform behavior.

## D1 and Drizzle (`apps/api`)

- **ORM:** [Drizzle](https://orm.drizzle.team/) with the **D1** driver (`drizzle-orm/d1`). DB client: `createDb(env.DB)` in `src/db/index.ts`. Table modules live under **`src/db/schemas/`**; **`src/db/schema.ts`** re-exports them explicitly (do not use `export *` for Kit). **`drizzle.config.ts`** points at **`./src/db/schema.ts`**.
- **Wrangler binding:** `wrangler.jsonc` declares `d1_databases` with binding **`DB`** and `migrations_dir` **`drizzle`**. After changing bindings, run **`npm run types`** in `apps/api` (or **`npm run types:api`** from the root).
- **Create the remote database:** From `apps/api`, run `npx wrangler d1 create andriveau-bobine` (auth required), then set `database_id` in `wrangler.jsonc` to the returned UUID. Until then, local dev can still use **`wrangler dev`** with a placeholder id for the **local** D1 simulation.

### Schema change → migration (Drizzle Kit)

1. Edit **`src/db/schemas/*.ts`** and export from **`src/db/schema.ts`** as needed.
2. From **`apps/api`**, run **`npm run db:generate`** (`drizzle-kit generate`).

**What Kit writes (commit all of it together):**

- A new SQL file: **`drizzle/NNNN_<generated_tag>.sql`**
- **`drizzle/meta/_journal.json`** — new entry whose **`tag`** matches that SQL filename **without** `.sql`
- **`drizzle/meta/NNNN_snapshot.json`** — full schema snapshot; its **`prevId`** must chain from the previous snapshot’s **`id`** (Kit does this when the chain is healthy)

If **`db:generate`** proposes replaying old changes or duplicate migrations, the snapshot/journal chain is out of sync with reality — fix **`meta/`** and existing SQL before applying new migrations; do not stack conflicting `NNNN_*.sql` files.

**Optional polish after generate:**

- Rename **`NNNN_*.sql`** to a descriptive slug (e.g. `0011_street_segments_type_inferred.sql`). Then set the journal **`tag`** for that entry to the **same** basename (no `.sql`). Keep snapshot filename **`NNNN_snapshot.json`** aligned with the migration **number** `NNNN`.
- For SQLite/D1, prefer literal **`DEFAULT 0`** / **`DEFAULT 1`** in SQL for boolean columns over **`DEFAULT false`/`true`** if you touch the file by hand (Drizzle schema can still use **`integer(..., { mode: "boolean" }).default(false)`**).

### Apply migrations

- **`npm run db:migrate:local`** — apply to **local** D1 (Wrangler).
- **`npm run db:migrate:remote`** — apply to **remote** D1 (after `database_id` is correct).

### Hand-authored SQL

Some migrations are easier to write or reorder by hand (large rebuilds, seeds inlined in SQL). If you **do not** use `db:generate` for a new version, you must still add matching **`drizzle/NNNN_….sql`**, a **`meta/_journal.json`** entry, and a correct **`meta/NNNN_snapshot.json`** chain yourself, or the next `db:generate` will drift. Prefer Kit when a clean diff from `schema.ts` is enough.

### Other

- **Commit** everything under **`apps/api/drizzle/`** (SQL + **`meta/`**) with the schema TypeScript changes.
- **Remote push (optional):** To use `drizzle-kit push` / HTTP against remote D1, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` in **`apps/api/.env`** (gitignored). `drizzle.config.ts` loads them via `dotenv`.
- **`npm run db:studio`** — Drizzle Studio (optional inspection).

## Frontend (`apps/web`)

- **UI redesign (French client, shadcn + Base UI Autocomplete):** see **`docs/slices/web-ui.md`** and **ADR-0007**. User-facing copy is French; code and API errors stay English (map errors in the web app).
- **Env:** Public configuration for the browser should use Vite’s **`import.meta.env`** and variables prefixed with **`VITE_`** when you add them. Do not put secrets in `VITE_*` variables.
- **Production API URL:** Define how the SPA talks to the Worker in production (e.g. `VITE_API_URL` or same-origin routing on Cloudflare Pages); the Vite proxy applies **only** in dev.

### Server state (TanStack Query)

The SPA uses **TanStack Query v5** for reads from the Worker. **`QueryClientProvider`** wraps the app in **`src/main.tsx`** (global default: **`refetchOnWindowFocus: false`**).

**Layout (per feature slice, e.g. `src/rue-suggest/`):**

| Piece | Role |
| ----- | ---- |
| **`api.ts`** | Plain `fetch` to `/api/...` (relative URLs so the Vite proxy applies in dev). Returns a typed result or throws only at the HTTP layer — not React Query yet. |
| **`*Query.ts`** | **`queryOptions` factory** + hierarchical **`queryKey`** (see `rueSuggestionsQuery.ts`). **`queryFn`** receives **`signal`** from Query and passes it to `fetch`; map API failures to **`throw new Error(...)`** so Query owns error state. Set per-query options here (`staleTime`, `retry: false` for typeahead, etc.). |
| **Hook** | **`useQuery({ ...featureQueryOptions(arg), enabled, placeholderData })`** plus local React state for UI-only concerns (input text, selection, modals). |
| **`index.ts`** | Re-export public hooks, components, and query keys/options when other modules need prefetch or tests. |

**Conventions:**

- Prefer **`queryOptions()`** + spread in **`useQuery`** over inline query objects — keeps keys, fetchers, and defaults composable and testable.
- Use stable **query key factories** (`all` → scoped segments, e.g. `["rues", "suggest", q]`).
- **Do not** hand-roll `useEffect` + `fetch` for Worker reads; use Query (cancellation via **`signal`**, deduping, cache, error/loading flags).
- **Debounced search:** React Query has no debounce — pair **`useDebouncedValue`** (`src/lib/useDebouncedValue.ts`) with **`enabled: debouncedInput.length >= min`** (see `useRueDisambiguation.ts`).
- **Typeahead UX:** **`placeholderData: keepPreviousData`** avoids list flicker while the debounced term changes; hide results with **`enabled`** or derived UI when a choice is resolved (do not rely on clearing cache alone).
- **Split state:** server lists/errors/loading from Query; resolution, draft input, and “can submit” from the hook’s **`useState`** (ADR-0002 handoff in `rue-suggest/handoff.ts`).
- New features that only **mutate** server data should use **`useMutation`** with **`queryClient.invalidateQueries`** on the relevant keys (none in the repo yet).

**Reference implementation:** `src/rue-suggest/` (`rueSuggestionsQuery.ts`, `useRueDisambiguation.ts`, `useRueDisambiguation.test.tsx`).

## TypeScript and code style

- **ES modules:** `"type": "module"` is used where relevant; prefer `import` / `export`.
- **API Worker:** `tsconfig.json` includes **`worker-configuration.d.ts`** and `src/**/*.ts`. Use **`Cloudflare.Env`** (or the generated `Env`) for Hono `Bindings` where appropriate.
- **Web:** Follow the existing Vite + React strict patterns in `tsconfig.app.json`.
- Prefer **small, focused changes**; match existing naming and structure in each app.

## Testing (API)

- **Harness:** `apps/api/vitest.config.ts` uses `@cloudflare/vitest-pool-workers`. Tests live under **`apps/api/test/`** and run inside a Workers runtime against an in-memory D1 with `drizzle/*.sql` applied by **`test/apply-migrations.ts`**.
- **Conventions:** name files `*.test.ts`; reset any seeded rows in `beforeEach`/`afterEach` (the D1 is shared across tests in a file). Use `SELF.fetch("https://example.com/api/...")` to drive the Worker end-to-end.
- **Adding tests:** prefer integration-style HTTP tests over isolated unit tests; assert public JSON shape and HTTP status rather than internal SQL strings (see `apps/api/test/rues_suggest.test.ts`).

## Testing (Web)

- **Harness:** `apps/web/vitest.config.ts` merges the Vite config; **happy-dom** + **@testing-library/react** (`renderHook`, `waitFor`).
- **Conventions:** colocate `*.test.tsx` next to the module. For hooks using Query: wrap in **`QueryClientProvider`** with a test **`QueryClient`** (`retry: false`, `gcTime: Infinity`); mock the **`api.ts`** fetcher, not `useQuery`. Use fake timers when testing debounced queries (`vi.useFakeTimers({ shouldAdvanceTime: true })`). See **`src/rue-suggest/useRueDisambiguation.test.tsx`**.

## Git and ignored files

Root **`.gitignore`** includes `node_modules`, build outputs, `.wrangler`, `.`, env files, logs, and coverage. **`worker-configuration.d.ts`** is **tracked** so everyone and CI share the same generated binding types; refresh it with **`npm run types:api`** when `wrangler.jsonc` changes.

## Agent skills

### Issue tracker

GitHub Issues in this repository (`gh` from a clone of `origin`). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical names match GitHub label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Conventions for agents

- Run **`npm install`** from the **root** after dependency changes in any workspace.
- After editing **`apps/api/wrangler.jsonc`**, run **`npm run types:api`** and commit the updated **`worker-configuration.d.ts`** if bindings or generated types changed.
- Prefer **root scripts** (`dev:web`, `dev:api`) for consistency unless debugging inside one app.
- **Web reads:** add Worker `fetch` in `api.ts`, `queryOptions` + keys in a `*Query.ts` file, consume via **`useQuery`** in a hook — follow **`src/rue-suggest/`** and the **Server state (TanStack Query)** section above.
- Document new env vars, ports, or deploy steps in this file when they become part of normal workflow.
