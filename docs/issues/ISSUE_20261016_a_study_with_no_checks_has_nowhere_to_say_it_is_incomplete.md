---
type: feature
priority: low
status: resolved
area: topology/study schema
reporter: agent
audience: strategy
handoff: docs/sessions/HANDOFF_20261022_a_study_says_it_is_incomplete_without_inventing_a_check.md
found_by: docs/sessions/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
resolution: handoff completed 2026-10-22 -- closed automatically by dispatch when handoff `a_study_says_it_is_incomplete_without_inventing_a_check` moved to completed/; not independently verified.
---

# `complete` and `excluded_terms` live only on a check, so a check-less study cannot be marked incomplete

A study with no requirement number to check against carries `no_checks_reason`
and no `checks`, exactly one of the two (`DAG_TOPOLOGY.md`). But `complete` and
`excluded_terms` are fields of a check. The end-stop travel study is wholly
placeholder yet has no field that says so; it says it in a note, which nothing
reads, and the viewer shows the interval with no incompleteness badge from the
study itself (only the edges' own `untraced` source_refs).

The handoff asked for `complete: false` with every placeholder in
`excluded_terms`; the only way to do that today is to invent a limitless check
whose criterion has no requirement behind it, which this repo's rule against
inventing forbids. Needs a design call: a study-level `complete`, or a check
shape with no criterion.
