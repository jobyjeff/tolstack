---
type: bug
priority: med
status: open
area: feature-identity/v2 bindings
reporter: agent
needs: jeff
ask: Re-bind the tangential link's mount-end outer race outside cylinder; it holds the inner race bore's four faces
found_by: docs/sessions/HANDOFF_20261122_the_tree_sits_beside_the_3d_canvas_and_holds_still.md
todo: 20261125T125730_nqmtnw
---

# The mount-end outer race's outside cylinder holds the inner race bore's four faces

Two of Jeff's 2026-11-23 events bind the same four faces of the MS14101-3
mesh (`34f032f0…`, faces 0, 1, 20, 21) to two different features:

| event | feature | faces |
|---|---|---|
| `0112_tan_link_lower_inner_race_on_mount` | `tan_link_lower_inner_race@tan_link_lower_inner_race_bore` (the inner race's bore) | 0, 1, 20, 21 |
| `0114_tan_link_lower_outer_race_press_fit` | `tan_link_lower_outer_race@tan_link_lower_outer_race_od` (the outer race's outside cylinder) | 0, 1, 20, 21 |

A bore and an outside cylinder of the same bearing cannot be the same faces,
so one of the two picks is wrong -- most likely the second, made five minutes
after the first with the same set still in the pick. Nothing an agent can do
settles it: a binding is a person's (`docs/ANNOTATION_SURFACE.md`).

Since handoff `the_tree_sits_beside_the_3d_canvas_and_holds_still` both rows
say "shares a face" in the shell's tree, naming the other feature on hover.
The fix is a Correct on the outer race's outside cylinder (or on the bore,
if that was the wrong one); the note goes away when the two hold different
faces.
