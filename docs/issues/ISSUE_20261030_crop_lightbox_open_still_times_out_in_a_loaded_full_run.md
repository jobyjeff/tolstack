---
type: bug
priority: low
status: deferred
area: viewer/browser-tier
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261029_a_leader_starts_at_the_mark_it_names_on_every_tier.md
defer_until: class:timing_assertion_under_load
resolution: triage 2026-10-30: low, deferred onto the timing_assertion_under_load program (forge browser_runner_witness_holds_whatever_the_box_does, staged this sweep)
---

# The crop lightbox's open still times out in a loaded full run

`scripts/run_viewer_browser_tests.mjs`, suite "crop lightbox (launch, zoom, pan
on the live crops)". On 2026-10-30 it aborted after 2 sub-checks in a full
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` run
from a worktree, with `pytest -q` running alongside:

    page.waitForSelector: Timeout 10000ms exceeded.
      - waiting for locator('#crop-lightbox[open]') to be visible

Run alone right afterwards, the suite passed 20/20. This is the exact shape of
`ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md`
(line 27 there), which is marked `resolved`. The settled-state fix in
`ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md` (also
resolved) covered the launcher's focus, not this 10 s wait for the dialog to open.
Probably wants the same settled-state wait with a deadline of seconds instead of
the fixed 10 s.
