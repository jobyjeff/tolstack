---
type: bug
priority: med
status: open
area: docs
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md
---

# `ARCHITECTURE.md`'s traced-ratio sentence publishes a stale `inferred`/`untraced` split — the one part of that figure no guard reads

`ARCHITECTURE.md` (the "binding constraint on nearly every value" paragraph)
states:

> **5 of 26 element instances across the three seeded stacks are `traced`**
> (3 `inferred`, 18 `untraced`).

Recomputed from the stacks today
(`venv-win/Scripts/python.exe tests/debug_report_tolerance_stacks.py --ratio`):

```
seeded (slice 1, 3 stacks)   5 traced / 12 inferred / 9 untraced, out of 26 element instances
```

The numerator and denominator are right; **the parenthetical has been wrong
since 2026-09-15**. `tests/test_tolerance_stack.py:2168` records the move in its
own comment — *"Moved 2026-09-15 (`stack_fable_audit`): inferred 3 -> 12,
untraced 18 -> 9"* — so the handoff that moved the numbers updated the test's
note and left the published document behind.

## Why the doc scan cannot catch it, by design

`test_every_document_quoting_the_traced_ratio_quotes_the_current_number` pins
only `<traced> of <instances>`. Its own docstring explains why the long form's
other two columns are deliberately out of scope: a free
`\b<n>\b[^.\n]{0,40}?of <m>` match read the *inferred* column and flagged the
**current** figure as the retired `3 of 26`, "i.e. the guard fired on the one
number it exists to protect, and the natural repair is to delete a correct
figure" (narrowed during `review/traced_ratio_guard_freshness`). So the
narrowing was right and this is the hole it knowingly left.

Found while reviewing `HANDOFF_20260921_policy_free_brief_residues`, which does
not touch any stack and is not its cause — the review ran `--ratio` because the
overlay checklist asks every report to state the ratio, and the tool disagreed
with the document.

## What a fix looks like

1. Correct the parenthetical (and add a dated correction line, the house shape
   for a moved figure — `_RETIRED_TRACED_RATIOS` takes only the `N of M` form,
   so the split needs no entry there).
2. Then decide whether the split is worth publishing at all in a file that
   cannot guard it: the SOP defines the ratio in one place and
   `--ratio`'s HEADLINE block is designed to be copied. If it stays, the
   cheapest guard is to pair the whole HEADLINE sentence, not just `N of M` —
   which is a different scan from the retired-figure one and would not have the
   false positive that forced the narrowing, because it compares against the
   live string rather than searching for stale numerals.
