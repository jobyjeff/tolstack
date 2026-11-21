---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-21 — a_body_row_in_the_nav_takes_a_resting_hover_every_time: find why the nav's body-row hover check fails twice running on trunk, and fix the side that is wrong

Source: triage batch merge 2026-11-21
(`dispatch/docs/sessions/lessons/LESSONS_20261121_triage_sweep.md`), routing
`docs/issues/ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`
(its sightings, 2026-11-05, 11-20 and 11-21, are the evidence). Baseline: trunk
after the 2026-11-21 batch merge. Scope: `apps/viewer/` nav / scene-tree hover
path, `apps/annotate/` if the rebuild comes from there, and the `3D pane
follows the selection` suite in `scripts/run_viewer_browser_tests.mjs`; do NOT
touch other suites.

## The red

`node scripts/run_viewer_browser_tests.mjs`, whole tier, main checkout, trunk
`53271c6c` (projections rebuilt first): **48/49**, the one red in `3D pane
follows the selection (sweep, bind, reload, hover)` 30/31:

```
FAIL sub-check: [real] resting on a body row in the nav lights that body in the scene:
  every part of it glows at its resting look, the rest go faint, and nothing is opaque
```

`--only "3D pane follows"` straight after: the same 30/31. So on this tree it
is not the one-in-N flake the 11-20 review saw (its `--only` passed 31/31). The
DIAG: three `locator.hover: Timeout 2000ms exceeded` waiting for
`#navtree [data-nav-kind="body"]...`, pointer last under
`SPAN.navtree__label`, and the light *standing* in every sample (own 1, about 5,
nothing opaque, none faint). The 11-20 DIAG had the same shape (light standing,
two hover timeouts).

## Deliverables

1. **Diagnose which side is wrong.** The light stands while the check's own
   `locator.hover` times out: either the row is being rebuilt under the
   pointer (the issue's suspect: the `annotate:tree` message re-rendering the
   nav, so Playwright never sees a stable element), which is a product defect a
   reader would also feel, or the check targets a row it should not wait on.
   Measure which, with the main checkout's projection; record the evidence.
2. **Fix that side.** If the nav rebuilds an unchanged row, stop it (and
   re-post the hover for the row under the pointer after a rebuild, as the
   issue proposes). If the check is wrong, fix the check — never by loosening
   what it asserts about the light.

## Definition of done

- `--only "3D pane follows"` green five runs in a row in the main checkout,
  and once beside a default `pytest -q`.
- Two fast node tiers, the default tier, the witness runner `--only` for any
  guard touched.
- Lesson: the mechanism, with the measurement that settled it.
