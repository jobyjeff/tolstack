---
type: bug
priority: low
status: resolved
area: tests/browser (3D pane suite)
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261102_the_browser_tier_is_green_on_trunk_again.md
handoff: docs/sessions/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
resolution: handoff completed 2026-11-05 -- closed automatically by dispatch when handoff `the_seam_and_rail_checks_wait_on_settled_state` moved to completed/; not independently verified.
---

# The unbound contributor-row hover check fails in a loaded full run and passes alone

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (a full run,
1294 s wall, 2026-11-02, base `03880aca` plus this handoff's test-only changes):
`3D pane follows the selection (sweep, bind, reload, hover)` was 31/32, failing on

    [real] resting on a contributor row with no binding tints nothing, and the annotator says so in its console line rather than its banner

When the suite was re-run alone, that sub-check passed. (Four other sub-checks failed
instead, see `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`.)
The check is `scripts/run_viewer_browser_tests.mjs` around line 7240. It hovers the
unbound row, then waits up to 10 s for `__lastHighlight === null`. That is a wall-clock
ceiling, not an event, and the hover crosses the pane's message seam. The fix shape is
the class lever: wait on the pane's own highlight message for that row (or poll the
settled state with no tight ceiling), not on a 10 s window.

## Review note 2026-11-02

The cause above is a hypothesis, not a measurement. The check is a conjunction of
three things — `cleared` (the 10 s wait), `/no binding/.test(said)` and the banner
not saying it — and the red run did not record which one was false. A
`__lastHighlightNote` written after `__lastHighlight` is cleared would fail the
second conjunct with the first already true, and no ceiling would fix that. Whoever
picks this up: log the three values on failure first, then choose the fix.

## Addendum 2026-11-04 (the_browser_tier_reds_left_after_the_slide_re_author)

One cause of the 3D pane suite's moving reds since 11-03 is now known and
fixed, and it is not this issue's. `4c0b7c62`'s `isolate parts` scope loads
the whole assembly, usually before the sweep's open loop, so `openedBySweep`
came out empty or not depending on which side won. The synthetic binding and
the hover/click checks keyed on it. They now read `sweep.anchored`. After that
fix the suite was 32/32 alone and 32/32 inside a full run (1425 s). This
issue's own failure predates `4c0b7c62`, and two green runs cannot clear a
flake, so it stays open. `clearPoint`'s sideways scroll was also put back (its
grid-row hover had been falling back to a synthetic `dispatchEvent` at 1600
wide), and that may have been part of this too. That part is unmeasured.
