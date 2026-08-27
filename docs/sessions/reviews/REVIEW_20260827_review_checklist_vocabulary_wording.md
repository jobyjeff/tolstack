---
type: review
handoff: docs/sessions/active/HANDOFF_20260826_review_checklist_vocabulary_wording.md
reviewer: review agent (dispatch)
date: 2026-08-27
verdict: APPROVE
blockers: 0
---

# Review — `review_checklist_vocabulary_wording`

Work reviewed: `handoff/review_checklist_vocabulary_wording` (one commit,
`9663978`, on top of `master` `5a4cf81`). Prose-only edit to
`docs/prompts/REVIEW_AGENT.md`'s "Documented vocabularies drifting from the
seeded data" checklist item, plus the handoff's own
`LESSONS_20260826_review_checklist_vocabulary_wording.md`. Merged cleanly into
`review/review_checklist_vocabulary_wording` — the only other difference
between the two branches was the handoff file's location
(`docs/sessions/HANDOFF_...md` on the handoff branch vs.
`docs/sessions/active/HANDOFF_...md` on `master`/mine, from the board's
staged→active move landing after the handoff branch's base); git resolved it
as an identical-content rename with no conflict, and the file is correctly at
`active/` post-merge.

## Applicability of the seven mandatory stack checks

Not applicable. This is a documentation-only edit to the review checklist
itself — no `StackElement`, no `fold()`, no stack JSON, no code or test
touched. Confirmed from the diff (`git diff master...handoff/... --stat`:
only `docs/prompts/REVIEW_AGENT.md` and the new `LESSONS_*.md`), not assumed
from the handoff's framing.

## What the handoff asked for, and what was actually still wrong

Both the issue and the handoff quote the target sentence as present-tense:
*"A vocabulary lives in **three** places ...; check all three, not two."*
That exact claim no longer existed by the time this handoff was worked:
`REVIEW_20260821_three_field_vocabularies.md` records that a prior review
already inline-fixed the same paragraph by prefixing "At the time" (scoping
the vocabulary-*count* claim to the past) and appending a fourth-sighting
paragraph that gives the current, correct guidance (two places, neither a
comment, paired by
`test_the_sop_spells_the_same_vocabularies_the_code_enforces`, with
`SpecEntry.subject_kind` named as what the pairing doesn't reach). Deliverable
2 (mark the whitelist reference as historical) was also already done in that
same prior commit — verified by reading the paragraph on `master`, where
"`test_source_ref_leaves_the_feature_identity_slot_open_and_empty` now reads
the constant instead" already sits there unchanged by this handoff's diff.

What survived that earlier partial fix, and what this handoff actually
changed, is real and correctly scoped: the historicized sentence still ended
with its original imperative, unchanged — *"check all three, not two."* A
reader hits that as a live instruction, three sentences before the fourth
sighting tells them the current count is two. The fix replaces the trailing
imperative with a forward pointer ("the fourth sighting below has what
replaced two of those three and where the replacement's reach stops; don't
check three places today") rather than restating the pairing-test name and
its coverage inline. I checked whether that's a deviation from the literal
deliverable text (which asked for the pairing test and its coverage to be
named at this spot) or a legitimate call: the fourth sighting three sentences
below already states all of it in full (test name, what it covers, what it
doesn't), and this repo's own stated convention — echoed at the top of this
very file's overlay banner and in dispatch's universal checks — is that a
second copy of a fact is a liability, not a service, because it's the copy
nobody remembers to update. Pointing at the existing statement instead of
duplicating it is the better engineering call and I'm treating it as
satisfying the deliverable's intent, not a shortfall.

Read the merged paragraph in context (`docs/prompts/REVIEW_AGENT.md:686-734`):
it's coherent, the "at the time... don't check three places today" clause
correctly disambiguates history from present guidance, and nothing downstream
in the paragraph was disturbed.

## Verification performed

- Diffed `master...handoff/review_checklist_vocabulary_wording`: exactly the
  one sentence in `docs/prompts/REVIEW_AGENT.md` plus the new lessons file.
  No code, no test, no other doc changed.
- Read the full merged checklist item in place to confirm the wording reads
  correctly for a reviewer landing on it fresh, not just as an isolated diff
  hunk.
- Confirmed no sibling handoff conflicts: `git log --oneline HEAD..master`
  was empty before merging (my review branch's merge-base *is* current
  `master`); the other in-flight handoff
  (`handoff/material_values_status_vocabulary`) touches
  `tolerance_stack/thermal.py`, `tests/test_tolerance_stack.py` and
  `PROVENANCE.md` only — no overlap with `docs/prompts/REVIEW_AGENT.md`.
- `git worktree list` / `git status` in the tactical worktree
  (`C:\workspace\tolstack-worktrees\review_checklist_vocabulary_wording`):
  clean, nothing uncommitted to carry over.
- Test suite, run with `C:\workspace\tolstack\venv-win\Scripts\python.exe -m
  pytest -q` from the review worktree: **472 passed, 1 skipped**, both before
  and after merging the handoff branch in — unchanged, as expected for a
  prose-only change.

## Findings

None. No blockers, no should-fix, no nits beyond the overlay addition below.

## Overlay maintenance

Appended one entry to `docs/prompts/REVIEW_AGENT.md`'s "Recurring bugs to
check" list (after the `stack_viewer_layout_v2` entry): a doc fix that
historicizes a sentence's noun clause (adding "at the time") but leaves that
same sentence's trailing imperative in the present tense, so a reader still
hits a live-sounding command that contradicts guidance stated a few sentences
later. This is a genuinely new failure shape — distinct from every existing
"stale count" / "restated fact" entry, which are about a *value* going stale,
not about one half of a single corrected sentence going stale while the other
half was fixed.

## Verdict

**APPROVE.** Merging into `master`, cleaning up the worktrees/branches, and
pushing per this repo's standing review-agent instructions.
