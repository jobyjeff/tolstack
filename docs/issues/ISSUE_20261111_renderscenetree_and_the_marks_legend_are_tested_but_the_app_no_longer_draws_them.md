---
type: chore
priority: low
status: deferred
area: viewer/nav
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: dead_code_under_test
defer_until: 2026-12-11
resolution: triage 2026-11-11 -- low, deferred by default; class has no registry row; 30-day date
---

# `VA.renderSceneTree` and the marks legend are tested but the app no longer draws them

Since 2026-11-10 a feature's body is drawn by `VA.renderFeatureBody`
(`apps/viewer/views/nav.js`), which draws the pane's end row without its head
and no legend. `VA.renderSceneTree` (the whole-tree renderer with the type
chips' slot and `sceneLegend`) has no caller in the app any more -- only the
fast tier's four tests of it (the disclosure, the legend, the suggestion mark,
the twisty-in-front row), each with a witness spec.

Either retire the function with its tests and specs, or make
`renderFeatureBody`'s several-rows branch call it (without a legend) so there
is one list renderer. `sceneList` and `sceneItem` are shared by both already;
what is dead is the outer function and `sceneLegend`. The pane still sends
`legend` on every tree (`AA.railLegend`), which nothing reads: the pane side
can stop composing it in the same change.
