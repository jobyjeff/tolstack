---
type: chore
priority: med
status: open
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
---

# The viewer browser TRUTH tier ran 50 m 54 s, recorded against the merge budget

Measured 2026-11-06 from the worktree of
`the_rail_reads_as_a_tree_of_bodies_joints_and_faces`:

    node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack

took 3054 s by the shell's clock (42 suites, 39 green on that run). The run
went straight after `node apps/annotate/run_browser_check.mjs`, which took
2337 s itself. `dispatch suite-time record tolstack --tier merge` answered
`OVER BUDGET by 20m54s`.

**What the figure includes.** It is wall time from the command's start, so any
time spent queued for the machine's one browser slot is in it. The run's
`waiting for browser slot` lines were filtered out of the captured output, so
this record cannot split queueing from running. The same caveat is in
`ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`
for the witness gate.

**What would settle it.** The runner prints when it gets the slot. Recording
the time from that line to the summary line would give the tier's own length.
If that is still past the budget, the next question is which suites dominate.
This session did not time suites one by one.
