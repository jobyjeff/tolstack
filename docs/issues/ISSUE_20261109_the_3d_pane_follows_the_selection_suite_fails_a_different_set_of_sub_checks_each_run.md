---
type: bug
priority: med
status: deferred
area: viewer/browser-tests
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261109_the_demo_path_reads_cleanly_on_a_projector.md
defer_until: 2026-11-24
class: flaky_browser_suite
resolution: deferred 2026-11-10 (triage) -- med beyond BUDGET=3; viewer selection/layout files are the strategy thread's F1b/F1c sequence (dispatch/docs/strategy/HANDOFF_20261109_strategy.md)
---

# "3D pane follows the selection" fails a different set of sub-checks each run

Found by the review of `the_demo_path_reads_cleanly_on_a_projector`. The
suite ran three times on 2026-11-09, against the main checkout's projections,
and nothing else held the browser slot. It went red each time, on a different
set of sub-checks:

| Tree | Run | Result | Failing sub-checks |
| --- | --- | --- | --- |
| review merge (`3cab31a1`) | full tier | 31/32 | `[real] clicking a contributor row in the nav selects it in the scene, and the row shows it selected` |
| review merge (`3cab31a1`) | `--only "3D pane follows the selection"`, 203 s | 28/32 | the four chain-study sub-checks: leaves sweep mode, head line follows into bind mode, nav nests the study's elements, clicking one selects it |
| integration `5fec3b0f` (detached worktree) | `--only`, 357 s | ABORTED after 19, 17 FAILED | from "the seam's handle opens the pane, booted on the study's run" onwards: the pane never booted on the run |

The branch under review does not touch the nav tree, the sweep rail or the
pane's boot path. Integration, which lacks the branch, is the worst of the
three. So this is integration's, and it is timing-dependent: the failing
checks are the ones that wait on the embedded annotator's answer (`until(...,
10000)` on `__lastInspect`, the mode switch, the boot).

**What would close it:** log the wait that lapsed. Which `until` timed out,
and what `__lastInspect`, the mode and the head line held at that moment.
Then decide whether it is a slow boot under load or a lost message. Do not
just raise the timeouts.
