---
type: bug
priority: low
status: open
area: scripts/run_viewer_browser_tests.mjs (3D pane follows the selection suite)
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/active/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
---

# "3D pane follows the selection" fails four nav-body sub-checks in a loaded full run

During `viewer_browser_checks_wait_on_settled_state`, run 2 of 5 of
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (a full
default-tier `pytest -q` overlapping it) failed 28/32 in this suite; runs 1, 3 (and 4-5, see the lesson) passed 32/32:

- `[real] a click on a body's disclosure in the nav flips it, in the nav and in the annotator's own tree`
- `[real] a body's checkbox in the nav hides that body in the scene, and the box reads unticked after the redraw`
- `[real] ...and ticking it again shows the body`
- `[real] a part row's second button in the nav acts on that part, not on the row's first button`

Same class as the four fixed by that handoff (a read taken before the nav's redraw has
settled), but these are different sub-checks in a suite it did not scope. Fix shape:
poll for the nav row's state after each click with a deadline of seconds.
