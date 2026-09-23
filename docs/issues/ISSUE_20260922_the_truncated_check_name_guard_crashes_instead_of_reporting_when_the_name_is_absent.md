---
type: bug
priority: low
status: open
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
