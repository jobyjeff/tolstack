---
type: feature
priority: low
status: triaged
area: annotate
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: one_selection_many_surfaces
handoff: docs/sessions/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
resolution: triage 2026-11-11 -- folded into the one_selection_many_surfaces class handoff (F1b residue)
---

# The pane keeps two selections of its own beside the page's one

Since 2026-11-10 the page holds ONE selection and ONE hover (`state.focus`,
`apps/viewer/topology_app.js`) and the pane is told by message and answers by
message. What the pane still keeps of its own, and can in principle disagree
with the page for a message's length:

| pane state | written by | the page's side |
| --- | --- | --- |
| `state.sweep.inspect` (the sweep rail's selected end row) | a 3D bead or face click in sweep mode, a mirrored row's `activate`, `inspect feature` / `inspect clear` | `syncSceneInspect` sends `activate` on the selected feature's end row; `followScenePick` reads the next tree's `selected` row back |
| `state.model.selected` (the model layer's selected dot) | `model select node|body|clear`, an anchor click (`onModelPick`) | `syncSceneModel` posts `model select node <id>` / `clear`; `onScenePick` reads the pick message back |

Both are driven from the page and read back as gestures, so neither holds a
different answer for long -- but they are copies, and the handoff's words were
"no second copy of what is selected on either side that can disagree". One
pane-side selection (a node, or an edge end) that the sweep rail and the model
layer both read would close it; which of the two it is, and whether an end's
direction belongs on it, is a design choice for the pane's own state.

Where to start: `apps/annotate/app.js` `cmdInspect` / `isSelectedFeature` and
`cmdModel`'s `plan.select`; the page's `syncSceneInspect` and `syncSceneModel`
would then post one verb.
