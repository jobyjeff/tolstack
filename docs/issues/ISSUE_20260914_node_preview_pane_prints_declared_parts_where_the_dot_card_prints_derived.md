---
type: bug
priority: med
status: triaged
area: viewer/topology
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
---

# The node preview pane prints the DECLARED parts where the dot's hover card prints the DERIVED sides — 10 of 46 live nodes disagree

Found reviewing `viewer_dag_hover_cards` (2026-09-14), which added the node
hover card on `.rail__dot`. The card is right and its reasoning is recorded
(`LESSONS_20260914_viewer_dag_hover_cards.md`): a node's sides are **derived**
from the edges actually incident on it (`VA.nodeAdjacentParts`), because that
is the adjacency the leader/internal rule reads and the only one whose sides
can be honestly thumbnailed. The defect is on the other surface: the node
**preview pane** — what the same dot's *click* fills — still prints the
node's authored `parts` list.

`apps/viewer/views/topology.js`, `nodeDetail`:

```js
root.appendChild(VA.el("div", "detail__where",
  "on " + node.parts.join(" ⇔ ")));          // DECLARED
...
var adjacentParts = VA.nodeAdjacentParts(ctx.topoProj)[id] || [];   // DERIVED
```

So the pane already states the fact twice from two sources, one line apart: its
`detail__where` line from `node.parts`, its leader-rule paragraph from the
derived adjacency. The new card made that visible by agreeing with the second
one.

## Measured, against `data/projections/viewer/topologies.json`

**10 of 46 live nodes disagree**, every one of them the same shape — a part
against a derived clearance that the declared list does not mention:

| node | pane (`detail__where`) | dot card (derived) |
| --- | --- | --- |
| `pitch_system/vpa_end_stop_feature` | `vpa_208510_007` | `vpa_208510_007 ⇔ a clearance` |
| `pitch_system/piston_end_stop_face` | `vpa_piston` | `vpa_piston ⇔ a clearance` |
| `pitch_link_to_pitch_plate/washer_far_face` | `washer_nas1149v0332h` | `… ⇔ a clearance` |
| `pitch_link_to_pitch_plate/shank_full_dia_end` | `bolt_nas6403u11d` | `… ⇔ a clearance` |
| `rotor_fastener_length/washer_far_face` | `washer_nas1149v0332_tt` | `… ⇔ a clearance` |
| `rotor_fastener_length/shank_full_dia_end` | `fastener_family` | `… ⇔ a clearance` |
| `tan_link_to_pitch_plate_take2/flanged_bushing_effective_far_face` | `flanged_bushing_tan_link` | `… ⇔ a clearance` |
| `tan_link_to_pitch_plate_take2/shank_full_dia_end` | `bolt_nas6403u13h` | `… ⇔ a clearance` |
| `vpa_output_to_pitch_plate/bushing_far_face` | `plain_bushing_214943_002` | `… ⇔ a clearance` |
| `vpa_output_to_pitch_plate/shank_full_dia_end` | `bolt_nas6404u13d` | `… ⇔ a clearance` |

Hover such a dot and it names two sides; click the same dot and the pane names
one. A reader gets two answers about which parts meet at one interface, and
nothing in either tier fails.

## The fix, and the second face of it

Point `detail__where` at the same derived adjacency the paragraph below it
already uses, and pair the two surfaces with a test (the fast tier can assert
the pane's side list equals `VA.nodeCard(...).sides.map(s => s.label)` for
every live node, which is the shape the card's own `[real]` test already has
for thumbnails).

**Second face, same three lines.** `nodeDetail` spells the clearance word as an
inline literal:

```js
return p === null ? "a clearance" : p;      // views/topology.js
```

while `viewer_dag_hover_cards` introduced `VA.CLEARANCE_SIDE_LABEL = "a
clearance"` for exactly that word. Two carriers of one vocabulary, one named
and one inline, in the same file — this repo's most-repeated defect shape
(`CLAUDE.md`, "A field vocabulary is a module-level constant"). Whoever fixes
the divergence above is already in these lines; convert the literal at the
same time.

Not fixed in review: the pane is outside `viewer_dag_hover_cards`' scope and
the pairing test is a test, not a typo.
