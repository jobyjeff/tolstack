---
type: bug
priority: low
status: open
area: tests/browser
reporter: agent
class: load_sensitive_browser_check
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
---

# Four 3D-pane nav gesture checks fail together when the bodies resolve late

`scripts/run_viewer_browser_tests.mjs`, suite "3D pane follows the selection
(sweep, bind, reload, hover)". In a full browser-tier run on 2026-10-29
(1123 s, worktree code, main checkout's data) these four went red together:

- `[real] a click on a body's disclosure in the nav flips it, in the nav and in the annotator's own tree`
- `[real] a body's checkbox in the nav hides that body in the scene, and the box reads unticked after the redraw`
- `[real] ...and ticking it again shows the body`
- `[real] a part row's second button in the nav acts on that part, not on the row's first button`

The same suite run alone, twice in the same session (before and after), was
32/32.

All four hang off one lookup: the first body row whose checkbox is **not
disabled**. The annotator leaves that checkbox disabled until the sweep's
bodies resolve (`subjectCheckbox`, apps/annotate/app.js), which is the slow,
un-awaited `anchorSweepBodies`. The lookup runs once, with no wait, so when
the bodies resolve late `bodyRow` is null and all four checks fail as one.

Fix shape: wait (bounded) for a body row with an enabled checkbox before the
lookup, the way the surrounding checks wait on their own selectors.
