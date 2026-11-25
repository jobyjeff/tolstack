---
type: bug
priority: med
status: triaged
area: annotate/form
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
handoff: docs/sessions/HANDOFF_20261125_a_write_from_the_form_or_the_menu_never_vanishes_without_a_word.md
---

# Play with a form open discards its unsaved set without a word

Seen on the walk of 2026-11-24 (v2, sweep `vpa pitch chunk2 p2`, scratch data):
open the tangential link mount pilot bore's form in sweep mode, put a face in
the set, press ▶ on the bar (or Space, or a step, or drag the scrubber). The
pose moves, `transportEndsArm` lets the edit go (`disarmPick("moved")`), and the
shell closes the form because the pane's tree no longer carries an `edit`. The
faces put in the set are gone; nothing was written and nothing said so.
Shot: `docs/sessions/lessons/shots/right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays/after_sweep_playing_form.png`.

That handoff kept the form's behaviour out of scope. The same happens at
baseline (it is the arm's 2026-10-29 rule, from before the form existed:
a transport verb ends the pick).

Options: (a) while a form is open the transport is disabled (the as-modelled
pose is what binding needs); (b) a transport press with a changed set asks
nothing but keeps the edit, and the pose comes back to as-modelled at the tick;
(c) the form says the set was dropped. (a) is the smallest and matches "a
binding is identity, recorded against geometry sitting in the pose the model
was built in".
