---
priority: high
depends_on: [the_base_stack_joints_are_seat_boss_and_pattern]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — the_blade_and_piston_joints_are_authored_as_what_the_parts_show: the remaining joints inside a body get the constraints their geometry has

Source: Jeff, 2026-11-10: blade ↔ pitch arm, pitch plate ↔ piston and piston ↔
head "have variants of the same style" (flange, locating boss, fastener
pattern). Jeff, 2026-11-17: build the model out in more detail. Baseline:
`master` with `the_base_stack_joints_are_seat_boss_and_pattern` merged — read
its lesson first; it is the worked example and names the tools it used.
Fourth of a chain of six; a walk follows and writes Jeff's review page.

Scope: `docs/topologies/topology_vpa_end_stop_v2.json`, the tests that pin its
counts and its model view, `docs/DAG_TOPOLOGY.md` where it describes v2. Read
v1 for ids; do not edit it. `apps/` only as item 4 allows. Do NOT touch the
map's layout file.

**Jeff's real binding log is read-only**
(`C:\workspace\tolstack\data\inbox\feature-identity\`): count its files
before and after; any bind you try goes to a scratch data root.

## The joints, and what v2 has for each today

| Joint (both parts in one body) | Authored today |
|---|---|
| blade bonded assembly ↔ pitch arm | a seat, `pitch_arm_root_seat`. v1 also has `pitch_arm_blade_root_clocking` (`fastener_pattern` since `a_joint_says_what_kind_it_is`) |
| pitch plate ↔ gas-spring piston body | a boss only: `pitch_plate_pilot_in_piston` (`pin_in_bore`), no seat, no pattern |
| piston body ↔ lower piston head | a seat, `piston_body_head_seat` |
| lower piston head ↔ upper piston head | a seat, `piston_heads_seat` |

"Variants" is Jeff's word and nobody has written down what each variant is.
**That is the work**: the geometry says it.

## Deliverables

1. **For each of the four joints, say which constraints the two parts' meshes
   show**: a seat (faces in contact), a locating fit (a coaxial boss and bore,
   or a thread), a fastener pattern (a ring of like holes on both parts), and
   anything else that locates one part on the other (a key, a pin, a second
   seat). Same method and same evidence as the previous handoff's item 1 —
   face ids, diameters, hole count and circle — recorded in the lesson and in
   each new node's or edge's `note`, as evidence the feature exists and never
   as a value.
2. **Author the constraints that are plainly there**, in the shapes the model
   already uses: a shared node for a seat, a `pin_in_bore` or `thread` gap
   edge between a datum feature on each part for a fit, a shared node with
   `interface: fastener_pattern` for a pattern; structural edges on each part
   tying a new feature to its existing ones, with no dimension and a "what
   would close it" sentence. v1's ids where v1 has the feature
   (`pitch_arm_blade_root_clocking` is one). Naming per `docs/DAG_TOPOLOGY.md`,
   "Naming a feature".
3. **Anything unclear is a question, not a guess.** Where the geometry is
   ambiguous (two candidate bosses, a pattern on one part with no partner, a
   contact that might be a clearance), author nothing for that constraint,
   put it in one issue with `needs: jeff` — a table of joint, what was found,
   the question, a shot each — and carry on. The walk after this handoff
   copies that table onto Jeff's review page.
4. **Counts, pins and the page**, exactly as the previous handoff's items 4
   and 5: update the count pins, rebuild against a scratch data root, look at
   the map (bundles inside the blade's and the pitch plate's districts; a
   bundle between two boxes stacked in one column must still read — say if it
   does not), the tree and the grid. A few-line defect is fixed and named; a
   larger one is an issue.

## Definition of done

- v2 on your branch's page shows each of the four joints with the constraints
  found; shots at 3840 Side by side and a crop per joint in
  `docs/sessions/lessons/shots/<slug>/`, read with vision.
- The exploratory click-around on the real projection; tests per `CLAUDE.md`'s
  table.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md`):
  the table — joint, seat / fit / pattern / other, authored ids or "asked",
  evidence — the counts before and after, the feature-identity file count
  before and after.
