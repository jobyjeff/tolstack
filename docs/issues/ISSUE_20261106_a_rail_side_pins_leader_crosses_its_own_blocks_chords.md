---
type: chore
priority: low
status: open
area: viewer/dag-layout
reporter: agent
class: dag_layout_policy
found_by: docs/sessions/reviews/REVIEW_20261106_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
---

# A rail-side pin's leader crosses its own block's chords

With **Parts: Blocks** (the page's default since 2026-11-06), a pin on a
block's left side (a face other parts meet, `VA.partPins(...).outside`) is
reached from the rails by a stub. Its leader starts at the pin and runs flat,
right, through the block to the grid. Inside the block it crosses every chord
(an internal dimension of that part) whose bow spans the pin's height.

Measured in the browser by `tests/debug_block_shots.mjs` (`measurements.json`
in the lesson's shots folder; 40-point polylines, a hit within 1.5 px of an
end not counted):

| page | leader × chord |
| --- | ---: |
| whole walk | 11 |
| kinematic study | 3 |
| U10H grip budget | 0 |
| cotter hole | 0 |

On the rails there are no chords, so this crossing class is new with the
blocks. `VA.layoutCrossings` does not count it: its leader term counts
leaders against rails and links only.

Two ways out, neither taken by the handoff:

- **Route the leader out of the block's top or bottom margin.** The leader
  would leave the pin, turn up or down to the block's margin, and run right
  from there. The cost is a third segment on every rail-side pin's leader, and
  two leaders in one margin would share a height. The leaders' no-crossing
  rule rests on one leader per height.
- **Draw the chords on the right half of the block only.** A left pin's
  leader would still cross the block's border, but no chord. The cost is that
  a chord between two left pins has nowhere to bow.

Low priority: a leader is a thin, muted line, and the crossings are inside
one part. Raised by the review of the handoff (finding 4), from the
lesson's own table.
