---
type: chore
priority: low
status: open
area: design
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
---

# The rail's indent step and the grid's brace inset are two numbers on two branches

The rail handoff asked for its indent step to be "measured against the grid's
new brace indent so the two surfaces agree". The grid's brackets were being
built at the same time on `handoff/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`
and are not on this branch's baseline, so nothing on either branch can read the
other's number:

- **Rail:** `--tree-step` in `apps/viewer/topology.css` `.navtree__scene`, one
  level per step, with a hairline guide from the parent's twisty. Chosen wide
  enough that a candidate face (level three) sits clearly in from its joint:
  Jeff's note called the old step "way too shallow".
- **Grid (other branch):** `VA.GRID_BRACE.inset` in `apps/viewer/views/topology.js`,
  the per-level inset of each bracket side and of a row's first words
  (`braceIndent`). On that branch it is roughly a third of the rail's step.

They measure different things. The grid's inset is a bracket's offset, and
the bracket draws the nesting. The rail's step is the only nesting cue apart
from the guide line. So "agree" is a design question, not a copy: equal
pixels, an equal ratio, or both reading one token.

**Options.** (a) Once both land, the grid's brace inset reads `--tree-step`
(or a fraction of it) from one `:root` token. (b) Keep two numbers, and the
design doc says why they differ. (c) Change the rail to the grid's inset.
Jeff has already rejected that depth as too shallow.

**Recommendation:** (a), as a single `--nest-step` token in `apps/viewer/style.css`
`:root`, read by both, after the grid branch is on integration.
