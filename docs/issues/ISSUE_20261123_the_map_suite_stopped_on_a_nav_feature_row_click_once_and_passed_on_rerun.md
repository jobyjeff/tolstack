---
type: bug
priority: low
status: triaged
area: tests/browser-truth
class: browser_flake
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds.md
handoff: docs/sessions/HANDOFF_20261125_the_pane_opening_browser_suites_are_green_every_run.md
---

# The map suite stopped on a nav feature-row click once, then passed on rerun

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/study_v2 --only "the map (the counts"`
at `1d1d0d09` (branch `handoff/the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds`,
scratch root built from that tree) ran **0/1 after 12 checks in 50.8 s**. The last
lines were a Playwright click on the nav tree's feature row
`data-nav-id="hub@hub_spindle_bore_axis"` (`navtree__row--on-touching`): the element
was visible, enabled and stable, the action reached "performing click action", and
the suite then failed. Re-run straight after with no change: **32/32 in 104.9 s**,
v2 "notes none".

The branch changes no map or nav code (it adds a kinematic study and a grid badge),
so this reads as a timing flake in the suite's click on a row of the tree while the
pane is still opening. The full error text was not kept; whoever picks this up
should run the suite a few times alone and keep the first red's message.
