---
type: bug
priority: med
status: open
area: viewer/dag-layout
reporter: agent
class: part_reached_twice_drawn_twice
found_by: docs/sessions/HANDOFF_20261115_the_hub_is_one_part_in_the_grid_and_the_dag.md
---

# A block part's edge that runs between two other parts' faces still splits it

`gatheredOrder` (`apps/viewer/topology.js`) lays a block part's pins and chords
as soon as the walk reaches the part. Only the part's *other* edges wait until
one of their nodes is laid. So "held back, whole" holds only for a part that is
not a block, even though the code comment and `docs/DAG_TOPOLOGY.md`, "One part,
one run", say it of any part.

**The shape it misses:** a dimension on a block part's drawing whose two ends
are both faces another part owns (`VA.partPins` gives a contact face to the part
with more faces). Neither end is one of the block's pins, so the edge waits
until the other part's block is laid, and it is then drawn after that block.

**Measured on the review of `the_hub_is_one_part_in_the_grid_and_the_dag`:**
- The setup is a headless vm probe, the same pipeline the new fast tests use.
- Block H has pins `h1`, `h2` and chord `eh`. Its edge `x` runs from `m2` to
  `m3`, two faces that block M owns.
- `gatherParts` gives `h1 eh h2 g m1 e1 m2 e2 m3 e3 m4 x`.
- `gridPlan` gives `{H: 2, M: 1}`: H is two brackets.

Neither committed model has this shape today. v1 and v2 draw every part once
after the fix. Any model edit that adds such a dimension brings the split back,
and no guard would notice.

**Options:**
1. Hold a block back too, when one of its other edges cannot move yet. The
   catch is that this moves node rows down, so check `VA.layWalk` accepts that.
2. Lay such an edge right after the block's chords anyway, and let `withChords`
   draw it from the other part's node.
3. Narrow the comment and the doc to non-block parts, and add a fast case
   that pins the split as known.

Option 3 alone leaves the defect. Whichever option is chosen, add a fast case
with this fixture.
