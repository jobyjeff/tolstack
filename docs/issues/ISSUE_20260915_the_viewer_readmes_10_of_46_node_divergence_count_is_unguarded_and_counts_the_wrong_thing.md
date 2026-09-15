---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
---

# "10 of the 46 live nodes" ships in the README and in a code comment, unpaired, and counts a different thing than the sentence says

`surfaces_that_state_something_false` (2026-09-15) added this to
`apps/viewer/README.md` (hover-cards section):

> **The preview pane the same dot's click fills names the same derived sides**
> (`VA.nodeSideIds`, the id form of the one adjacency) — it printed the
> authored `parts` list until handoff `surfaces_that_state_something_false`,
> **which is 10 of the 46 live nodes answering differently hovered and
> clicked.**

and the same phrasing in `apps/viewer/views/topology.js`'s `renderNodeDetail`
comment ("on 10 of the 46 live nodes the same dot answered differently").

## Two defects, one sentence

**1. The number counts memberships; the sentence claims strings.** Re-derived
from `C:\workspace\tolstack\data\projections\viewer\topologies.json` (5
topologies, 46 nodes) through `VA.nodeSideIds` itself:

| | count |
|---|---|
| nodes whose declared `parts` ≠ derived sides **as a set** | 10 |
| nodes that rendered a **different string** hovered vs. clicked | **17** |
| of the extra 7, the difference | same two parts, **opposite order** (authoring order vs. first-seen-edge order); six are the `head_bearing_face`-shaped nodes |
| nodes declaring a part **no incident edge carries** | 0 |

"Answering differently hovered and clicked" is the string claim, so the honest
number for that sentence is 17. The handoff's own lesson
(`LESSONS_20260915_surfaces_that_state_something_false.md`) gets this exactly
right — *"**17 of 46** live nodes rendered a different string hovered and
clicked; 10 differed in membership"* — and the shipped documents carry the
other number under the string wording. One number, two nouns, in one commit,
with the lesson holding the correct table: the shape
`docs/prompts/REVIEW_AGENT.md`'s "One number, two nouns, both in the same
commit" entry already describes. Second sighting.

**2. Both numbers are hand-restated live-projection counts with nothing
pairing them.** `10` and `46` are properties of
`data/projections/viewer/topologies.json`. Add a node or a gap edge and the
README and the comment go stale in silence; nothing fails. This repo's standing
rule — *a quantity written in prose that no test reads from the tree is a
defect regardless of whether it is right today* — and at least the third
sighting on this one file in two weeks
(`REVIEW_20260914_viewer_dag_hover_cards` S, `REVIEW_20260914_viewer_dag_spine_layout`
S2, and `ISSUE_20260915_the_viewer_readmes_rail_allocation_measurement_is_stale_and_unguarded`).

The new `[real]` guard in `apps/viewer/tests.js` (*"every live dot answers the
SAME on hover and on click…"*) computes `divergedFromDeclared` — the 17 — and
asserts only `> 0`, deliberately, as a vacuity guard. That is the right shape
for the guard and it means the README's digits are held by nothing.

## Fix shape

Two small edits, both mechanical:

1. Say what is counted. Either quote 17 for the string claim, or keep 10 and
   say *"10 of the 46 live nodes naming a different **set** of sides"* — the
   lesson's own wording. Fix the `views/topology.js` comment with it.
2. Pair the digits. The pattern already exists three tests down in the same
   file: `[real] every number apps/viewer/README.md states about the spine,
   the fit and the centring is re-derivable from the live projection` regexes
   the sentence out of `VIEWER_SRC.readText("README.md")` and asserts against a
   value computed from `liveTopos`. The new `[real]` node test already has
   `divergedFromDeclared` and `nodes` in hand, so the pairing is a regex and
   two `eq`s — and it keeps the `> 0` vacuity guard, which answers a different
   question and should stay.
