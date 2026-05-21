# Web UI — shadcn + Base UI Autocomplete

Implementation notes for the **French client-facing** address lookup UI in `apps/web`. Related: [ADR-0007](../adr/0007-base-ui-autocomplete-and-shadcn-elsewhere.md), [ADR-0002](../adr/0002-strict-lookup-api-with-rue-id.md), [ADR-0003](../adr/0003-lookup-response-shape-deduped-with-conflict-flag.md), [`rue-suggest.md`](./rue-suggest.md), [`rue-lookup.md`](./rue-lookup.md), [`CONTEXT.md`](../../CONTEXT.md) (Product conventions — French UI).

Pinned third-party references: `apps/web/docs/references/shadcn/`, `apps/web/docs/references/base-ui/`.

**Status:** PRD [#15](https://github.com/daniel-lou18/andriveau-bobine/issues/15) **complete** (slices #16–#19, PRs #20–#23). Legacy v1 demo markup removed.

---

## What was delivered

A **French UI** for bobine address lookup, styled with **Andriveau** brand tokens on shadcn primitives:

1. **Page shell** — `AppNavbar` (sticky navy bar) + `AppShell`, `<html lang="fr">`, centered `max-w-2xl` column, French `h2` + gold accent.
2. **Unified search card** — `AddressLookupPanel`: rue Autocomplete + numéro/suffixe/submit + provenance checkbox.
3. **Results region** — `LookupResultsPanel`: always mounted; idle, loading, error, no-match, **Conflit**, match cards, provenance collapsibles.
4. **French error mapping** — `mapApiErrorFr` in query layers (`rueSuggestionsQuery`, `lookupQuery`).
5. **French display formatters** — `formatLookupFr.ts` for match cards and provenance (package `@andriveau-bobine/lookup` formatters stay English).
6. **Hooks unchanged** — `useRueDisambiguation`, `useAddressLookup`; TanStack Query + debounce + `keepPreviousData` for suggest.

User-visible copy is **French**; code, tests, logs, and API `error` bodies stay **English**. **`rue_id` never appears in the UI** (ADR-0002 opaque handoff).

---

## Design system (foundation)

| Setting | Value |
|--------|--------|
| Tailwind | **v4** |
| shadcn style | **`radix-vega`** in `components.json` (shadcn v4 name for the default style; ADR-0007 says “default”) |
| Base color | **`neutral`** |
| Theming | **`cssVariables: true`**, light-first (no dark-mode toggle in v1) |
| Path alias | `@/` → `src/` |
| Primitives dir | `src/components/ui/` (shadcn CLI) |

### shadcn components (installed)

`card`, `field`, `label`, `input`, `input-group`, `select`, `button`, `checkbox`, `alert`, `empty`, `skeleton`, `collapsible`, `separator` (+ `textarea` pulled in by input-group). Optional `badge` / shadcn `spinner` not installed; loading spinners use Lucide + `animate-spin`.

**Skip v1:** `combobox`, `command`, `table`, `data-table`, `dialog`, `sheet`, `toast`/`sonner`, `sidebar`, `tabs`.

**Rue field:** `@base-ui/react` `Autocomplete` in `RueSuggestBox` — not shadcn Combobox (ADR-0007). Clear control uses Base UI `Autocomplete.InputGroup`; shadcn `input-group` is installed but unused on the rue field.

### Andriveau brand tokens (v1)

Source of truth: `apps/web/src/index.css` (`:root` variables). Colors are adapted from the client **WordPress / Elementor** kit (`--e-global-color-*`). This app is an **internal tool** — we take brand colors and display typography, not marketing layouts (heroes, watermarks, square form chrome, 18px body scale).

#### Color map (Elementor → app)

| Elementor token | Hex (reference) | App CSS variable | Tailwind usage | Notes |
|-----------------|-----------------|------------------|----------------|-------|
| `--e-global-color-primary` | `#00263E` | `--primary` | `bg-primary`, `text-primary`, … | `oklch(0.2574 0.0611 242.01)`. Navy: navbar, primary button, checked checkbox, section `h2`. |
| (text on primary) | `#FFFFFF` | `--primary-foreground` | `text-primary-foreground` | Near-white on navy (`oklch(0.985 0 0)`). Navbar `h1`, button labels. |
| `--e-global-color-text` | `#7A7A7A` | `--muted-foreground` | `text-muted-foreground` | `oklch(0.5795 0 0)`. Labels, subtitles, card secondary lines, placeholders tone. |
| `--e-global-color-accent` | `#FFB81C` | `--brand-gold` | `bg-brand-gold`, `text-brand-gold` | `oklch(0.8277 0.1667 79.6)`. **Not** mapped to shadcn `--accent` (see below). |
| `--e-global-color-secondary` | `#54595F` | — | — | **Not integrated v1.** shadcn `--secondary` stays neutral gray (alt button surface). |
| `--e-global-color-fa1201a` | `#FFFFFF` | `--background` | `bg-background` | Page/cards stay white. |

**Do not** put client gold on `--accent` / `--accent-foreground`. In shadcn, `accent` means subtle hover surfaces (Autocomplete highlight, select focus row). Client “accent” gold uses **`--brand-gold`** only.

**Leave neutral (shadcn defaults):** `--border`, `--input`, `--ring`, `--muted`, `--secondary` — unchanged when primary changes hue (same pattern as indigo/cyan themes on a neutral base).

**Sidebar tokens:** `--sidebar-primary` mirrors `--primary` for future sidebar use; no sidebar UI in v1.

#### Typography

| Role | Font | CSS | Tailwind | Use in app |
|------|------|-----|----------|------------|
| UI / body | **Raleway** (400, 500) | `--font-sans` | `font-sans` (default on `html`) | Inputs, labels, buttons, results body, `text-sm` helpers |
| Display | **Cormorant Garamond** (600) | `--font-heading` | `font-heading` | Navbar `h1`, page `h2`, shadcn `CardTitle` / `EmptyTitle` |

Packages: `@fontsource/raleway`, `@fontsource/cormorant-garamond` (imports in `index.css`). **Do not** use marketing scale on forms (no 18px body, no uppercase + wide tracking on field labels).

#### Brand chrome (components)

| Piece | File | Brand cues |
|-------|------|------------|
| Sticky navbar | `components/AppNavbar.tsx` | `bg-primary`, logo (`src/assets/images/logo-andriveau.png`), centered `h1` (`font-heading`, uppercase, `tracking-[1.8px]`), gold hamburger placeholder (`text-brand-gold`) |
| Content header | `components/AppShell.tsx` | `h2` (`font-heading`, `text-primary`, uppercase), short gold rule (`bg-brand-gold`) |
| Forms / results | shadcn + Base UI | Inherit tokens; no per-feature hex |

#### v1 brand out of scope

- Elementor `secondary` gray on shadcn `--secondary`
- Crest / watermark backgrounds, full-bleed navy heroes, footer blocks
- Gold primary submit (navy `Button` default is intentional)
- Dark-mode brand pass (`--brand-gold` not duplicated under `.dark`)
- Tinted `--ring` toward navy (optional later)

---

## Folder map

```text
src/
  address-lookup/     # AddressLookupPanel, useAddressLookupForm (composition)
  rue-suggest/        # useRueDisambiguation, RueSuggestBox, api, query
  lookup/             # useAddressLookup, LookupResultsPanel, api, query
  components/         # AppShell, AppNavbar + ui/ shadcn primitives
  assets/images/      # logo-andriveau.png
  lib/                # mapApiErrorFr, formatLookupFr, useDebouncedValue
```

| Module | Role |
|--------|------|
| `useRueDisambiguation` | Debounced suggest query, `resolvedRue` handoff, `canSubmitLookup` |
| `useAddressLookup` | Submit-driven lookup query; `result`, `loading`, `error`, `submit`, `clear` |
| `useAddressLookupForm` | Local form state (n, suffix, provenance), submit handlers, Enter on numéro |
| `RueSuggestBox` | Base UI Autocomplete presentation for rue (PRD name was `RueAutocompleteField`) |
| `AddressLookupPanel` | Single shadcn Card composing search + lookup row |
| `LookupResultsPanel` | French results states (replaces removed `LookupResultBox`) |
| `mapApiErrorFr` | English API errors → French user strings |
| `formatLookupFr` | `formatLookupIlotFr`, `formatLookupLocationFr`, `formatLookupProvenanceFr` |
| `AppNavbar` | Sticky navy bar: logo, page `h1`, menu placeholder |
| `AppShell` | Below nav: `h2` + gold accent, main column |

---

## Page shell (`AppNavbar` + `AppShell`)

- **`AppNavbar`:** `sticky top-0`, full-width `bg-primary`, `max-w-8xl` inner grid — logo (home link), centered page title (`h1`), right slot (hamburger placeholder). Title copy: *Recensement de population de Paris - 1946*.
- **`AppShell`:** `min-h-screen`, `bg-background`, centered `max-w-2xl` column — `h2` *Rechercher un numéro d'îlot.* (`text-primary`, `font-heading`, uppercase), short `bg-brand-gold` rule, then `main`.
- `<html lang="fr">` in `index.html`.
- `App.tsx` composes `AppShell` → `AddressLookupPanel` + `LookupResultsPanel`.

---

## Address search card (`AddressLookupPanel`)

Single shadcn `Card` composing rue Autocomplete + lookup fields via `useAddressLookupForm`.

### Row layout

1. **Rue** — `RueSuggestBox` (Base UI Autocomplete), full width, label *Rue*, placeholder « Saisir au moins 2 caractères… »
2. **Grid row** — *Numéro* (`#lookup-number-input`, grow) | *Suffixe* (`Select`, fixed width) | **Rechercher** — Numéro/Suffixe/Rechercher **disabled** until `resolvedRue` (`canSubmitLookup` + positive integer for submit)
3. **Checkbox** — *Inclure la provenance des registres* (always enabled; sets `?provenance=1` on next lookup)

Responsive: at narrow breakpoints, row 2 stacks (number → suffix → full-width button). Tab order in DOM: Rue → Numéro → Suffixe → Rechercher → Provenance (checkbox after button).

### Rue Autocomplete (`RueSuggestBox`)

After the user picks a suggestion:

- Close the suggestion list.
- Set `resolvedRue` and fill input with canonical display.
- **Auto-focus** `#lookup-number-input`.
- Input stays **editable**; no « Changer la rue » button.
- **Clear control** (×), `aria-label="Effacer la rue"`.
- Any edit via `setQuery` clears `resolvedRue` and disables row 2 again.

Popup: « Recherche… » while fetching; « Aucune rue trouvée » when empty.

### Rechercher button (loading UX)

Stable width — no layout shift in the grid:

| State | Icon slot (fixed `size-4`) | Label | A11y |
|-------|---------------------------|-------|------|
| Idle | Lucide **Search** (loupe) | Rechercher | — |
| Loading | Lucide **Loader2** (`animate-spin`) | Rechercher (unchanged) | `aria-busy="true"`, sr-only « Recherche en cours », disabled |

Results panel also shows `Skeleton` while lookup runs (`aria-label="Recherche en cours…"`).

### Keyboard

| Context | Enter |
|---------|--------|
| Autocomplete popup **open** | Select highlighted item only (Base UI); focus moves to numéro |
| Autocomplete popup **closed** | **No submit** — `preventDefault` on rue input (`RueSuggestBox`) |
| House number | Submit lookup when `canSubmit` |
| **Rechercher** | Same as number Enter |

**Mental model:** Numéro (and Rechercher) are the “run search” controls. Rue with closed list is the “pick or change street” step — Enter must not launch lookup even if numéro is already filled. After changing numéro, user re-searches from numéro or Rechercher, not from rue.

---

## Results panel (`LookupResultsPanel`)

Always mounted below the search card (`App.tsx`).

| State | UI |
|-------|-----|
| Idle (no submit yet) | shadcn `Empty` — « Choisissez une rue et un numéro, puis lancez la recherche. » |
| Loading | `Skeleton` placeholders |
| Error | destructive `Alert` — French via `mapApiErrorFr` |
| `matches.length === 0` | `Empty` — « Aucun segment des bobines ne couvre cette adresse sur la rue choisie. » |
| `conflict: true` | `Alert` — title **Conflit**; body references disagreeing bobine sources on îlot |
| Success | One shadcn **Card** per deduped match |

### Match card

Per triple `(arrondissement, quartier, ilot)`:

- **Hero:** `formatLookupIlotFr` — e.g. **Îlot 4121** (large type).
- **Secondary:** `formatLookupLocationFr` — e.g. `6ᵉ arrondissement — Notre-Dame-des-Champs`.

### Provenance

When `?provenance=1` and match has rows: per-match **`Collapsible`** — « Provenance (N) », items via `formatLookupProvenanceFr` (`bobine`, page, seq, `raw_text`).

### Conflict copy

- Title: **Conflit**
- Body: « Plusieurs bobines ne concordent pas sur l'îlot pour cette adresse. » (aligns with `CONTEXT.md` **Conflict** — not “ambiguous”.)

### French strings (reference)

| Key | French |
|-----|--------|
| Idle results | « Choisissez une rue et un numéro, puis lancez la recherche. » |
| No match | « Aucun segment des bobines ne couvre cette adresse sur la rue choisie. » |
| Suggest loading | « Recherche… » |
| Lookup loading (results) | « Recherche en cours… » (skeleton `aria-label`) |
| Lookup loading (button) | Visible label stays **Rechercher**; sr-only « Recherche en cours » |

---

## API errors → French (`mapApiErrorFr`)

Worker returns English `{ "error": string }`. Mapping in `*Query.ts` `queryFn` before `throw new Error(...)`; components only receive French messages. Unknown errors → « Une erreur s'est produite. Veuillez réessayer. »

Do **not** change API error strings for localization; extend `API_ERROR_FR_BY_EN` in `lib/mapApiErrorFr.ts` when new validation messages appear.

---

## Delivery history

PRD phasing was **foundation + feature**; delivered as **four PRs** (reviewable vertical slices):

| Issue | PR | Scope |
|-------|-----|--------|
| #16 Slice 1 | #20 | Tailwind v4, shadcn init, `mapApiErrorFr`, `AppShell`, global styles |
| #17 Slice 2 | #21 | Base UI `RueSuggestBox`, rue suggest tests |
| #18 Slice 3 | #22 | `AddressLookupPanel`, `useAddressLookupForm`; removed `LookupForm` |
| #19 Slice 4 | #23 | `LookupResultsPanel`, `formatLookupFr`; removed `LookupResultBox` |

Post-merge polish (same branch / follow-up): story 10 (Enter in rue when popup closed), story 15 (Rechercher loading icon slot + loupe/spinner swap).

**Removed legacy UI:** `LookupForm`, `LookupResultBox`, English demo chrome, visible debug identifiers.

---

## Testing

**57 tests** in `npm run test:web` (Vitest + happy-dom + Testing Library).

| Module | File | Covers |
|--------|------|--------|
| `mapApiErrorFr` | `lib/mapApiErrorFr.test.ts` | Known English keys → French; HTTP fallbacks |
| `formatLookupFr` | `lib/formatLookupFr.test.ts` | îlot, location, provenance French strings |
| `useRueDisambiguation` | `rue-suggest/useRueDisambiguation.test.tsx` | Handoff, debounce, French errors |
| `useAddressLookup` | `lookup/useAddressLookup.test.tsx` | Submit, clear, provenance, French errors |
| `RueSuggestBox` | `rue-suggest/RueSuggestBox.test.tsx` | French labels, select/close, focus, clear, Enter in open list |
| `AddressLookupPanel` | `address-lookup/AddressLookupPanel.test.tsx` | Disabled until resolved, submit, Enter on numéro, Enter blocked on rue (closed list), provenance, button loading |
| `LookupResultsPanel` | `lookup/LookupResultsPanel.test.tsx` | Idle, loading, error, empty, conflict, cards, provenance collapsible |

**Conventions:** assert roles, labels, `data-testid`, and visible French text — not shadcn class names. Mock `api.ts`, not `useQuery`. Fake timers for debounced suggest.

---

## Out of scope (v1)

- Dark mode toggle.
- `react-i18next` or multi-locale.
- French API validation or error bodies.
- shadcn Combobox for rue suggest.
- Functional nav menu (hamburger is visual placeholder only), auth, toasts.
- Changing lookup/suggest HTTP contracts.
- Renaming `RueSuggestBox` → `RueAutocompleteField` (optional doc/code alignment only).

---

## Related docs to refresh separately

`docs/slices/rue-lookup.md` still references removed `LookupForm` / `LookupResultBox` in places — update when touching that slice doc.
