---
type: chore
priority: low
status: deferred
area: tolerance_stacks/citations
reporter: agent
found_by: docs/sessions/HANDOFF_20261022_an_export_lists_every_run_that_consumed_it.md
class: citation_matched_by_prefix
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# The 2026-08 stacks cite runs by a short `YYYYMMDD_HHMMSS` id the run log does not spell

`stack_pitch_link_to_pitch_plate`, `stack_tan_link_to_pitch_plate`,
`stack_vpa_output_to_pitch_plate` and `stack_rotor_fastener_length` list runs as
`20260813_180734`; drawing-checker's `runs.jsonl` id is
`20260813_180734_215735-A`. `tests/test_export_runs_match_the_run_log.py` accepts
the `<listed>_` prefix for them, which is weaker than equality (an id ambiguous
within one second would cover every match). Spelling them in full means editing
tests that key on the short form (`_RUNS_CLEARED_WITHOUT_A_TIMESTAMP`, the
pitch-link run-set equality in `tests/test_tolerance_stack.py`) and
`scripts/build_viewer_crops.py`'s `_RUN_ID_RE` consumers. Then drop `resolve()`'s
prefix arm so the pairing is exact equality.
