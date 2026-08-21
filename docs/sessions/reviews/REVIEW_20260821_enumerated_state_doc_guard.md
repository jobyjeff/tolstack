---
type: review
handoff: docs/sessions/HANDOFF_20260819_enumerated_state_doc_guard.md
reviewer: agent
date: 2026-08-21
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-21 — enumerated_state_doc_guard

Not a tolerance stack, so the seven mandatory provenance checks do not apply.
This is a test-suite deliverable closing
`ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md` per
shape 2 of `BRIEF_20260817_doc_scan_deletion_guards.md` (Jeff's pick, 2026-08-19
strategy session).

## What I verified

- **Pre-work baseline.** On `master` (review branch's parent), `apps/viewer/README.md`
  is referenced by **zero** tests — grepped `tests/` for the path and got no
  hits. Confirms the hole the handoff describes was real: nothing guarded that
  file's prose at all before this branch.
- **The guard fires on the actual defect, not just its own replay.** Rather than
  trust `test_the_enumerated_state_doc_guard_catches_the_08_12_deletion`'s
  in-memory mutation, I reproduced the 08-12 edit directly on disk in the
  review worktree (cut `## Which bytes the number was read off` plus the
  `EXPORT UNESTABLISHED` / `CTE NOT TRANSCRIBED` rows via script) and ran
  `test_every_enumerated_viewer_state_is_named_in_a_live_document` against the
  real file. It failed, naming exactly `established` / `unestablished` and
  `apps/viewer/README.md` — not a proxy, the actual surface and states. Reverted
  with `git checkout --` and reconfirmed green.
- **`EXPORT_STATUSES` and `python_values_statuses` are real**, not aspirational
  names: `tolerance_stack/stack.py:77` and
  `tests/test_js_python_vocabulary.py:377` respectively. `live_documents()`
  (`tests/test_tolerance_stack.py:1552`) is the real, already-existing walk —
  the guard reads through it rather than opening a bare path, so a surface
  README that stops being live raises instead of silently checking nothing.
- **Scope boundary is honest and explicit**, both in the test module's own
  comment and in the lesson: shape 2 covers only `VA.EXPORT_STATUSES` and
  `values_status`, and says so where a reader would look, not just in a gaps
  section. The four other viewer vocabularies were checked by hand (per the
  lesson) and one gap found —
  `no_source_ref` not named by its code spelling anywhere in the README — filed
  as `ISSUE_20260821_no_source_ref_is_the_one_viewer_confidence_state_not_named_by_spelling_in_the_readme.md`,
  not silently left. Correctly out of this handoff's scope (different
  vocabulary, and the handoff bars restructuring the live doc beyond the
  demonstration).
- **The "search the whole corpus" trap was caught and documented, not shipped.**
  The lesson records that the author's first version searched all of
  `live_documents()` and could never fail, because stack/materials JSON under
  `docs/` carries `"status": "established"` etc. as literal field values that
  `_prose_blocks` walks as prose. Scoping to the one owning `.md` surface fixes
  this for free (a Markdown file has exactly one prose block). I re-derived
  this independently by reading `_prose_blocks` and confirming the JSON leaves
  really would match — the fix is correct and the reasoning in the lesson holds.
- **PROVENANCE.md amended correctly.** `test_this_branch_amended_the_row_of_every_imported_file_it_changed`-shaped
  requirement satisfied: the `tests/test_tolerance_stack.py` row has a new
  "Amended again 2026-08-21" clause with the right test names, count (126 in
  file), and suite totals.
- **`docs/prompts/REVIEW_AGENT.md` overlay updated in place**, not duplicated:
  the existing entry at line 530 ("A doc-scan guard cannot fail on a *deleted*
  section") gained a "Closed 2026-08-19" sub-clause naming both new tests and
  the still-open boundary (prose with no enumerated state stays this
  checklist's job). No second, drifting copy of the guidance was created.
- **Issue hygiene.** `ISSUE_20260812_...md` frontmatter moved `triaged` →
  `resolved` with a `handoff:` pointer and a `## Resolution` section that states
  the remaining boundary is deliberate, not a forgotten TODO. The new
  `ISSUE_20260821_...md` carries correct frontmatter (`type: chore`,
  `priority: low`, `status: open`, `reporter: agent`, `handoff:` pointer) —
  file-don't-fix followed correctly for an out-of-scope finding surfaced mid-work.
- **Tests, both checkouts.**
  - Review worktree, pre-merge (master): `442 passed` (0 skipped — worktree
    still shows the historically-1-skip data-dependent test passing here,
    consistent with recent counts creeping as the suite grows).
  - Merged (`git merge handoff/enumerated_state_doc_guard`, clean, no
    conflicts): worktree — `443 passed, 1 skipped`, matching the lesson's
    claimed count exactly.
  - `apps/viewer/js` node-fs tier is the one skip, `data/`-dependent, expected
    absent in a worktree per this repo's standing baseline.
- **No data pollution.** `git status --short` clean in both the review worktree
  (after my on-disk mutation experiment, reverted via `git checkout --`) and
  the main checkout's `data/`.
- **Scope respected.** No restructuring of `apps/viewer/README.md` itself
  landed on the branch — confirmed via the merge diff, which touches only
  `tests/`, `docs/`, and `PROVENANCE.md`.

## Findings

None. No blockers, no should-fix, no nits worth recording.

## Overlay maintenance

The overlay's existing entry for this issue (line 530) was already updated by
the author in-place with a "Closed 2026-08-19" sub-clause; I checked it against
the diff and it accurately reflects the boundary (enumerated-state prose
covered, free-form prose still this checklist's job). No new failure class
surfaced in this review worth a fresh checklist entry — this was a clean
build-to-spec with the design question already settled upstream by strategy.

## Verdict

**APPROVE.** Proceeding to merge into `master`, per the review protocol's
integrate-on-approve step, and cleaning up the handoff/review worktrees and
branches afterward.
