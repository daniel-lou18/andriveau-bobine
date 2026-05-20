# Web UI — shadcn + Base UI Autocomplete

Implementation notes for the **French client-facing** address lookup UI in `apps/web`. Related: [ADR-0007](../adr/0007-base-ui-autocomplete-and-shadcn-elsewhere.md), [ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md), [ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md), [`rue-suggest.md`](./rue-suggest.md), [`rue-lookup.md`](./rue-lookup.md), [`CONTEXT.md`](../../CONTEXT.md) (Product conventions — French UI).

Pinned third-party references: `apps/web/docs/references/shadcn/`, `apps/web/docs/references/base-ui/`.

---

## Purpose

Replace the v1 demo markup with a **modern monochrome** UI: one unified **address search** card (rue suggest + number-bearing lookup), a **results** region below, and clear **Conflict** handling. Internal code, API errors, logs, and repo docs stay **English**; all user-visible copy is **French** (see `CONTEXT.md`).

---

## Design system (foundation)

| Setting | Value |
|--------|--------|
| Tailwind | **v4** |
| shadcn style | **`default`** (not `new-york`) |
| Base color | **`neutral`** |
| Theming | **`cssVariables: true`**, light-first (no dark-mode toggle in v1) |
| Path alias | `@/` → `src/` |
| Primitives dir | `src/components/ui/` (shadcn CLI) |

### shadcn components (v1 install batch)

`card`, `field`, `label`, `input`, `input-group`, `select`, `button`, `checkbox`, `alert`, `empty`, `skeleton`, `collapsible`, `separator`. Optional: `badge`, `spinner` if needed for polish.

**Skip v1:** `combobox`, `command`, `table`, `data-table`, `dialog`, `sheet`, `toast`/`sonner`, `sidebar`, `tabs`.

**Rue field:** `@base-ui/react` `Autocomplete` — styled with popover tokens; not shadcn Combobox (ADR-0007).

---

## Folder map

```text
src/
  address-lookup/     # Composition only — unified search card shell
  rue-suggest/        # Hook, query, api, Base UI rue Autocomplete field
  lookup/             # Hook, query, api, lookup fields + results panel
  components/ui/      # shadcn primitives
  lib/                # mapApiErrorFr, French format helpers, useDebouncedValue
```

Hooks and TanStack Query patterns are unchanged (`useRueDisambiguation`, `useAddressLookup`); presentation moves into shadcn/Base UI components. **`rue_id` must never appear in the UI** (ADR-0002 handoff stays opaque).

---

## Page shell

- `min-h-screen`, `bg-background`, centered column `max-w-2xl`, comfortable padding.
- Header: product title **Andriveau-Bobine**, one-line French subtitle (bobine address lookup — not dev-slice wording).
- `Separator` between header and main content.
- `<html lang="fr">` in the SPA host document.

### Results region (always visible — 8a)

Below the search card, a **results section** is always mounted:

| State | UI |
|-------|-----|
| Idle (no submit yet) | shadcn `Empty` — French idle copy |
| Loading | `Skeleton` (and/or spinner on button) |
| Error | `Alert` — French via `mapApiErrorFr` |
| `matches.length === 0` | French no-match message |
| `conflict: true` | `Alert` — **Conflit** + French explanation (domain term) |
| Success | One **Card** per match |

---

## Address search card (`AddressLookupPanel`)

Single shadcn `Card` composing rue Autocomplete + lookup fields.

### Row layout (Option A)

1. **Rue** — Base UI Autocomplete, full width, French label *Rue*, placeholder e.g. « Saisir au moins 2 caractères… »
2. **Grid row** — *Numéro* (grow) | *Suffixe* (`Select`, fixed width) | primary **Rechercher** — **disabled** until `resolvedRue` (`canSubmitLookup`)
3. **Checkbox** — *Inclure la provenance des registres* (always enabled; sets `?provenance=1` on next lookup)

Responsive: at narrow breakpoints, row 2 stacks (number → suffix → full-width button).

### Rue Autocomplete behaviour (post-select)

After the user picks a suggestion:

