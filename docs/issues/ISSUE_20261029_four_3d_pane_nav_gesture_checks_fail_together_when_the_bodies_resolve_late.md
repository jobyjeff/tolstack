---
type: bug
priority: low
status: open
area: tests/browser
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
defer_until: class:timing_assertion_under_load
resolution: triage 2026-10-30: low, deferred onto the timing_assertion_under_load program (forge browser_runner_witness_holds_whatever_the_box_does, staged this sweep); reclassed from load_sensitive_browser_check, which had no registry row and names the same shape -- woke 2026-10-30 -- browser_runner_witness_holds_whatever_the_box_does completed; re-triage
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

## Addendum 2026-10-29 (review)

The review ran the full browser tier on the merged tree, against a scratch
root built from that tree (`--repo data/scratch/review_face_pick`): **34/36**.

- "3D pane follows the selection" failed 31/32, on a different sub-check from
  the four above: `[real] ...and leaving it takes the light down`.
- "crop lightbox (launch, zoom, pan on the live crops)" ABORTED. "the launcher
  takes keyboard focus and becomes visible" failed, then
  `waitForSelector('#crop-lightbox[open]')` timed out at 10 s.

Re-run alone with `--only`, minutes later, both were green (32/32, 20/20). The
lightbox check calls `.focus()` directly, so the new `#nav-divider` in the tab
order is not in its path. Same class: a check that does not wait on settled
state, and goes red under a contended box.
