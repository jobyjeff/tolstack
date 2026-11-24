---
type: bug
priority: med
status: open
area: tests/browser
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
---

# The scene pane over HTTP suite is red on integration

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the scene pane reads over HTTP"`,
2026-11-24, against the main checkout's projections:

- on integration `48042976` (exported with `git archive`, run from the export
  with a `node_modules` junction): **ABORTED after 7 sub-checks, 5 failed**;
- on `handoff/right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`:
  the same five, the same abort.

Failing, in order: "[real] the handle opens the pane and hides itself while it
is open; the pane's own head carries no Close button…", "[real] with no folder
grant, the pane reads the run and the meshes over HTTP and shows the
mechanism…", "[real] ...and the sweep plays", "[real] the pane's header shows
the status dot and one word…", "[real] the pane itself shows no banner and no
Connect button…"; then `ERROR: Cannot read properties of null (reading 'width')`
(a `boundingBox()` of something that is not on the page). The first failure is
the handle click on `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
under `startDrawingCheckerMountServer`, so the pane never opens and everything
after it follows.

`ISSUE_20261104_three_browser_suites_are_red_on_the_base_with_a_fresh_projection.md`
fixed this suite once (resolved, 9/9). Not investigated further here: the
branch that found it changes neither the kinematic page nor the mount server,
and the baseline is identically red.

## Addendum 2026-11-24, later the same day

"3D pane follows the selection" shows the same first symptom intermittently
inside the mutation-witness runner's shadow tree: one clean run had "[real] the
seam's handle opens the pane, booted on the study's run…" fail and the suite
abort on `contentWindow` of null; the next clean run of the same tree was green
(30/30), and so was a direct `--only` run. Both suites open the pane from
`topology.html?kinematic=…`, so the HTTP suite's red may be the same arm
failing every time under its mount server.
