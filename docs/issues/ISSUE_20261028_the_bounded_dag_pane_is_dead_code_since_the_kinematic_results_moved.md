---
type: chore
priority: low
status: deferred
area: viewer/topology pane
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
class: dead_code_after_refactor
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# The bounded DAG pane is dead code since the kinematic results moved to the right-hand pane

On 2026-10-28 the kinematic page stopped passing `bounded` / `scrollToGrid` to
`VA.renderTopoPane` (its results moved into `#detail`, so the model no longer
needs a 50vh box with the numbers under it), and the `.tv__scroll--bounded`
CSS rule went with it. Nothing else ever set the flag, so these branches can no
longer run:

| file | site |
|---|---|
| `apps/viewer/views/topology.js` | `renderTopoPane`'s `carriedTop`, the `tv__scroll--bounded` class, the `if (ctx.bounded)` scroll restore; `visibleTop`'s bounded branch; the comment on `VA.pinTopoHead` |
| `apps/viewer/topology_app.js` | `paneScroller()` and its two callers (`scrollDag`, `fitDag`); the bounded-box wording on `scrollSelectionIntoView` |
| `scripts/run_viewer_browser_tests.mjs` | the zoom suite's `kin()` still ORs in the class so the "no box of its own" check reads either form |

Left in place by that handoff because `views/topology.js` was being reworked by
the parallel `the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below`
handoff. Delete once that one lands; the fast tier and the zoom suite cover the
unbounded path.
