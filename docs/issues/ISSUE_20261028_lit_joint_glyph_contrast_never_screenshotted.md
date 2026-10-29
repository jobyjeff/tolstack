---
type: chore
priority: low
status: open
area: viewer
reporter: agent
---

# Lit joint glyph vs `rail__glyphbg` disc contrast was reasoned, not measured

`the_lit_set_closes_over_its_joints` deliverable 3 asked for a contrast check of
the `rail__glyphbg` disc against a lit bar at both themes. The tactical agent
left the CSS unchanged on a reading of the stylesheet; the browser tier pins the
class (`rail__glyph--on`, no `--off`), not pixels. Take one screenshot of the real
kinematic page, "Unused: dimmed", light and dark, and confirm the disc does not
hide the bar and the glyph reads. If it does, switch the disc to the bar's colour
at reduced alpha as the handoff described.

Also noted for strategy: `VA.bridgeLitSet` lights structural edges no contributor
names (3 edges, 2 nodes on the real study) to make hidden mode one drawing; the
choice among equal-length paths is arbitrary (pinned as `LIVE_BRIDGE`).
