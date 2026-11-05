---
type: bug
priority: low
status: open
area: tests/browser (suite file://)
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
---

# "suite file://" times out loading its page at the start of a loaded full run

In the second of three loaded full runs for
`the_seam_and_rail_checks_wait_on_settled_state`, the browser tier's **first**
suite never loaded its page:

```
[suite file://] ERROR loading suite (file:///C:/workspace/tolstack-worktrees/the_seam_and_rail_checks_wait_on_settled_state/apps/viewer/test.html): page.goto: Timeout 30000ms exceeded.
40/41 browser checks passed
FAILED: suite file://
```

That run was `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
from the worktree, 1529 s wall. A default `pytest -q` started at the same
second, so the goto ran while pytest was importing and collecting. The other
two loaded runs that day, and the baseline, loaded it fine. `suite http`
(the same page, served) passed in the same run straight afterwards. Nothing in
`apps/viewer/test.html` or `runSuite` changed on that branch.

`runSuite` (`scripts/run_viewer_browser_tests.mjs`) calls
`page.goto(url, { waitUntil: "load" })` with Playwright's default 30 s ceiling.
It is already an event wait, so the class lever ("wait on an event, not a
window") does not hand over a fix directly. The ceiling is the only window
left, and raising it is the move the 10-29 rail-filter fix showed is not a fix.
What to find out first: what the page is waiting on for 30 s under load. It
could be a script that is slow to parse, or a `load` held by a resource.
`page.on("requestfinished")` timings, or a `domcontentloaded` wait then a poll
for `window.__TEST_RESULTS__` with its own deadline, would show which.
