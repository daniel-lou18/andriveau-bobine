# Base UI — agent reference

Pinned copy of the upstream [llms.txt](https://base-ui.com/llms.txt) index for `@base-ui/react` (unstyled primitives). Used when building or styling UI in `apps/web`. Not project domain documentation.

| Field | Value |
| --- | --- |
| **Upstream** | https://base-ui.com/llms.txt |
| **Live docs** | https://base-ui.com/react/overview/quick-start |
| **Package** | `@base-ui/react` |
| **Pinned** | 2026-05-20 |
| **Local file** | `llms.txt` (93 lines) |

## Contents

- `llms.txt` — link index to overview, handbook, components, and utilities. Linked `.md` URLs point at live pages on base-ui.com; fetch those when you need full API detail.

The vendored index may lag upstream (e.g. newer release notes appear on the live file before you refresh). Re-run the curl command below before large Base UI work if the pin date is old.

## Refresh

From the repository root:

```bash
curl -fsSL https://base-ui.com/llms.txt -o apps/web/docs/references/base-ui/llms.txt
```

Update the **Pinned** date in this README when you refresh.

## Tailwind note

Upstream docs assume **Tailwind CSS v4** in examples. If `apps/web` still uses Tailwind v3, adapt class names when applying snippets (as noted in `llms.txt`).

## License

Content is © MUI / Base UI contributors. This snapshot is for local development and agent context only.
