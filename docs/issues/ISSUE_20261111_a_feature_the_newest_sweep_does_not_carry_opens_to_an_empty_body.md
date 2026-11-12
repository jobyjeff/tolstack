---
type: feature
priority: low
status: open
area: viewer/nav
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: internals_on_a_user_surface
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
