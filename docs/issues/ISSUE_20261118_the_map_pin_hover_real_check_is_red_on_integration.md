---
type: bug
priority: med
status: resolved
resolution: "The check hovered while the pane's one command queue was still opening the model, so the light landed past its 5 s wait; it now waits for the queue to drain first (30/30, witnessed)."
area: tests/browser-truth
class: browser_red_on_trunk
reporter: agent
found_by: docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md
handoff: docs/sessions/HANDOFF_20261119_the_map_pin_hover_lights_its_bound_face_in_the_scene.md
---

# The map suite's pin-hover `[real]` check is red on integration

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the map (the counts"`
is 29/30 at `69c6f779`, the failing sub-check `[real] a pin hovered on the map lights its feature's row in the tree (or the closed fold holding it), the dimensions at it in the grid, the pin itself and its connector on the map, and its bound face in the scene`.

Deterministic: the whole tier, alone, and the unmodified baseline script
(`git show HEAD:scripts/run_viewer_browser_tests.mjs`) all give the same one
red, so it is neither this handoff's change nor timing. The whole tier at this
tree was 43/45, the other red being `annotate rail suggestion`
(`ISSUE_20261108_the_rail_suggestion_real_check_finds_15_suggested_rows_for_34_open_proposal_edges_on_trunk.md`).
The cause is not found; the sibling checks of the same suite (the one selection
on four surfaces) pass, which points at the "bound face in the scene" clause
reading the main checkout's served log.

## 2026-11-19 — now on trunk (triage batch merge)

The 11-19 batch merge fast-forwarded trunk `9eb46002` -> `f510260e`, carrying
this red onto trunk. Whole tier in the main checkout after the rebuild:
45/46, this sub-check the only red, its diagnostic `pane null` (tree, grid
and map answered; the scene did not). It was green at the 11-17 merge
(`1f8c6381`, 45/45). The fix is staged as
`docs/sessions/HANDOFF_20261119_the_map_pin_hover_lights_its_bound_face_in_the_scene.md`.

## 2026-11-19 — resolved (the_map_pin_hover_lights_its_bound_face_in_the_scene)

Cause: the check's premise. The page posts the right light and the pane
draws it, but late. The page's `light` (the bound hub face 144, own) is
posted the moment the pin is hovered. The pane runs commands one at a time,
though, and it was still executing `isolate parts`: opening the model's
parts, then the rest of the mesh store as context. The check's "scene ready"
waits only for one open part. Measured on a quiet box, the hover was posted
at 15.4 s and drawn at 20.9 s, 0.5 s past the check's 5 s wait. On a busy
box it was drawn 34 s after the hover. Nothing in `apps/` changed between
the green `1f8c6381` and the red `69c6f779`. The binding still stands in
Jeff's log (event seq 77, kept by seq 79). Load-time variance moved the
check across the line.

Fix: the check now waits, before hovering, until a command posted through
the pane's own queue (behind everything the page has posted) is answered.
The 5 s wait then times the light alone, and the clause is unchanged. The
product-side wait is filed as
`ISSUE_20261119_a_hover_waits_behind_the_pane_opening_its_model_before_the_scene_lights_it.md`.

Verified: `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the map (the counts"`
30/30, and the witness `--only` for this guard was WITNESSED with its clean
run green.
