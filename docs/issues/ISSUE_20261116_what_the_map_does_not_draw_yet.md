---
type: feature
priority: med
status: deferred
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
area: viewer/map
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261115_the_map_draws_the_end_stop_model.md
defer_until: 2026-12-05
class: dag_layout_policy
resolution: re-triaged 2026-11-21: its layout brief was consumed and names this issue as the map form of Q1/Q3; med beyond tolstack's budget of 3, deferred to 2026-12-05 (dag_layout_policy's program is that consumed brief, so a date)
---

# What the map does not draw yet, each fenced out of its handoff by name

> **2026-11-17:** two rows are done (a layout for v1, Classic's retirement);
> the fold control on an assembly's outline and a study lit as a route are
> still open, fenced out of `the_map_is_the_only_drawing_and_classic_retires`
> by name for the next batch.

Handoff `the_map_draws_the_end_stop_model` (2026-11-16) built the map beside
the present DAG and fenced these out so none was half-built. The handoff's
owner ends at Complete; this issue carries them. The strategy draft
(`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
"2026-11-15 -- the chain to the map", step 6) says they are written after
Jeff's review of the map.

| What | What the map's code gives it | Open question |
| --- | --- | --- |
| **A fold control on an assembly's outline** (the "+" on a group, and the collapsed / expanded shortcuts) | `VA.mapLayout` already draws an assembly's outline round its own box and its children's (`geo.assemblies`), and the grid's fold store (`VA.readCollapsedAssemblies`) is the state to share. Folded, the children's boxes go and the parent's box takes the outline's place; a pin a child owns moves to the parent's perimeter -- today no child in v2 has a feature, so nothing moves. | Where the control sits (the outline's corner, as Jeff drew the "+"), and whether a folded assembly's district shrinks with it. Tracked with the three surfaces in `ISSUE_20261114_assembly_folding_left_out_of_three_surfaces`. |
| **A study lit as a route** (the strategy sketch's view 2) | Every jumper and connector is keyed by the model's dimension and interface ids, and the page's lit set (`VA.studyLitSet`, `ctx.lit`) is edge ids -- the map can wear a `--route` class on the chain's jumpers and connectors and fade the rest, as the DAG dims its unlit part. | A chain study's order along the route (its ordinals), and whether the rest of the map dims or hides (the DAG's Unused control). v2 has no study yet, so no fixture. |
| ~~**A layout for v1**~~ | ~~`VA.dagDrawingFor` draws Classic for a model with no `map_<id>.json`.~~ | **Done 2026-11-17** (`the_map_is_the_only_drawing_and_classic_retires`): a model with no layout file has its places computed by the builder -- one column per body, its parts down it in tree order (`computed_map_places`) -- and an authored file overrides them. v1 draws that way; a hand arrangement of its routes (the defect notes the layout reports) is a later handoff's, should Jeff want one. |
| ~~**Retiring Classic** and rewriting its browser suites once~~ | ~~The runner's `newPage` wrapper seeds Classic for every suite.~~ | **Done 2026-11-17** (`the_map_is_the_only_drawing_and_classic_retires`): the switch, the rails drawing, the respine, the seam leaders, `fitDagTo` and the rails-only controls are gone, and the suites were rewritten once (that handoff's lesson carries the table). |
| **The compound joints** the model does not author yet | A joint with several constraints is a bundle -- parallel pins in one order at both ends, one route each with its own symbol -- so each joint draws itself as it is authored; the hub ↔ tangential-link mount is the one example. | The authoring itself, one joint a handoff (the strategy draft's step 7)~~, and the pattern word (`ISSUE_20261116_the_model_has_no_interface_word_for_a_fastener_pattern`)~~. The pattern word was added 2026-11-17 (`a_joint_says_what_kind_it_is`): a shared node states `fastener_pattern`. |
| ~~**A second, portrait arrangement**~~ | ~~The layout file is one arrangement; a second file per region shape would need the loader to pick one.~~ | ~~Only if the six-region table in the map's lesson says the wide one does not read side by side (the strategy draft's decision 81).~~ **Answered 2026-11-17** by Jeff: the one arrangement is portrait. Handoff `the_map_is_portrait_as_jeff_drew_it` re-placed v2 tall; there is still one arrangement and no second file. |
| **A box that spans several cells, and the sketch's other tall-map details** (added 2026-11-17 by `the_map_is_portrait_as_jeff_drew_it`) | A place is one cell, `[column, row]`. In Jeff's sketch the gas-spring mount is a tall box spanning the cover-to-piston-body height, so the feather stop and the slide both run straight across. The hub sits right under the tangential link mount, and the pitch link body sits between the columns. The tall map runs the slide on a 45° leg, leaves rows 4–5 of the left column to the hub ↔ mount bundle, and keeps the pitch link in the right column (that handoff's lesson, "What in Jeff's sketch the tall map still does not do"). | Whether a place may carry a span (`[column, row, rows]`), and whether a row may be shorter than a cell; both change the layout file's schema and the builder's check. |
