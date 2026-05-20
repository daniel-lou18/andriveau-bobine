# Base UI Autocomplete for rue suggest; shadcn/ui for all other web chrome

The web app uses **@base-ui/react** `Autocomplete` only for rue disambiguation (typeahead over `/api/rues/suggest`). Every other interactive and layout primitive comes from **shadcn/ui** (Tailwind v4, `default` style, `neutral` base color, CSS variables). We did not install shadcn’s Combobox: Base UI was chosen explicitly for the search control; shadcn covers cards, fields, alerts, results, and the lookup form. Styling the Autocomplete popup uses the same design tokens as shadcn (`bg-popover`, `border-border`, etc.) so the list visually matches the rest of the UI without pulling in a second combobox abstraction.

## Considered Options

- **shadcn Combobox only** — one library, but reinvents wiring we want from Base UI’s Autocomplete primitive and was not the product direction for the rue field.
- **Base UI for everything** — consistent primitives, but duplicates shadcn’s polished defaults and CLI workflow for the majority of the surface (results cards, form chrome).
- **Radix + hand-rolled styles** — rejected; shadcn already encodes the monochrome system we want.

## Consequences

- Two primitive dependencies in `apps/web`; agents should read `docs/slices/web-ui.md` before adding new controls.
- Rue suggest presentation must not migrate to shadcn Combobox without revisiting this ADR.
