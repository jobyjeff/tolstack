---
type: bug
priority: high
status: open
area: tests/doc-scans
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# `test_no_live_document_states_an_unguarded_hardware_entry_count` is red on `integration` — it reads "the other three do not have" as a hardware-entry count

`integration` is red, and has been since the 2026-09-16 triage sweep landed a
strategy brief. `venv-win/Scripts/python.exe -m pytest -q` at `70241ce`:

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
1 failed, 1154 passed in 39.61s          # main checkout
1 failed, 1153 passed, 1 skipped in 42.23s   # a worktree (one [real] test skips)
```

> **Corrected in review, 2026-09-16.** This block first quoted
> `1 failed, 1154 passed, 1 skipped` for `70241ce`, which is the *post-merge*
> worktree count — the fixing handoff adds one test. Both lines above were
> re-measured at `70241ce` itself.

```
docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
  says 3 entries that do not defer to the spec library;
  hardware_entries.json has 28
```

## It is the guard that is wrong, not the brief

The brief's line 152 is about the four items of the brief itself, and says
nothing about hardware entries at all:

> **Why it is a distinct instance of the same question, not a restatement of
> items 1–3.** … it is the one case where the standing rule and the honest
> answer may genuinely diverge, **for a reason the other three do not have**

The shape that matched is in `tests/test_tolerance_stack.py`'s `_COUNT_CLAIMS`
(line 2306):

```python
("entries that do not defer to the spec library",
 rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
```

`_NUM` accepts spelled-out numbers, so `other three do not have` matches —
three words of ordinary English, in any live document, about anything. The
pattern carries no anchor tying it to entries, to the spec library, or to
hardware at all. Every one of the other eight shapes in that list names
`entries` or a specific artefact (`NAS`, `not_transcribed`, `workbook`,
`source-control drawings`); this one and `other\s+(N)\s+are\s+safe` are the two
that do not, and "are safe" is at least an unusual thing to write.

## Why this is `high`

It is not a wrong number anywhere — it is a green suite made red by prose that
is correct, on the branch **every worktree is cut from**. Two costs:

1. Every session's "full suite green" definition of done now needs a paragraph
   explaining a failure it did not cause. This session wrote that paragraph;
   the next four will too.
2. It teaches the wrong lesson about the doc-scan guards. The guard's own
   docstring says the honest reading is *"the ways this repo has gone stale
   before are now mechanical"*. A shape that fires on unrelated English is a
   guard a future author will be tempted to work around by rewording good
   prose, which is how a doc scan stops being trusted.

## Repro

```
git checkout integration
venv-win/Scripts/python.exe -m pytest -q tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
```

## Not fixed here, and the shape of the fix

Out of scope for `mutation_witness_tier_reaches_its_checks`, whose handoff
fences it off `docs/` prose and the tolerance-stack tests. The fix is a
decision, not a patch, which is why this is filed rather than guessed at:

- **anchor the pattern** — require `entries` (or `spec library`) near the
  number, the way the other eight shapes do. Cheapest, and it narrows what the
  guard catches, which is the trade the guard's docstring already accepts
  openly;
- **or scope the scan** — these claims are about `docs/tolerance_stacks/`, and
  `docs/strategy/` briefs are a different kind of document. `live_documents()`
  currently sweeps both. Scoping is a bigger call: a stale count in a brief is
  still a stale count.

Whoever takes it should also check `other\s+(N)\s+are\s+safe` for the same
looseness, and keep `test_the_hardware_entry_count_guard_can_fail` honest —
narrowing a pattern until nothing matches is the other way to make this green.
