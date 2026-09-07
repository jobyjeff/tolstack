---
type: review
handoff: annotate_vocab_pairing_test
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review — `annotate_vocab_pairing_test`

## What this handoff actually was

Not a tolerance stack or a spec-library parse event, so the seven mandatory
provenance checks in this repo's overlay do not apply — the deliverable is a
structural pairing test (or confirmation that one already exists) plus a
lesson. Structured around the handoff's own Definition of Done.

**The tactical session's claim, checked rather than trusted: no code change
was needed.** The pairing test this handoff asks for —
`apps/annotate/binding_state.js`'s four hand-copied vocabulary constants
(`STACK_KEY_KINDS`, `VERDICTS`, `DIRECTIONS`, `GDT_MODIFIERS`) paired against
`tolerance_stack/feature_identity.py` — was already shipped by
`annotation_surface_mvp`'s own review-response commit `d0c3565` ("review
response: fix --events-dir/--data-root default bug, add JS/Python vocab
pairing"), merged into `integration` before this handoff's branch was cut.
The handoff branch (`c5e02e6`) is a single lessons-file commit recording that
finding. Verified independently, not on the strength of the lesson's say-so:

- `git merge-base --is-ancestor d0c3565 HEAD` (this review branch, pre-merge)
  → confirmed ancestor.
- `git diff d0c3565 -- tests/test_annotate_js_vocabulary.py
  tests/test_js_python_vocabulary.py apps/annotate/binding_state.js
  tolerance_stack/feature_identity.py` → empty.
- Read `tests/test_annotate_js_vocabulary.py` directly: it pairs **five**
  arrays, not four — the handoff-named four plus `PATH_KINDS`, on the stated
  reasoning that leaving it out would reopen the identical gap one constant
  over. Reuses `js_array_strings(text, name, prefix="AA")` from
  `tests/test_js_python_vocabulary.py` (generalised with a `prefix` param in
  the same `d0c3565` commit) rather than forking a second scanner — the shape
  this repo's checklist asks for.
- Its anti-vacuity assertion is `len(tables) == len(PAIRINGS)`, not a bare
  digit — the exact fix this overlay's "Documented vocabularies drifting..."
  entry's fifth sighting (`js_python_vocabulary_pairing`) demanded, already
  applied here from the start.
- Ran `tests/test_annotate_js_vocabulary.py` + `tests/test_js_python_vocabulary.py`
  standalone before merging: **18 passed**, no drift between the two
  languages today.
- Searched live docs for a hand-restated count of "how many vocabularies" or
  "how many pass" tied to this pairing (`ARCHITECTURE.md`, worksheet docs) —
  none found; `ARCHITECTURE.md`'s module inventory covers `scripts/` and
  `tolerance_stack/`, not `tests/`, so no new row is owed there.

## Tests

Merged `handoff/annotate_vocab_pairing_test` into this review branch: fast-forward,
single commit, no conflict (lesson-file-only diff — confirmed via
`git diff HEAD handoff/annotate_vocab_pairing_test --stat` before merging).

- Review worktree: `venv-win/Scripts/python.exe -m pytest -q` → **667 passed,
  1 skipped** — matches the lesson's own claimed count exactly.
- `data/` untouched: this handoff writes no runtime output, nothing to check
  beyond `git status --porcelain` staying clean, which it did.

## Findings

None. No should-fix or blocker findings, so no new issue file is required
under "an unfixed should-fix outlives its handoff."

## Verdict

**APPROVE.** Proceeding to merge into `integration` and push.

## Note for the next reviewer / triage

`docs/issues/ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md` is
`status: triaged` and still points at this handoff; per the handoff's own
lesson I did not change its status (triage's to set), but the fix it asks
for has shipped and is verified above.

## Overlay

Added one new entry to `docs/prompts/REVIEW_AGENT.md`'s "Recurring bugs to
check": this is the **second** same-day sighting (after
`feature_identity_events_dir_data_root`, reviewed just before this one) of a
dedicated handoff whose target fix had already landed via a *different*
handoff's review-response commit before the dedicated one was even cut. Two
sightings on the same day against the same commit (`d0c3565`) is enough to be
worth a named checklist line rather than trusting it not to recur.
