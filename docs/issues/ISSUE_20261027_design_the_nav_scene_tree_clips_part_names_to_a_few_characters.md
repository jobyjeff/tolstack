---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261026_the_shell_seats_the_scene_beside_the_model.md
class: unreviewed_design_debt
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# Design: the nav's scene tree clips part names to a few characters, and lands below the fold

Read off the branch's own screenshots
(`docs/sessions/shots_20261026_shell_seats_the_scene/1600_chain.png`,
`1920_kinematic.png`) during the review of
`the_shell_seats_the_scene_beside_the_model`. Non-blocking, judgement-call
aesthetics.

- **Part rows are mostly controls.** In the 300px nav, a part row under a
  chain study carries a checkbox and two text buttons (Isolate, Remove) at all
  times, so the part number and name get about ten characters
  ("214699-002 gas sp…", "213668-002 moun…"). The full text is on hover
  (the row's `title`), so nothing is lost, but the line no longer identifies
  the part at a glance — the thing the row is for. Options: show the row's
  buttons only on hover/focus (the checklist's "controls subdued until
  hover"), or let the name wrap to a second line.
- **The tree arrives at the bottom of the nav.** The kinematic section is
  last in the nav, so the one-shot reveal (`revealSceneRow`) can only scroll
  to the end and the reader sees the chips and the first couple of rows
  (the lesson says so, `1920_kinematic.png`). Worth a look when the nav's
  order is next touched.
