---
type: bug
priority: med
status: triaged
area: scripts/run_viewer_browser_tests.mjs (annotate flyout suite)
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
class: timing_assertion_under_load
handoff: docs/sessions/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
---

# "[real] the whole live drawing is clear of the panel" measures before the column settles, and its red takes nine witnesses with it

`scripts/run_viewer_browser_tests.mjs`, suite `annotate flyout (repo-root mount +
file:// degradation)`. The check clicks `#study-3d`, waits only for
`#annotate-flyout[open]`, and reads `svg.tv__rails`'s left edge against the
panel's right edge on the next line. Nothing waits for the column the
panel opens to finish moving the DAG (`syncSceneColumn`, the respine, the
zoom fit).

**Measured at this review, same scratch data root, `--only` that suite:**

| tree | runs | red |
|---|---:|---:|
| `integration` at `ee467bbb` | 3 | 0 |
| `handoff/the_scene_pane_is_one_flyout_that_reads_over_http` | 3 | 0 |
| merged (`review/the_scene_pane_is_one_flyout_that_reads_over_http`, `31fe18f2`) | 7 | 2 |

One of the two reds was the mutation tier's unmutated baseline, taken while
a serial `pytest -q` was loading the box. The other was alone on a quiet
box. The red appears only on the merge of this handoff (the pane handle and
hidden head) with `the_dag_is_zoomable_and_a_length_mode_draws_to_scale`
(the DAG's zoom fit). Each passes alone, so it looks like a timing
interaction, not a layout defect. In the 7 merged runs the drawing was clear
whenever the measurement came late enough.

**Why it matters more than one flaky check:** the witness runner runs this
suite's clean baseline first. A red there marks every spec in the suite NOT
WITNESSED ("the tier was red before the mutation"). At this review that was
nine entries, among them two of this handoff's new specs
(`browser__the-divider-s-chevron-closes-the-flyout__5d7ec165`,
`browser__the-pane-s-header-says-the-folder-is-still-needed-as-a-d__cf4cf386`).

**Fix shape:** wait for the effect asserted, as the rail suite's tint check
now does. Poll until `svg.tv__rails`'s rect is stable across two frames
after `flyout-open` is set, with a cap, and only then compare it with the
panel's right edge. Then replay the A/B above several times on the merged
tree.
