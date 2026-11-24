---
type: bug
priority: med
status: open
area: tests/browser
reporter: agent
class: real_suite_gated_on_live_log_state
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
---

# The right-click menus browser suite skips once Jeff binds the step face the menu offers

`scripts/run_viewer_browser_tests.mjs`, `testContextMenus`, runs only while the
served log (`feature-identity/log.json`) shows two things:

- the tan link mount's pilot bore is bound;
- `piston_head_upper_214698_002@piston_head_upper_step_face` has no `bound`
  event at all.

If either is false, the suite pushes one literal-`true`
`(skipped: …)` check and returns.

**Jeff's ordinary use flips the second condition.** The suite's last check is
the tree's **Bind the suggested faces** on that step face. That is the gesture
the handoff built, and it is offered in the tree on exactly that row (shot
`after_menu_tree_suggested`). The first time Jeff takes the offer, all ten
checks skip. Their ten witness specs become vacuous: a mutation "stays green"
in a second, the shape the tactical's lesson already measured once when its
own walk event was left in the served log.

**The conditions read the raw history, not the fold** (the "red variant" of
the same class). `stepBound` is `events.some(verdict === "bound")`, so a bind
Jeff later retracts keeps the suite skipped forever. The pilot condition takes
the last raw `bound` event. If Jeff retracts the pilot bore's binding, the
suite does not skip, but the row menu no longer offers Unbind, so
`edit,unbind` fails and the suite goes red for everyone.

This is the third sighting of the overlay entry "A `[real]` suite gated on
live log state that the feature itself invites Jeff to change"
(`docs/prompts/REVIEW_AGENT.md`; the first two were `testOppositePattern` and
`testAPressThatWritesSaysSo`).

**Fix shape:** give the suite a filtered copy of the log in which the step
face is unbound and the pilot bore is bound. Serve it through the same read
override `installRealAnnotatorReads` already provides, rather than reading
Jeff's live log. Or read the folded state, and pick the suggested feature
from whatever is currently unbound with one proposal set
(`VA.featureAcceptable`). That way the suite always has a subject.
