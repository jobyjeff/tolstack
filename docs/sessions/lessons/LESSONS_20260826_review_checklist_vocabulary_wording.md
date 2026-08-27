# LESSONS — `review_checklist_vocabulary_wording` (worked 2026-08-27)

Handoff: `docs/sessions/HANDOFF_20260826_review_checklist_vocabulary_wording.md`,
from `ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`.
Prose-only change to `docs/prompts/REVIEW_AGENT.md`; nothing else touched.

## The handoff's own deliverables were already half-done before I started

The issue and handoff both quote the stale claim as present-tense: *"A
vocabulary lives in **three** places ...; check all three, not two."* That
exact wording no longer existed. `REVIEW_20260821_three_field_vocabularies.md`
("Overlay maintenance") records that the review agent inline-fixed this same
paragraph while reviewing `three_field_vocabularies` — the same day the issue
was filed — by prefixing "At the time" (making the claim historical) and
appending a **fourth sighting** that already gives the current, correct
guidance (two places, neither a comment, paired by
`test_the_sop_spells_the_same_vocabularies_the_code_enforces`, with
`SpecEntry.subject_kind` named as the one thing the pairing doesn't reach).
Deliverable 2's ask — mark the whitelist reference as historical — was also
already done, in the same commit.

**What survived that fix, and what I actually changed:** the historicized
sentence still ended with the original present-tense imperative, unchanged:
`"At the time, a vocabulary lived in **three** places (...); check all
three, not two."` A reader hits "check all three, not two" as a live
instruction three sentences before the fourth sighting tells them the real,
current count is two. Scoping the *noun clause* to the past and leaving the
*imperative* in the present is the residual defect — half a fix reads as a
full one until you check what the trailing clause still commands.

**Before:**
> At the time, a vocabulary lived in **three** places (SOP prose, the
> dataclass comment, the enforcing test); check all three, not two.

**After:**
> At the time, a vocabulary lived in **three** places (SOP prose, the
> dataclass comment, the enforcing test) — the fourth sighting below has what
> replaced two of those three and where the replacement's reach stops; don't
> check three places today.

## Takeaway

When a handoff's source issue quotes stale prose verbatim, diff that quote
against the current file before writing anything — don't assume the quote is
still accurate just because the file and the issue are both still open.
Overlay/checklist docs in this repo get inline-fixed by the review agent as a
side effect of unrelated reviews (see `docs/prompts/REVIEW_AGENT.md`'s own
"Overlay maintenance" convention), so a filed issue can be partially, or
almost entirely, resolved by the time its own handoff is worked. Read the
paragraph fresh; fix only what is still actually wrong, which here was one
dangling imperative, not the whole claim.
