---
type: chore
priority: low
status: deferred
area: annotate/scene
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
class: dead_code_after_retirement
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# The scene's bind leader is drawn by nothing

`apps/annotate/scene.js`'s `setBindLeader` (and the leader overlay it builds,
"The bind leader" near the top of the file) drew a line from a picked face to
the face bound at the other end of an element, before the bar's Bind. The
bar's bind instruction and its planner (`AA.planBindLeader`) were removed on
2026-11-24 (handoff
`right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`);
`renderDetail` now only ever calls `setBindLeader(null)`. The scene method, its
overlay group and its line material are dead code. Retire them, and the
`setBindLeader(null)` call in `app.js`'s `renderDetail`, in one change.
