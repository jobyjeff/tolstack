---
type: bug
priority: med
status: deferred
area: viewer browser tier
reporter: agent
class: guard_cannot_fail
found_by: docs/sessions/HANDOFF_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md
defer_until: 2026-11-19
resolution: triage 2026-11-05: med beyond BUDGET=3 (3 staged: the seam/rail settled-state class, the annotator declared face, the one-band cylinder fit), deferred 14d; class row has no landed program, so a date; a test-only finding with no dated wrong outcome, unstageable under the 10-27 guard rule
---

# clearPoint falls back to a synthetic event without saying so, so a grid row no pointer can reach still passes

`clearPoint` in `scripts/run_viewer_browser_tests.mjs` looks for a point on a
cell that `elementFromPoint` says is the cell's own. If it finds none, it calls
`locator.dispatchEvent("click" | "mouseenter")` and returns. It prints nothing
and records nothing.

`the_browser_tier_reds_left_after_the_slide_re_author` moved two more call
sites onto the helper: `real render path` (the companion-preview row) and
`crop lightbox` (the target row). Before that they used `locator.click()`.
That call fails when the row is covered, and that failure is how the
59px-slit layout came to light
(`ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`).
The lesson for that handoff also records that the helper's own hover had been
taking the synthetic path at 1600 wide without anyone knowing.

So if the grid becomes unreachable again, the browser tier now passes these
suites. It does so by handing the element an event that no reader could
produce, and the log looks the same as a real pointer pass.

**Smallest fix:** when the fallback is taken, print one line naming the
selector and the reason, for example
`clearPoint: no clear point on <selector>, synthetic <action>`. Then decide
per call site whether the fallback is allowed at all. Rows whose subject is
the pointer (selection, hover preview) should fail instead. A whole-page
leader overlap was the original reason for the fallback, and the call sites
that need it for that reason can keep it, named. Before you choose, measure
how often each site takes the fallback on the real projection.

Found at review. It is not a blocker: the fallback predates this handoff
(`fd4e733d`). The handoff's lesson reports that the converted sites now find
a real point because the grid's sideways scroll is put back. The review did
not instrument that, which is exactly the gap this issue is about.
