---
type: bug
priority: low
status: open
area: viewer/pane
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261112_one_selection_one_hover_and_leaders_off.md
class: one_key_two_owners
---

# Escape does not let go of the selection while any mirrored control reads pressed

The page's Escape (`apps/viewer/topology_app.js`, the keydown near
`wirePopover`) lets go of the frozen Preview unless "something else on the
page owns the key right now -- a modal dialog, or an armed pick in the scene",
and it decides the second case by `VA.sceneRowsPressed(sceneTree.rows)`: any
mirrored row with a pressed button, or (since 2026-11-10) a pressed action
row. The pane's tree carries more pressed controls than an armed pick's
Cancel: a part row's **Isolate** button (`aria-pressed="true"` while a part is
isolated -- the sweep posts `isolate parts` itself when it loads) and the type
chips (pressed while a kind is shown, which is the default).

Measured 2026-11-12 (review probe for `one_selection_one_hover_and_leaders_off`,
the end-stop model with the P2 sweep loaded and a feature selected from the
tree, nothing armed): Escape posted `arm off` to the pane and the selection
stayed -- the feature row `--on`, its body open, the pane's end row selected.
There was no armed pick to cancel. Pre-existing: the buttons half of
`sceneRowsPressed` predates this handoff, which only added the action-row
half; reproduced on the merged tree, not attributed to either.

Fix shape: the shell should ask the pane whether a pick is **armed**, not
whether anything is pressed -- the tree already carries the armed row's
state line (`AA.ARMED_PICK_WORDS`), or the pane could put `armed: true` on
the tree message. `sceneRowsPressed` would then be the Esc-to-Cancel test
only for the one control that means it.
