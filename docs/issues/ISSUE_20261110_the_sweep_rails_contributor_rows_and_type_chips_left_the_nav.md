---
type: feature
priority: low
status: deferred
area: viewer/nav
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: 2026-12-10
class: fixed_at_one_of_n_sites
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# The sweep rail's contributor rows and type chips left the nav

Until 2026-11-10 the nav mirrored the pane's whole sweep rail under the
kinematic study's row: its bodies and joints, the study's contributor rows
(each with a Pick control and a readout), and the four type chips that
filtered them. The left column is the model's tree now, and of the rail only
the selected feature's rows are drawn (under that feature). What is no longer
reachable from the nav:

- a contributor row's Pick, and its per-stop readout beside the row (the
  grid's kinematic stack is the contributors' home: one row per contributor,
  with sensitivity and contribution; a Pick from there would be the DAG/grid
  surface's own control);
- the type chips (bodies / joints / surfaces / contributors) -- a filter Jeff
  did not want on the tree;
- a body's checkbox hiding a body *in the run's words* (`hide-body`); the
  tree's box hides the body's parts by part id, in both pane modes.

Nothing is lost from the pane itself (its rail is intact, hidden when
embedded). File here so the next handoff on the kinematic page decides where a
contributor's Pick lives.
