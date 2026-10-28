---
type: feature
priority: low
status: resolved
area: viewer/layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_the_kinematic_page_keeps_the_dag_and_says_each_contributor_once.md
resolution: superseded by HANDOFF_20261026_the_shell_seats_the_scene_beside_the_model -- the preview pane stands down when the scene opens on topology and kinematic pages (option 1); its lesson measures the DAG column at 739/900px at 1600 (triage 2026-10-27)
---

# With the 3D pane open at 1600 wide, the page column between the nav and the preview pane is ~180 px

Measured 2026-10-26 on the kinematic study page, real data, 1600×1000
(`docs/sessions/shots_20261026_kinematic_page_dag/05_1600x1000_3d_pane_row_click.png`):
the 3D pane takes the left, the nav keeps its 300 px, the preview pane keeps
its ~560 px on the right, and the page column — verdicts, model, chart, the
contributor table — is left about 180 px. Rows can still be clicked (and the
scene stays in sweep mode), but the table is a sideways scroll from its second
column and the chart is a thumbnail. Chain-study pages get the same squeeze;
`VA.clampFlyoutWidth` protects the rails' drawing width, not the page's
reading width.

Options, for a strategy session:

1. When the 3D pane opens, collapse the preview pane to a narrow strip (it
   reopens on a selection) — recommended: the pane and the preview are both
   "detail of the selection", and the scene is the richer one.
2. Let the clamp also protect a minimum reading width for the page column,
   squeezing the 3D pane instead.
3. Leave it; the reader drags the dividers.
