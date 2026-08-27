---
type: review
handoff: material_values_status_vocabulary
reviewer: agent
date: 2026-08-27
verdict: APPROVE
blockers: 0
---

# REVIEW — `material_values_status_vocabulary` (2026-08-27)

Handoff: `docs/sessions/active/HANDOFF_20260826_material_values_status_vocabulary.md`,
closing `ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md` (the
fifth and last hand-found instance of the "vocabulary with no importable name" defect).
Branch `handoff/material_values_status_vocabulary`, 2 commits (`922f37c`
implementation, `6c79371` lesson).

This is not a tolerance-stack authoring event, so the mandatory provenance checks
(§1–§7 of this repo's overlay) do not apply — there is no `data/`, no new element, no
citation. What follows covers the universal checks and the parts of "Also verify" and
"Recurring bugs" that do apply to a code/test refactor.

## What I verified

- **Merged `handoff/material_values_status_vocabulary` into this review branch**
  cleanly (no conflicts); `git log --oneline HEAD..master` before merging showed only
  two board-move commits, zero code — nothing to reconcile, matching the lesson's own
  claim.
- **Diff scope matches the handoff exactly**: `tolerance_stack/thermal.py` (the new
  `MATERIAL_VALUES_STATUSES` constant, `__post_init__` reads it),
  `tests/test_tolerance_stack.py` (`hardware_entry_problems()` now calls
  `python_values_statuses()` instead of re-spelling the tuple, plus the new generalized
  scan test), `PROVENANCE.md`, and the lesson file. `docs/prompts/REVIEW_AGENT.md` was
  correctly left untouched (out of scope per the handoff, owned by the sibling
  `review_checklist_vocabulary_wording`).
- **Full suite, re-run myself**, worktree cwd + main checkout's interpreter
  (`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`): **473 passed, 1
  skipped** — matches the lesson's own number exactly.
- **Test count claim re-derived, not trusted**: `ast`-counted `test_*` function
  definitions in `tests/test_tolerance_stack.py` at `master` (93) vs. after the merge
  (94) — exactly one added, none removed, confirming both the lesson's and
  `PROVENANCE.md`'s "one test added, none removed" claim. `--collect-only` on the file
  gives **142** collected items, matching the lesson.
- **The new guard is not vacuous.** Reverted
  `self.values_status not in MATERIAL_VALUES_STATUSES` to the old inline tuple by hand
  (`Edit`, not `sed`/`git checkout`, to avoid the exact stale-revert gotcha the lesson
  itself flags), ran `test_no_persisted_field_vocabulary_is_an_inline_literal` alone —
  it failed, naming `tolerance_stack\thermal.py:152: self.values_status not in
  ('inline', 'library', 'not_transcribed')` exactly as the lesson claims. Restored via
  `Edit` and confirmed `git status`/`git diff` clean before moving on (the lesson's own
  gotcha section describes hitting this trap during authoring; the review re-does the
  demonstration safely).
- **Scan's exclusion boundary re-checked by hand, not just read**: grepped
  `tolerance_stack/*.py` for `self.<attr> not in (...)` — the seven pre-existing
  vocabularies (`CONFIDENCES` ×2, `SUBJECT_KINDS`, `EVENT_MODES`, `EXPORT_STATUSES`,
  `SOURCE_REF_KINDS`, `ELEMENT_ROLES`) already read named module-level constants, all
  confirmed to exist by name. `corner not in (...)` (thermal.py:633) and
  `stage not in STAGE_IDS` (thermal.py:408) are bare locals, not `self.<attr>` —
  correctly outside the guard's scope, as the lesson argues.
- **`PROVENANCE.md` amendment content, not just its presence**: the appended sentence
  ("one test added, none removed, no count or value changed; one existing check's
  literal replaced with a shared name") is true per the recount above, and is scoped to
  the one file actually amended (`tests/test_tolerance_stack.py`).
- **No SOP/README prose restates the `values_status` vocabulary as an enumerable
  pipe-list** outside the review-checklist overlay itself (which is explicitly the
  sibling handoff's job) — so deliverable 2's "shared via `python_values_statuses()`"
  decision closes the only restatement that existed in code; no doc-side drift was
  left behind.
- **Tests don't pollute production data**: `git status --porcelain` clean after the
  full run; `data/` in this worktree holds only the tracked `.gitkeep`/`README.md`
  placeholders (8 files), no stray run output.
- **Deliverable 2's "shared, not independent" decision is reasoned and recorded**, and
  is the honest weaker form given `hardware_entry` is a dict, not a dataclass — the
  lesson explicitly rules out promoting it to a dataclass as out of scope, and rules
  out a direct `MATERIAL_VALUES_STATUSES` import as an equally-valid alternative not
  taken only for file-local-pattern-consistency reasons. No objection.
- **Deliverable 3's generalized test was built, not deferred**, per the handoff's own
  "cheap given what you learn" escape hatch — and it correctly is cheap here, since the
  `self.<attr>` scope boundary the lesson derived was a five-minute grep, not a design
  problem.

## Findings

None. No blockers, should-fixes, or nits.

## Verdict: APPROVE

Green suite (re-run and re-derived, not trusted), the new guard demonstrated to
actually fire, and every count the lesson quotes re-derived independently and matched.
Proceeding to merge into `master`, clean up worktrees/branches, and push per the
integrate-on-APPROVE protocol.

## Note for the next reviewer

Nothing new for the overlay's "Recurring bugs" list — this handoff avoided every trap
its own predecessor lesson named (including the mutation-revert gotcha, which it hit
during authoring but caught and fixed before committing). The overlay does not need a
new entry from this review.
