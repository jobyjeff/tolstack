---
type: chore
priority: low
status: triaged
handoff: docs/sessions/HANDOFF_20260819_architecture_inventory_quantifiers.md
area: docs
reporter: agent
---

# `ARCHITECTURE.md`'s module inventory says `stack.py` is "~330 lines"; it is 728

Found during `review/confidence_vocabulary_single_definition` (2026-08-18) while
checking the inventory block for a row this handoff owed it. It owed none — no file
was added — but the block carries a stale figure of its own, and the review
checklist's *"stale inventory numbers"* entry names this exact block as a recurring
site.

`ARCHITECTURE.md:18`:

```
  stack.py          the stack shapes + the fold. ~330 lines, stdlib only.
```

`wc -l tolerance_stack/stack.py` is **728** on `master` + this handoff, and was
**686** before it. So the figure has been better than 2× wrong for some time; it is
not this handoff's doing and was not fixed inline for that reason.

## What to do

Not "update the number" — that is how it got here. Either:

1. **Delete the figure.** It carries no decision. The row's useful half is *"the
   stack shapes + the fold … stdlib only"*, and "stdlib only" is the claim worth
   guarding. `spec_library.py` and `thermal.py`'s rows already state their character
   without a line count, so deleting it makes the block internally consistent.
2. Or, if a size signal is genuinely wanted, state it as a **band with a date** and
   accept it as dated history, the way `PROVENANCE.md` rows are read.

Option 1 is the recommendation. While in there, check the block's other quantifiers
against the tree — `projection_provenance.py`'s row already says "all three"
projection writers, which was itself corrected once
(`spec_library_projection_provenance`, 2026-08-12).
