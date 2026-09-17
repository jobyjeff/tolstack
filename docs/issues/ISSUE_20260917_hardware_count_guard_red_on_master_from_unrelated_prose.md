---
type: bug
priority: high
status: triaged
handoff: docs/sessions/HANDOFF_20260917_prose_guards_scope_out_strategy_briefs.md
area: tests/doc-guards
reporter: agent
---

# The hardware-entry count guard is red on `master`, from a false positive on "the other three do not have"

**Failing test (the only failure in the suite).**

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
E   live documents state hardware-entry counts that disagree with
E   docs/tolerance_stacks/hardware_entries.json:
E     docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
E     says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

`venv-win/Scripts/python.exe -m pytest -q` on `integration` at `4a0a6f1`, run in
a throwaway worktree for the 2026-09-17 batch merge: **1 failed, 1198 passed,
1 skipped in 22.47s**.

**It is a false positive, not a stale count.** The `_COUNT_CLAIMS` shape

```python
("entries that do not defer to the spec library",
 rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
```

matches ordinary English in the brief, which is talking about its own numbered
origin-posture cases and says nothing about hardware entries:

> ...and it is the one case where the standing rule and the honest answer may
> genuinely diverge, for a reason **the other three do not** have:

`_NUM` accepts spelled-out numerals, so "the other three do not have" is read as
a claim that 3 entries do not defer to the spec library. The recount is correct:
`hardware_entries.json` has 29 entries, 1 `library`, so `not_library` is 28.
This is the second guard this one brief has tripped in the same way — see
`ISSUE_20260916_byte_identity_guard_is_red_on_master_from_a_triage_brief.md`,
resolved by rewording the prose rather than loosening the scanner.

**Pre-existing on trunk; `integration` is not implicated.** Verified directly in
the main checkout on `master` at `a1aa418`:

```
cd C:\workspace\tolstack
venv-win/Scripts/python.exe -m pytest -q tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
1 failed in 0.80s
```

`master` and `integration` hold identical copies of the offending sentence
(line 152 is byte-identical on both) and identical `hardware_entries.json`
counts (29 total / 1 library / 28 not_library on both). The claim shape is
present in the test on both branches (`master` line 2306, `integration` line
2830). The brief arrived on trunk via `78305fc` — "triage 2026-09-16: 39 issues
dispositioned" — so this is a docs-guard catching prose, not a code regression
from the 104 commits on `integration`.

**Blast radius.** It gated the 2026-09-17 batch merge of `integration` into
`master` (104 commits), reported `skipped-red` rather than merged. Because the
failure is pre-existing on trunk, merging would not have made trunk any redder:
an operator may reasonably choose to fix the one clause of prose (or add a
negative-lookahead / sentence-scoped guard to the claim shape) and re-run,
rather than hold the batch a second time.

**Already reported four times, on `integration` only.** Nothing recorded this on
`master`, so trunk had no record and the next session rediscovers it — the exact
failure mode the byte-identity issue documented. This file exists to *name* the
pile so it collapses to one:

- `docs/issues/ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_count_guard.md` (med)
- `docs/issues/ISSUE_20260916_hardware_count_guard_matches_other_three_do_not_in_unrelated_prose.md` (high)
- `docs/issues/ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md` (high)
- `docs/issues/ISSUE_20260916_hardware_count_guard_regex_matches_ordinary_prose.md` (high)

Whoever fixes this should close all five.

**Two fixes, and the choice is a judgement call** — which is why this is an
issue and not an inline edit:

1. Reword the brief's clause so it stops looking like a count claim (the
   precedent set by `1f62803` for the byte-identity guard). Cheapest, but it
   leaves a scanner that will keep tripping on ordinary English.
2. Tighten the `other (N) do not` shape so it must name its subject (e.g.
   require `entries` within the sentence, as the other shapes do). Fixes the
   class, and the guard's own docstring already concedes the shape list is the
   honest weak point.
