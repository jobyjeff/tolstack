---
type: chore
priority: med
status: open
area: docs/topologies citations / tests
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
---

# The gas-spring mount export has a sixth run the pitch-linkage topology does not list

`tests/test_export_runs_match_the_run_log.py::test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`
is red on this branch's default tier (2026-11-19, worktree, 362 s run), and
nothing in the branch's diff touches what it reads. drawing-checker's run log
(`C:\workspace\drawing-checker\data\runs.jsonl`) recorded a new run of the
213668-002 export today:

```
docs/topologies/topology_vpa_pitch_linkage.json $.edges[33].dimension.source_ref.export:
  lists 5 run(s), the log records 6 for sha256 dea285f5...
  missing ['20261119_132629_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER']
```

Same for `$.edges[36]`, `$.edges[54]` and `$.edges[56]`. The fix is the
test's own instruction: add the run to each export's `runs`, with its `ts`
copied from that run's `run_meta.json`. Every branch's `pytest -q` is red on
this until it lands, so a reviewer should expect it on any branch cut before
the fix.