- Close the suggestion list.
- Set `resolvedRue` and fill input with canonical display (existing hook).
- **Auto-focus** the house number input (`#lookup-number-input` or equivalent).
- Input stays **editable**; no Badge / « Changer la rue » button.
- **Clear control** (×) when value is non-empty — standard reset; clears resolution and re-enables suggest.
- Any edit via `setQuery` clears `resolvedRue` (existing hook) and disables row 2 again.

Popup list: show loading indicator while suggest fetches; French empty line if no results (e.g. « Aucune rue trouvée »).

### Keyboard

| Context | Enter |
|---------|--------|
| Autocomplete popup **open** | Select highlighted item only |
| Autocomplete popup **closed** | No submit |
| House number | Submit lookup when `canSubmit` |
| **Rechercher** | Same as number Enter |

Tab order: Rue → Numéro → Suffixe → Provenance → Rechercher (checkbox before or after button is acceptable; prefer checkbox before button).

---

## Results panel (`LookupResultsPanel`)

Rename/refactor from `LookupResultBox`; French presentation only in the web layer.

### Match card (premium layout)

Per deduped triple `(arrondissement, quartier, ilot)`:

- **Hero:** îlot number (large type).
- **Secondary:** arrondissement ordinal + quartier name.
- Use web-local French formatters (do not change `@andriveau-bobine/lookup` English formatters for internal/tests).

Example line shape: `6ᵉ arrondissement — Notre-Dame-des-Champs` + prominent `Îlot 4121`.

### Provenance

When `?provenance=1` and match has provenance rows: per-match shadcn **`Collapsible`** — summary in French (e.g. « Provenance (N) »), list items from `formatLookupProvenance` adapted to French in web (bobine, page, seq, `raw_text`).

### Conflict copy (French)

- Title: **Conflit**
- Body: multiple **bobine** sources disagree on the **îlot** for this address (align with `CONTEXT.md` **Conflict** definition — not “ambiguous”).

### Other French strings (reference)

| Key | French |
|-----|--------|
| Idle results | e.g. « Choisissez une rue et un numéro, puis lancez la recherche. » |
| No match | « Aucun segment des bobines ne couvre cette adresse sur la rue choisie. » |
| Suggest loading | « Recherche… » |
| Lookup loading | « Recherche en cours… » |

---

## API errors → French (`mapApiErrorFr`)

Worker returns English `{ "error": string }`. The web maps known messages + status to French before showing `Alert`; unknown → generic « Une erreur s’est produite. »

Maintain a **test table** of known API `error` strings (suggest min length, lookup validation, `rue not found`, etc.). Do **not** change API messages for this feature.

Apply mapping in query layers or hooks so components only receive French `error` strings.

---

## Delivery phasing (two PRs)

### PR 1 — Foundation

- Tailwind v4 + shadcn init (`default`, `neutral`, CSS variables).
- Install shadcn component batch; global styles; `@/` alias.
- `docs/slices/web-ui.md`, ADR-0007, `CONTEXT.md` convention (done).
- `mapApiErrorFr` module + unit tests (can be minimal map).
- Optional: minimal French page shell; old UI may remain until PR 2.

### PR 2 — Feature UI

- Base UI Rue Autocomplete wired to `useRueDisambiguation`.
- `address-lookup/AddressLookupPanel`, French lookup results panel.
- Focus handoff, clear button, keyboard table.
- Update/remove debug UI; align tests with French copy and `data-testid` where assertions depend on text.
- Link slice doc from `AGENTS.md` Frontend section.

---

## Testing notes

- **Unit:** `mapApiErrorFr` — known English keys → French strings.
- **Hooks:** keep `useRueDisambiguation` / `useAddressLookup` tests; mock `api.ts`; extend for focus/clear behaviour if tested via RTL.
- **Components:** `LookupResultBox` / results panel — conflict badge, empty, provenance collapsible; use French strings in assertions.
- **Do not** assert on shadcn class names; assert roles, labels, `data-testid`, and visible French text.

Prior art: `useRueDisambiguation.test.tsx`, `LookupResultBox.test.tsx`, `useAddressLookup.test.tsx`.

---

## Out of scope (v1)

- Dark mode toggle.
- `react-i18next` or multi-locale.
- French API `error` bodies.
- shadcn Combobox for rue suggest.
- Sidebar, nav, auth, toasts.
- Changing lookup/suggest HTTP contracts.
