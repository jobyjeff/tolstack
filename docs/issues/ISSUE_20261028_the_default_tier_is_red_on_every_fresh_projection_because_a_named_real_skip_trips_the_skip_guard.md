---
type: bug
priority: med
status: open
area: viewer/tests
reporter: agent
class: guard_reads_a_finding_as_a_provisioning_gap
found_by: dispatch/docs/sessions/lessons/LESSONS_20261028_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261028_a_named_finding_skip_does_not_redden_the_default_tier.md
---

# The default tier is red on every fresh projection: a named `[real]` SKIP trips the worktree-skip guard

`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` fails whenever the
viewer's `[real]` tier runs against a fresh projection, because
`apps/viewer/tests.js` deliberately emits one named SKIP and the pytest wrapper
fails on **any** SKIP line:

```
SKIP  [real] a part sourced to both a drawing and a workbook qualifies the workbook and leaves the drawing alone
      no live part without a drawing cites both a verified and an unverified document since the 2026-10-26 fold gave the hub its drawing -- the per-document qualifier is unwitnessed on real data (ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness.md)
591/591 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED
```

Measured 2026-10-28 at the triage batch merge, on the merge candidate
(`28c6f783`, inputs bridged, projections rebuilt in the candidate with
provenance `sha12=28c6f7835177 dirty=False behind_trunk=0`):

```
PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q
1 failed, 1590 passed, 1 skipped, 2 deselected in 615.21s
FAILED tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green
```

It is **pre-existing on trunk**: the SKIP landed with `afc5a574` (2026-10-26,
"viewer: [real] checks and README follow the fold"). It has been read as "the
documented worktree-only failure" since (e.g. the 2026-10-27 measurement in
`ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`) — but
this run had every declared input bridged and a fresh projection, so it is not a
worktree artifact: the default tier is red on real data everywhere.

The wrapper's failure message says "this is almost always a worktree" and
prescribes `--repo <main checkout>`, which is wrong for this skip and will send
the next reader the wrong way.

## Why it matters

A default tier that is always red is a degraded gate: every batch merge and
every review now has to tell "still that one" from "that one plus something
new" by hand. `ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness`
was resolved by adding a fixture witness (`VA.demoMixedSourceTopology()`), and
its resolution notes the `[real]` check "is still a named SKIP on today's data"
— nobody connected that to the wrapper's any-skip rule.

## Fix direction (do not weaken the guard)

The wrapper's rule exists because a worktree's missing projection once read as
green (2026-09-18); it must keep failing on a provisioning skip. Distinguish a
*finding* (data that has no qualifying case) from a *provisioning gap* — e.g.
the `[real]` check reports its empty live set some other way than `skip()`
now that the fixture tier carries the witness, or the runner gives a named
finding its own line kind that the wrapper reports without failing while still
failing on a tier skip. Staged as
`HANDOFF_20261028_a_named_finding_skip_does_not_redden_the_default_tier`.
