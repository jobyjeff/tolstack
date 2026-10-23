---
type: chore
priority: med
status: deferred
area: tests/mutation-witness
reporter: agent
class: suite_over_budget
defer_until: 2026-11-05
found_by: dispatch/docs/sessions/lessons/LESSONS_20261022_triage_sweep.md
resolution: triage 2026-10-22 (second sweep): med beyond this sweep's BUDGET=3 for tolstack (3 staged); deferred 14 days (the class has no program)
---

# The mutation-witness full registry runs 76 minutes against a 30-minute merge-tier budget

The batch merge's merge-only tier, run in the main checkout at `ceac363`
under the browser slot, with no other slot holder waiting:

```
node scripts/run_mutation_witness_tests.mjs --full
```

**4575 s (76 min), 299/299 witnessed, exit 0.** Recorded with `suite-time
record --tier merge`: **OVER BUDGET by 46m15s**. The dispatch
`a_suite_past_its_budget_files_its_own_issue` lesson measured 3916 s (65 min) on
2026-10-20, so the tier grew 11 minutes in two days. It also holds the
workstation's single browser slot for its whole run, which is what queued
drawing-checker's candidate for 2 hours at the first 2026-10-22 sweep (dispatch
`LESSONS_20261022_triage_sweep.md`, item 1).

The runner's per-spec timing is in its own output; the 2026-10-22 run's log
was kept in the triage session's scratch space, not in the repo, so re-run
and start from its slowest specs. Candidate levers: shard the registry so
specs that share no browser state run in parallel, or reuse one built viewer
per spec family instead of rebuilding.
