# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation or review (HITL) |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

**Usage:** `ready-for-agent` is for issues an agent can implement and merge without a required human gate. `ready-for-human` is for work that should stay in human hands first (design, ADR-sensitive behaviour, UX, or explicit review before merge)—for example vertical slices tagged **HITL** in planning. Both labels exist on the GitHub tracker; keep wording in sync when creating labels with `gh label create`.

Edit the right-hand column to match whatever vocabulary you actually use.
