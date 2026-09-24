---
type: bug
priority: low
status: resolved
area: scripts/mutation_witnesses
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260922_stack_page_alert_marks_and_drawn_glyph.md
---

# `test_no_expect_red_is_a_truncated_check_name` crashes with a bare `ValueError` when the name is absent, so the least useful of three reds has no entry id in it

Measured in review of `stack_page_alert_marks_and_drawn_glyph` (2026-09-22),
and originally recorded as the second finding of
`ISSUE_20260922_the_alert_badge_mutation_witness_anchors_at_the_retired_chip_rule.md`
— re-filed on its own so it keeps an owner now that that issue is `resolved`.

## What happens

`tests/test_mutation_witnesses.py:422` does

```python
at = source.index(entry["expect_red"]) + len(entry["expect_red"])
```

on a name the pairing test immediately above it (
`test_every_expect_red_resolves_to_exactly_one_place`) has already reported as
resolving to **0 places**. So when an `expect_red` rots, the run prints two
useful failures and one traceback:

```
ValueError: substring not found
tests\test_mutation_witnesses.py:422: ValueError
```

with no entry id, no file name and no sentence — the least useful of the three
reds, and the one a reader hits first if they read the summary bottom-up.
Reproduced exactly on this branch before the anchor was re-pointed.

## What would close it

Skip the entry when `expect_red_hits(entry) != 1` and let the pairing test above
own that failure — the zero-match case is already reported there, so this test
has nothing to add about it, and the truncation claim is only meaningful when
the name resolves. Guard it, do not `try/except` it: swallowing the
`ValueError` would make the test silent in exactly the case it cannot judge,
which is the shape this repo's own prompt calls "a check whose scope
structurally excludes the defect".

**Watch the non-vacuity while fixing it.** The value of this test is the
*prefix* case — a name that resolves as a substring but is not the whole check
name — and a `continue` at the top must not be reachable in that case. Its own
docstring records how it came to exist (two paste-ready entries whose names were
cut short), so the replay is written down: plant an entry whose `expect_red` is
a real check name with its last word removed and confirm this test, and only
this test, reddens.

Owner note: `scripts/mutation_witnesses.json`,
`scripts/run_mutation_witness_tests.mjs` and `tests/test_mutation_witnesses.py`
are the declared scope of
`HANDOFF_20260922_mutation_witness_repair_and_enrollment`, which is active as of
filing.


---

## Resolved 2026-09-23 — at the root: the test is gone, because the comparison it policed is gone

`mutation_witness_derived_enrollment_and_gating`. This issue proposed guarding
the `source.index(...)` so the zero-match case falls to the pairing test above
it. That fix is no longer the right one, because the defect underneath it was
repaired instead.

`test_no_expect_red_is_a_truncated_check_name` existed because the cheap half
compared `expect_red` **loosely** (a substring count of the check source) and
the runner compared it for **equality**, so a prefix resolved cheaply and could
never be witnessed. The cheap half now checks `expect_red` for **membership** of
the enumeration of guards the tree declares
(`scripts/guard_enumeration.mjs`) — an exact match against a parsed declaration,
which a prefix cannot satisfy and a name sitting in a comment cannot satisfy
either. So the truncation test had nothing left to add, was retired with the
crash inside it, and `test_every_expect_red_names_a_guard_the_enumeration_found`
is the one red a rotted or truncated name now produces.

The non-vacuity this issue asked to watch is preserved by construction rather
than by a replay: membership is strictly stronger than the substring check plus
the truncation check together.
