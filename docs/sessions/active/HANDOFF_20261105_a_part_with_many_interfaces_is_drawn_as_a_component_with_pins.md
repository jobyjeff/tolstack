---
priority: high
depends_on: [the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste]
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — a_part_with_many_interfaces_is_drawn_as_a_component_with_pins: a multi-interface part is one near-square block with its interface nodes on the perimeter, like a component in a circuit diagram

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05): "for individual parts with
multiple interfaces (pitch plate would be a good example), model the part in the dag similar to
a component in a circuit diagram, as a rectangle with nodes along the perimeter for each
interface. Nodes from an individual part should be clustered together into a shape with
relatively square aspect ratio (it can be a rectangle, just not too stretched out). See attached
image for a simplistic example." The image
(`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261105T120617_a7evx5\paste-20261105T120424.png`)
is a flowchart of filled rectangles and diamonds with port dots on their perimeters and
orthogonal connectors between ports; the nodes sit on the edges of the block, not inside it. Also
routed here: question 5 of
`docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md` ("part runs
repeat"), which this layout dissolves (a part is one block, so it cannot repeat). Baseline:
master after `the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste` (its group borders
and overlays apply to the blocks). Today's layout is columnar: `VA.rowPositions`
(`apps/viewer/topology.js:1447`), rails in `railsSvg` (`apps/viewer/views/topology.js:1639`), body
containers as `rect.tv__bodyfield`, glyph nodes from `apps/viewer/interface_glyphs.js`. Scope:
the DAG layout and its rails; keep the grid's row order as the chain order the grid handoffs
defined (the grid is not re-laid-out by this). Do NOT touch the grid, the tween, the annotator.

## Deliverables

1. **A part with two or more interface nodes is a block.** Its nodes are pins on the block's
   perimeter; the block's aspect ratio stays within a measured band (suggested: between 1:2 and
   2:1). Pins are placed so edges leave toward their other end with the fewest crossings. A
   part with one node keeps today's glyph. Bodies remain groups around their blocks (the group
   border from the sibling handoff).
2. **Edges route between pins**, orthogonal or gently curved, your call by eye; the lit-set
   band and the leader lines keep working (`the_dag_holds_still…` measured the rest state; its
   checks are the oracle).
3. **Chain order is kept readable.** The walk order the grid uses still reads left to right (or
   top to bottom) across blocks: measure whole-walk crossings before and after on the
   kinematic study, the grip-length study and the cotter-hole study (brief Q1's number is the
   one to beat; the 11-03 lesson counted 20/97/50 on 14 columns).
4. **Length modes still mean something.** In `tolerance` and `contribution` modes an edge's
   drawn length is the value; a block's pins may move to honour it. Say in the lesson what gives
   when two constraints fight (brief Q1 and Q3 are the standing questions; answer them for this
   layout or say which stays open).

## Definition of done

- Screenshots: the pitch plate as a block with its pins on the kinematic study; the three
  studies before/after with crossing counts.
- The lit-set, leader, landing and glyph browser checks keep their values or are re-pinned
  with the reason stated.
- Viewer browser tier green.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md`):
  the pin-placement rule, the aspect band, the crossing counts, and the answers to brief Q1/Q3/Q5.
