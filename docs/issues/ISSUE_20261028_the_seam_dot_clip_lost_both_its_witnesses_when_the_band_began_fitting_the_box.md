---
type: chore
priority: med
status: deferred
area: tests/mutation-witness
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md
class: decayed_witness
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# The seam's dot clip lost both of its witnesses when the band began fitting the box

`apps/viewer/topology_app.js` hands the seam a `dotClip` (the DAG's visible
box: left/right, top below a pinned header, `bottom: Math.min(p.bottom, bottom)`)
so that a lit dot scrolled out of the DAG's view gets no leader across the seam.
Until 2026-10-28 two browser specs witnessed it:

- `browser__real-on-p2-every-lit-node-with-an-anchor-and-a-dot-in-th__47dcfe3f`
  (mutation: `dotClip: null`), and
- `browser__real-with-the-toggle-at-hide-six-to-ten-leaders-across-t__48203faf`
  (mutation: drop the box's bottom edge from the clip).

`the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below`
made a study arrival Fit the band into the bounded box, so in both checks' setup
no lit dot is out of view any more and neither mutation reddens. Both specs were
re-aimed at the **same** new mutation (drop the zoom factor `k` from the seam's
dot positions), the second renamed to `…at-least-six…__fce3b8e5`. The zoom
mutation is a real and worthwhile witness, but the clip itself now has none:
`git grep dotClip -- scripts/mutation_witnesses/` is empty on that branch.

The behaviour is still live — any reader who zooms in (`+`), or scrolls the
bounded box, puts lit dots outside the view, and the clip is what stops a leader
being drawn to a dot nobody can see.

Fix shape: in `testSeamLeaders`, after the existing hidden/box checks, zoom in
(or scroll the box) until at least one lit dot is out of view, assert the
leader set equals the in-view expected set (the harness already computes
`expected` with the clip), and enroll a spec whose mutation is the old
`dotClip: null` (or the bottom-edge drop). Re-point one of the two
duplicate-mutation specs rather than adding a third if the check names allow.
