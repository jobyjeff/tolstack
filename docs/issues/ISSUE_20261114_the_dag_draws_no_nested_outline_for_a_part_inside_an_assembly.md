---
type: feature
priority: med
status: resolved
area: viewer/dag
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md
resolution: resolved 2026-11-16 by handoff the_map_draws_the_end_stop_model -- the map draws the static nested outline (an assembly's outline round its own box and its children's); the fold control stays open in ISSUE_20261114_assembly_folding_left_out_of_three_surfaces. Was deferred 2026-11-15 by triage (med beyond budget) until the map handoff.
class: merged_page_walk_20261112
---

# The DAG draws no nested outline and no + for a part inside an assembly

Handoff `a_part_may_contain_parts` (2026-11-14) gave parts a `parent` and
fenced the DAG's share out: "the + on a group and the nested outline arrive with
the map handoff". No map handoff is staged, so this issue carries it.

What the DAG does now (`apps/viewer/topology.js`, `VA.topPartOf`): every part
inside an assembly is drawn as its top-level assembly. Its nodes are pins of the
assembly's block (`VA.partPins`), its edges are the assembly's chords, and its rows
are in the assembly's field (`VA.partSpans`). On model v2 the three bearings have
no nodes or edges, so the drawing is byte-identical to integration's. The shots are in
`docs/sessions/lessons/shots/a_part_may_contain_parts/`.

What the map must draw for a nested part (Jeff's note `20261112T114449_f3anmp`):

- a nested outline inside the assembly's block, one per child with a node of its
  own, at any depth the schema allows (it sets no limit);
- a + / − on the assembly's group that folds the children into the block, matching
  the grid's fold (`VA.readCollapsedAssemblies`; the same store would keep the
  two in step);
- pins: a node shared by an assembly and its own child (a bearing in its link's
  bore) is internal to the assembly folded, and a pin between the two outlines
  open.

Recommendation: draw it with the map, off the model view's `parent` / `children`
/ `depth`. It needs a design session for the open-block layout, because a child outline
inside a block changes the block's aspect rule (`VA.BLOCK_ASPECT`).

> **Resolved by the map (2026-11-16, handoff `the_map_draws_the_end_stop_model`).**
> The map draws the static nested outline: a part with children gets an
> outline round its own box and its children's small boxes, inside its body's
> district (`VA.mapLayout`'s `assemblies`; `docs/DAG_TOPOLOGY.md`, "The map").
> On v2 the pitch link's bearing and the tangential link's two are each a
> labelled box inside their link's outline. The "+" fold control is NOT drawn
> and stays open in `ISSUE_20261114_assembly_folding_left_out_of_three_surfaces`
> (and the table in `ISSUE_20261116_what_the_map_does_not_draw_yet`). The
> present DAG (Classic) is unchanged and still draws no nested outline; it
> retires with the map's acceptance.
