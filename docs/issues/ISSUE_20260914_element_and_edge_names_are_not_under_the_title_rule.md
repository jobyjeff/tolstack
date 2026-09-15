---
type: feature
priority: low
status: open
area: docs/authoring
reporter: agent
audience: strategy
---

# Element, node and edge `name`s carry the same bloat the title rule just removed

`stack_title_style_pass` (2026-09-14) put every `title` under a written rule —
`docs/SOP_TOLERANCE_STACK.md`, "Titling an artifact" — and demoted what a title
shed into a new `description`. The rule was scoped to `title` by the handoff and
stops there. The **`name`** field on a stack element, a topology node and a
topology edge is not under it, and carries the identical shapes:

| where | `name` |
|---|---|
| `topology_tan_link_to_pitch_plate_take2.json` : `protrusion` | `worst-case protrusion -- full-diameter shank beyond the modelled clamped stack` (78 chars) |
| `topology_rotor_fastener_length.json` : `washer_nas1149v0332_tt` | `washer thickness, NAS1149V0332H (.032 in), rotor balance-mass bolt` (unit in parentheses) |
| `topology_pitch_link_to_pitch_plate.json` : `shank_out` | `shank out -- full-diameter shank beyond the modelled clamped stack` |

These render as grid row labels and elements-table cells, so the same
wall-of-text complaint applies to them in the same viewer.

**Why this is a strategy question, not a straight repeat of the title pass.**
A title has somewhere to demote to: the nav rail has a hover slot and the pass
added `description` to fill it. A grid row label does **not** — the row is
already dense, hover is taken by the edge hover-card, and `Dimension`/
`StackElement` have no free prose field that a reader sees. So extending the
rule needs a decision about *where the demoted half of a name goes* before any
renaming happens, and possibly none of it should move: a `name` is arguably
closer to a caption than to a title.

Untouched here deliberately: the viewer's grid and row rendering are owned by
the concurrently-active `viewer_dag_spine_layout` and the staged
`viewer_leader_grid_legibility`, and this handoff's scope fenced them off.

Repro: open the topology page on `tan_link_to_pitch_plate_take2`, compare the
now-short nav titles against the row labels beside them.
