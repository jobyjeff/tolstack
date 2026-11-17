---
type: chore
priority: low
status: closed
resolution: closed 2026-11-17 without action -- Classic and its glyphs retired (handoff the_map_is_the_only_drawing_and_classic_retires); the map draws the rotary joint as VA.MAP_SYMBOLS.revolute
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_a_joint_says_what_kind_it_is.md
---

# Design: Classic's rotary glyph arrow is crossed by a chord at row pitch

Handoff `a_joint_says_what_kind_it_is` (2026-11-17) added the `revolute` glyph
to `apps/viewer/interface_glyphs.js`. It is the pin-in-bore ring plus a turning
arc with an arrowhead, drawn at Classic's row pitch. On the hub's block in v2
(`docs/sessions/lessons/shots/a_joint_says_what_kind_it_is/14_classic_revolute.png`)
an edge's chord runs across the arc, so the arrow is hard to read and the glyph
looks much like the plain pin-in-bore ring. The map draws the large symbol and
reads cleanly (`19_three_round_symbols_side_by_side.png`).

The tactical lesson saw this and left it because Classic is slated to retire.
That is a fair call. This file keeps it on the queue in case Classic outlives
the plan: for example, the arc could get a background-coloured halo like the
map's `mask`, or the glyph could be drawn above the chords.
