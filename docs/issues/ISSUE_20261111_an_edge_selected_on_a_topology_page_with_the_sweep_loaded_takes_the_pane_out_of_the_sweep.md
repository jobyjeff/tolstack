---
type: feature
priority: med
status: closed
area: viewer/pane
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: one_selection_many_surfaces
resolution: triage 2026-11-11 -- duplicate of ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md (review finding 2); its two new sentences carried there; fixed by docs/sessions/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
---

# An edge selected on a topology page with the sweep loaded takes the pane out of the sweep

Seen while taking the handoff's four-surface shots on the end-stop model
(`tests/debug_one_focus_20261110.mjs`, `f3_grid_row_selected_3840.png`): with
the pane open and the newest sweep playing (the Studies row), clicking a grid
row -- a dimension edge, `tan_link_mount_height` -- lights the row, its bar,
its two end features in the tree and the Preview, as the one selection should,
and ALSO sends the pane a `goto` for that edge: the sweep ends and the pane
opens bind mode on the edge ("tangential link mount base face to attachment
bore needs two faces, bound one at a time").

That is the pane's follow rule, not the selection's: `VA.annotateParamsFor`
(`apps/viewer/topology_app.js`'s `followSelection`) gives an edge on a
*topology* page the goto its row would post, and keeps the sweep only on a
*kinematic* page, where the selected edge is `highlight`ed instead. The rule
predates the sweep row in the Studies section (2026-11-10), which is a third
way to have the sweep on a topology page.

Jeff's reading (the handoff's definition of done): click an entity on any of
the four surfaces and the other three *light*. A grid row click that changes
the pane's mode is a bigger thing than lighting. The kinematic page's rule --
the sweep stays, the edge is highlighted in it -- is probably the right one
wherever the pane reports a run (`paneRun`), whatever page it is under;
entering bind mode would then be the row's 3D control or the Preview's
"attach to 3D", never a plain click. Which of those, and whether a plain
click on a *node* should keep behaving as it does (it posts `model select`,
no goto), is the design question.

Where to start: `VA.annotateParamsFor` and `followSelection`;
`selectedPaneTarget` already carries the kinematic page's edge highlight.

## Review 2026-11-12 (one_selection_one_hover_and_leaders_off): a second filing of an issue already on the branch

This is the defect `ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`
filed on 2026-11-08 and deferred by triage on 2026-11-09 (`defer_until: 2026-11-23`),
and that file was already in this handoff's own worktree at its branch point
(`af3e1546`). The two agree on the mechanism (`VA.annotateParamsFor` gives a
topology-page edge selection a `goto`) and on the recommended fix (keep the
sweep and `highlight` the edge, the kinematic page's rule). What this filing
adds: the one-selection framing (a plain click should light, not change the
pane's mode) and the observation that the sweep row in the Studies section is
a third way to have a sweep on a topology page. Triage should close this one
into the 2026-11-08 issue and carry those two sentences over.
