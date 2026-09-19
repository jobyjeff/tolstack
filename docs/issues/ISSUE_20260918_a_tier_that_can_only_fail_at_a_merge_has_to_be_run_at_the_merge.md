---
type: chore
priority: low
status: open
area: prompts/review
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
---

# The review-merge rule landed in tolstack's override; the principle behind it is not repo-specific

`mutation_witness_enrollment_gaps` (2026-09-18) wrote the instruction
`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md`
asked for: `docs/prompts/REVIEW_AGENT.md` now tells a review agent to re-run
`node scripts/run_mutation_witness_tests.mjs --repo <main checkout>` after
merging `integration` into its review branch, and to report the count.

That closes the tolstack half. The issue's own closing paragraph named a second
half, and it is the half with no owner now that the issue is resolved:

> Only tolstack has a mutation-witness tier today, so the override is the
> likely home — but the *principle* ("a tier that can only fail at a merge has
> to be run at the merge") is not repo-specific, and that is the part worth a
> strategy read.

## Why it is a strategy read rather than a copy-paste

The tolstack rule is stated in terms of an artifact only tolstack has. The
generalisation is a **test about tests**, and the property that earns it a slot
in `dispatch/dispatch/prompts/REVIEW_AGENT.md` is narrow and checkable:

> A check whose answer can change **as a result of a merge** while every branch
> involved is green on its own must be run **at** the merge. Nothing else in the
> lifecycle re-runs it, and the branch-level greens are all true.

Whether any other repo owns a check of that shape is the open question, and it
is the whole of the decision. Candidates worth a look before writing anything:
drawing-checker's revision-diffing guards, and any doc-scan that counts across a
corpus two branches can each add to (tolstack's own claim scans are exactly that
shape — two branches each adding one passage keep every count right alone and
wrong together).

If the answer is "only tolstack, today", the correct outcome is to write nothing
at the dispatch level and record *that* — the principle is cheap to restate and
expensive to leave as a rule nobody's repo can act on.

## Not a blocker for anything

The measured regression this came from is covered where it happened. This is
the generalisation only.
