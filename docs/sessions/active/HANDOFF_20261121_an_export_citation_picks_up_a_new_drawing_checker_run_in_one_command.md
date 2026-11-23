---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-21 — an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command: list the gas-spring mount's sixth run, and make the next new run a one-command fix

Source: triage batch merge 2026-11-21
(`dispatch/docs/sessions/lessons/LESSONS_20261121_triage_sweep.md`), routing
`docs/issues/ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
Baseline: trunk after the 2026-11-21 batch merge. Scope:
`docs/topologies/topology_vpa_pitch_linkage.json` (the `runs` lists only),
`tests/test_export_runs_match_the_run_log.py`, and a new script under
`scripts/`; do NOT touch any other topology content or drawing-checker.

## The red

`tests/test_export_runs_match_the_run_log.py::test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`
is red on trunk and on every branch:

```
docs/topologies/topology_vpa_pitch_linkage.json $.edges[33].dimension.source_ref.export:
  lists 5 run(s), the log records 6 for sha256 dea285f5...
  missing ['20261119_132629_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER']
```

and the same for `$.edges[36]`, `$.edges[54]`, `$.edges[56]`. The log is
`C:\workspace\drawing-checker\data\runs.jsonl` (read-only; another repo's
gitignored data). Nothing in tolstack changed; a drawing-checker run on
2026-11-19 consumed the export.

## Deliverables

1. **The instance.** Add the sixth run to each of the four citations' `runs`,
   its `ts` copied from
   `C:\workspace\drawing-checker\data\runs\20261119_132629_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER\run_meta.json`
   (check the path; the SOP's "Which export" says how `ts` is spelled).
2. **The class.** Any new drawing-checker run on an already-cited export
   reddens every tolstack branch's default tier, by design (the guard is right:
   `runs` means every consuming run). What is wrong is that the fix is a hand
   copy each time. Suggestion: a `scripts/` command that reads the log and
   rewrites each established export's `runs` in place (verbatim `ts` per the
   SOP, no other byte of the JSON changed), and the guard's failure message
   names that command. Do not weaken or skip the guard.

## Definition of done

- The guard green in the main checkout; the script run twice is a no-op the
  second time; a test of the script on a fixture log.
- Default tier per CLAUDE.md.
- Lesson: the command, and what a reviewer should expect when the next run
  lands.
