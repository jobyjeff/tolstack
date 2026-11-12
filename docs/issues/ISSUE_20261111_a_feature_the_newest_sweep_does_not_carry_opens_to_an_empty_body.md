---
type: feature
priority: low
status: deferred
area: viewer/nav
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: internals_on_a_user_surface
defer_until: 2026-12-11
handoff: docs/sessions/active/HANDOFF_20261112_a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown.md
resolution: triage 2026-11-11 -- low, deferred by default (a viewer refinement; F1c is next on the strategy chain); class has no program; 30-day date
---

# A feature the newest sweep does not carry opens to an empty body

Seen in the handoff's four-surface shots (`f2_dag_node_selected_3840.png`):
on the end-stop model (v2) with the pane playing the newest sweep -- the P2
run, a v1 run v2 reuses through `ids_from` -- the tangential link mount's
`pilot bore` is selected from the DAG, its row opens (it is the selected
feature) and its body is empty. The node is new in v2 (2026-11-08); the run's
geometry features are v1's, so the pane's sweep rail has no joint end for it,
and a body is the pane's rows for the feature. The pane's own `inspect
feature` for the end (`syncSceneInspect`) finds no row either.

Two honest shapes, and which is a design call: draw no twisty on a feature
the loaded run carries no end for (a control with nothing behind it is shown
as nothing -- but the row's state changes with the run loaded, which is
surprising on a tree row), or a one-line body from the model's own status
(`VA.FEATURE_STATUSES`: bound / suggested / none) with no pick action, since
there is no end to pick on. Either way the model knows which run is loaded
(`paneRun`) and the topology knows which nodes are v2's own.

Where to start: `views/nav.js` `featureItem` (the twisty is drawn whenever
the scene is open) and `topology_app.js` `renderSceneSlot` /
`VA.renderFeatureBody` (an empty `rows` draws nothing).

## Addendum 2026-11-12 -- closed by its second shape

Handoff `a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown`
draws a feature's body from the model's own status (`VA.featureBodyPlan`,
`apps/viewer/views/nav.js`), whatever the loaded sweep carries. Bound is one
line with Correct, Unbind and Flip. Not bound is "not bound" with **Pick a
face**, which arms the pick on the feature's own part. That is the pick this
issue left out. A suggestion is still the pane's candidate rows. The probe
`tests/debug_binding_corrected_where_shown_20261112.mjs` walks every v2
feature and counts any twisty that opens to nothing.
