---
type: bug
priority: med
status: open
area: viewer/pane
reporter: agent
audience: strategy
found_by: docs/sessions/reviews/REVIEW_20261112_one_selection_one_hover_and_leaders_off.md
class: one_selection_many_surfaces
---

# The page re-asserts its end row into the pane, so a pane-side deselect is swallowed and an `activate` is re-posted while the pane's answer is in flight

`syncSceneInspect` (`apps/viewer/topology_app.js`) runs inside `applyFocus`,
which runs on every hover change and after every paint. While the page holds a
feature whose node has an end row in the pane's sweep rail, it posts a rail
`activate` on that row whenever the **last tree the page received** shows no
selected end row. Two measured consequences on the end-stop model with the P2
sweep loaded (review probe, 2026-11-12, the hub's `spindle bore axis`):

- **A pane-side deselect cannot stick.** `inspect clear` run in the pane (what
  a second click on the bead or the bound face does in sweep mode) was answered
  by one `activate` from the page and the row was selected again within the
  debounce. The pane can *set* the one selection (a pick is followed) but
  cannot *clear* it: the gesture is swallowed and the page's answer wins.
- **The gesture is re-posted while the answer is in flight.** A feature row
  clicked in the tree with the pointer then swept over a dozen DAG marks posted
  `activate` twice (one is the selection; the second fired from a hover
  change before the pane's tree had come back). The pane's row click is a
  toggle (`selected ? inspect clear : inspect feature`), so a second
  `activate` deselects, the next tree shows nothing selected, and a third
  re-selects. It converged in the probe, with the pane's rail rebuilt three
  times for one click; under a slower pane it is a visible flicker.

`sceneInspectPosted` is set to the node in that branch but never read there,
so nothing dedupes the post; the pane's tree is the only acknowledgement and
it arrives later.

Two halves, and the second is the design call:

1. **Dedupe the post** -- post the `activate` at most once per selected node
   until a tree arrives (a pending flag cleared on `annotate:tree`), or gate
   the branch on `sceneInspectPosted !== feature.node` the way the folded-joint
   branch below it already does. Small, no behaviour the handoff decided
   changes.
2. **A pane-side deselect is a selection change.** `followScenePick` treats
   "no selected row where the page's selected feature had one" as nothing
   (`found` null, `target` null, return). Under one selection it should read
   as the pane letting go -- `unfreeze()` on the page -- rather than be
   re-asserted. Whether a bead's second click should unfreeze the page is the
   question for strategy; `ISSUE_20261111_the_pane_keeps_two_selections_of_its_own_beside_the_pages_one.md`
   is the wider one this is a symptom of.

Where to start: `syncSceneInspect` and `followScenePick` in
`apps/viewer/topology_app.js`; the pane's toggle is `featureRowBase`'s
`li.onclick` in `apps/annotate/app.js`.
