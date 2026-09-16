---
type: bug
priority: high
status: open
area: tests/doc-guards
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
---

# `test_no_live_document_states_an_unguarded_hardware_entry_count` is red on `integration` from a false positive on the phrase "the other three do not have"

`tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count`
**fails on `integration` as of 2026-09-16**, before any change made by the
handoff that found it. It is the only failing test on a clean checkout of
`handoff/citation_identity_correctness`'s base commit `f414499`.

```
docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
  says 3 entries that do not defer to the spec library;
  hardware_entries.json has 28
```

## The brief is not making that claim

`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md` lines
150–152 read:

> Those three discriminate on the *origin* (hosted vs local) and on the
> reader's *claim on the repo* (loopback). This one discriminates on the
> reader's **browser**, and it is the one case where the standing rule and the
> honest answer may genuinely diverge, for a reason **the other three do not
> have**: …

"The other three" are **items 1–3 of the brief**. The sentence says nothing
about `hardware_entries.json`, the spec library, or any entry count.

## The pattern

`_COUNT_CLAIMS` (`tests/test_tolerance_stack.py`, around line 2493):

```python
("entries that do not defer to the spec library",
 rf"other\s+({_NUM})\s+do\s+not", ("not_library",)),
```

`other <number> do not` carries no anchor to entries, the library, or
`hardware_entries.json`, and `_NUM` accepts number words, so any English
sentence containing "the other three do not …" matches. Every neighbouring
claim in that list anchors on a noun (`\bentries\b`, `` `not_transcribed` ``,
`workbook`); this one does not.

## Why this matters beyond one red test

The guard exists because prose quoting a hardware-entry count goes stale
silently — it is a good guard with real bite. A false positive that cannot be
fixed by correcting the document is worse than a miss here: the only ways to
green are to reword unrelated prose around the scanner, or to stop trusting
the guard. Both are how a doc guard gets deleted.

## Suggested fix

Anchor the pattern the way its siblings are anchored — require `entries`,
`entry`, `hardware_entries.json` or `library` within the same sentence, e.g.

```python
rf"other\s+({_NUM})\s+(?:entries\s+)?do\s+not[^.]{{0,80}}?\b(?:defer|librar)"
```

and add the brief's sentence as a negative case beside the existing replay
tests (`test_the_stale_half_now_reads_a_document_outside_the_curated_publisher_set`
is the shape), so "a sentence that merely contains these words is not a claim"
is pinned rather than re-derived.

## Not fixed here

`citation_identity_correctness` owns three citation-correctness deliverables
and this is outside all of them; the repo's "file, don't fix" rule applies.
The handoff's baseline was measured on `master` at the 2026-09-16 batch merge
and recorded 1155 passed / 0 failed; this failure arrived on `integration`
after that point, which is also why the handoff did not warn about it.
