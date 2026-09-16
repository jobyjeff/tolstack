---
type: bug
priority: med
status: open
area: tests/doc-scan
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
---

# "the other three do not have" in a strategy brief reads as a hardware-entry count claim, and the Python suite is red because of it

`venv-win/Scripts/python.exe -m pytest -q` on `integration` at
`1b3848b` is **1 failed, 1175 passed, 1 skipped**:

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
  says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

**It is a false positive, not a stale number.** The guard's claim pattern for
"entries that do not defer to the spec library" is

```python
("entries that do not defer to the spec library",
 rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
```

and the brief's line 152 is ordinary English about its own numbered items:

> …for a reason **the other three do not** have: **`?mock=1` is a real way
> forward.**

Nothing on that line is about hardware entries. The pattern is the only one in
`_COUNT_CLAIMS` with no noun of its own — every sibling anchors on `entries`,
`traced`, `NAS`, `not_transcribed` or a `source-control drawing`, and this one
anchors on nothing but `other N do not`, which is a phrase any prose can
produce.

**Not mine to fix.** Found while running the suite for
`topology_grid_scroll_and_grips`, whose diff is `apps/viewer/**`,
`scripts/run_viewer_browser_tests.mjs` and `tests/debug_*`; it touches neither
the brief nor the guard, and the failure reproduces with those changes reverted.

**Shapes worth weighing** (this is a guard-design question, hence the
`_COUNT_CLAIMS` comment about keeping a match "inside roughly one sentence"):

1. anchor the pattern on its own noun, the way its eight siblings do —
   `other\s+(N)\s+do\s+not\s+[^.]{0,40}?\b(?:defer|entries)\b` or similar;
2. scope the scan to the documents that actually state hardware-entry counts
   (the README, the SOP, `hardware_entries.json`'s own description) rather than
   to every live document including `docs/strategy/`;
3. reword the brief. Cheapest, and the worst of the three: it leaves the
   pattern able to redden on the next brief that writes the same five ordinary
   words, and a doc-scan guard nobody can write prose around gets edited out
   rather than fixed.

Repro: `venv-win/Scripts/python.exe -m pytest -q tests/test_tolerance_stack.py -k unguarded_hardware_entry_count`.
