---
priority: low
depends_on: []
---

# HANDOFF 2026-08-19 — architecture_inventory_quantifiers: `ARCHITECTURE.md` says `stack.py` is "~330 lines"; it is 728

Source: `docs/issues/ISSUE_20260818_architecture_module_inventory_line_count_is_stale.md`,
found during `review/confidence_vocabulary_single_definition` (2026-08-18) while
checking the inventory block for a row that handoff owed it. It owed none — no file
was added — but the block carries a stale figure of its own, and the review
checklist's *"stale inventory numbers"* entry names this exact block as a recurring
site. Baseline: trunk. Scope: `ARCHITECTURE.md` only. Do NOT touch
`tolerance_stack/stack.py` or `docs/SOP_TOLERANCE_STACK.md` — the staged
`three_field_vocabularies` handoff owns those, and it will change `stack.py`'s line
count while you work, which is itself part of the point below.

## The defect

`ARCHITECTURE.md:18`:

```
  stack.py          the stack shapes + the fold. ~330 lines, stdlib only.
```

`wc -l tolerance_stack/stack.py` is **728** on `master` plus that handoff, and was
**686** before it. The figure has been better than 2× wrong for some time; it is not
that handoff's doing, which is why it was not fixed inline.

## What to do — and what not to do

**Not "update the number".** That is how it got here, and the parallel
`three_field_vocabularies` handoff will invalidate any number you write. Either:

1. **Delete the figure.** It carries no decision. The row's useful half is *"the
   stack shapes + the fold … stdlib only"*, and "stdlib only" is the claim worth
   guarding. `spec_library.py` and `thermal.py`'s rows already state their character
   without a line count, so deleting it makes the block internally consistent.
2. Or, if a size signal is genuinely wanted, state it as a **band with a date** and
   accept it as dated history, the way `PROVENANCE.md` rows are read.

**Option 1 is the recommendation.**

While you are in there, check the block's **other quantifiers** against the tree —
`projection_provenance.py`'s row already says "all three" projection writers, which
was itself corrected once (`spec_library_projection_provenance`, 2026-08-12). Any
quantifier that survives your pass should either be derivable by a test or be
deleted; a number in prose that nothing checks is the same defect wearing a
different value.

If you keep any quantifier, **pin it**. `tests/test_js_python_vocabulary.py` is this
repo's precedent for pairing a document against the code it describes, and
`forge/docs/sessions/HANDOFF_20260819_no_second_source_of_truth_convention.md` is
writing the general rule this is an instance of. A "stdlib only" claim, for example,
is genuinely assertable — walk `stack.py`'s imports.

## Definition of done

- No unchecked quantifier remains in the module inventory block, or each survivor is
  paired by a test that reddens when it goes stale — observed failing.
- Full suite green (this is a docs change; if nothing in the suite touches
  `ARCHITECTURE.md`, that is itself worth one line in the lesson).
- Lesson (`docs/sessions/lessons/LESSONS_20260819_architecture_inventory_quantifiers.md`):
  every quantifier the block contained, and its disposition — deleted, dated, or
  pinned. That list is what stops the next reviewer re-auditing the same block for
  the third time.
