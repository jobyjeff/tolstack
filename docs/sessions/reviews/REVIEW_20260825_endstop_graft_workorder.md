---
type: review
handoff: docs/sessions/active/HANDOFF_20260825_endstop_graft_workorder.md
reviewer: review agent (dispatch)
date: 2026-08-25
verdict: APPROVE
blockers: 0
---

# Review — `endstop_graft_workorder`

Work reviewed: `handoff/endstop_graft_workorder` (`b93e660`, one commit on top
of `master` `e54868a` via merge-base `3f6170d` — the two board-lifecycle
commits `d4480e7`/`e54868a` landed on `master` after the branch's base but
touch neither of the two docs `HANDOFF_20260825_*.md` files this handoff's
raw two-dot diff appears to delete; that is `master` moving ahead, not the
author deleting a sibling handoff — confirmed by diffing `b93e660` against
its actual parent `3f6170d`, which touches only 4 files). Merged cleanly into
`review/endstop_graft_workorder` (no conflicts, both `docs/sessions/active/`
board files unaffected either side).

Four files: `PROVENANCE.md` (data/inbox entry, new), `README.md` (contents
table row), `WORKSHEET_end_stop_graft.md` (new, 432 lines), `LESSONS_...md`
(new). No code, no new stack JSON, no new parsing helper. `git diff -w
3f6170d...b93e660 --stat` matches the plain diff (no reformat hiding a real
change); no NUL bytes; no `</invoke>`/`</content>` tool-fragment leakage in
either new file.

**HITL gate confirmed still closed, not just claimed closed**: checked
`C:\workspace\tolstack\data\inbox\tolerance_stacks\` myself —
`260825_Hardstop_tol_Chao.xlsx` has not landed. The worksheet's claim that
deliverable 3 (the slice + graft proposal) is blocked and out of scope for
this handoff is accurate, and the author correctly worked deliverables 1, 2
and 4 only, per the handoff's own fallback instruction.

## Applicability of the seven mandatory stack checks

This is a documentation-only "structured read" of a source workbook, not a
`stack_definition/v0` JSON stack — same disposition as prior non-stack
handoffs. No `StackElement`, no `fold()`, no `path`/`checks` array, no
LMC/MMC mapping, no RSS column, no cotter/castellation hardware. Checks 2,
2b, 3, 4, 5, 6 do not apply and I confirmed that from the diff (nothing under
`tolerance_stack/`, `apps/`, or any stack JSON changed) rather than assuming
it from the handoff's framing. Checks 1 and 7 (provenance / traced ratio)
are exactly what this handoff's deliverable is, and are covered in full
below.

## Check 1 — every tolerance traces to a specification or drawing callout

**Verified, and I re-derived the transcription against the raw workbook
myself** rather than trusting the worksheet's tables. Ran
`tests/debug_dump_tol_stack_xlsx.py` against
`C:\workspace\tolstack\data\inbox\tolerance_stacks\260825_End_Stop_JC.xlsx`
(sha256 `8f8a8902e0c8782697124ac46740fd1d16d63008ccda265215b1b34a8735acdf`,
matches the `Get-FileHash` I ran independently and matches `PROVENANCE.md`)
and spot-checked every row in §2a, §2b, all 16 rows of §2c, all 17 rows of
§2d, §2e (row 68), the header rows (4, 9) behind finding F1, and every
`SUM`/`SUMSQ` total (rows 72, 74, 82, 89, 95) against the parser's cached
values. All of it reproduces exactly — cell values, formulas (explicit and
shared-inferred), and free-text comments, including the two provisional-value
comments (rows 26, 57) and the deliberate double-reference to `D33` in the
superseded row-95 cell list. No invented number anywhere: every one of the 43
contributor rows is a component name plus, at best, a one-line hand comment,
and the worksheet correctly calls all of them `untraced` — there is no
`traced`/`inferred` mislabelling to hunt for here, because nothing in this
workbook could support anything but `untraced`. The currency check (§3) is
honest: every row is `couldn't-check`, and the two distinct reasons given
(nothing copied into `data/inbox/drawings/` for this joint at all, vs.
drawing-checker's own extraction existing but stopping at title-block/notes
granularity) are both correct — I confirmed `data/inbox/drawings/` holds only
the five hub-bearing PDFs.

**One finding, fixed inline (see below): the element-instance count itself
was wrong.**

## Check 7 — the traced / inferred / untraced ratio, recomputed

The worksheet's own count-with-a-name — exactly the number this checklist
says a reviewer must never take on faith — was wrong. §2a (7) + §2b (2) +
§2d (17) + §2e (1) all check out, but §2c was counted as **11** rows when
the table two lines above it, and the raw workbook, both show **16** (rows
30–45 inclusive; I verified all 16 are populated contributor rows via the
parser dump, not by counting table rows alone). That makes the true total
**43**, not 38, and the same wrong "38" was copied into the blockquote ratio
line, the README contents-table row, and the LESSONS file heading — four
occurrences across three files, the exact "one wrong digit, several
copies" pattern this checklist's "stale count" entries describe.

**A second, more serious error sat right next to the first**: the
blockquote itself read `**38 traced / 0 inferred / 38 untraced.**` — i.e. it
asserted **38 traced**, flatly contradicting the surrounding prose ("This
workbook traces 0 of 38"), the README ("Traces 0 of 38"), and the LESSONS
file ("The untraced count: 0 of 38"). Everything else in the document is
unambiguous that the traced count is zero; this one line said the opposite.

**Both fixed inline, in this review**, across all four occurrences (the
worksheet's §4 blockquote and count sentence, the README contents-table row,
and the LESSONS heading): the corrected, re-derived figure is

> **0 traced / 0 inferred / 43 untraced, out of 43 element instances.**

The direction of the finding is unchanged — this is still the least
traceable source workbook in the repo, worse than `pitch_link_to_pitch_plate`
(4 of 6) and the hub-bearing M1 sheet (4 of 8) — only the denominator and the
inverted traced-count assertion were wrong. I also added the required
calibration sentence citing the current SOP-registry-wide figure (**5 of
26**, recomputed via `tests/debug_report_tolerance_stacks.py`'s `_counts`)
that every other `WORKSHEET_*.md` carries and that
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number` was
failing on before I added it (see Tests, below) — this was a real gap in the
new document, not a false-positive guard firing.

## Also verified

- **`data/inbox/tolerance_stacks/` PROVENANCE.md** — new entry present, hash
  verified independently, correctly states "no immutable upstream," correctly
  sets expectations for a near-zero traced count, and documents the two
  shared-formula masters. Format matches the hub-bearing entry's precedent.
- **`data/inbox/specs/` and `data/inbox/tolerance_stacks/` append-only** —
  confirmed via `Get-ChildItem` on the main checkout: only the new
  `260825_End_Stop_JC.xlsx` and the updated `PROVENANCE.md` are new; nothing
  renamed or removed.
- **drawing-checker read-only** — the currency check reads it
  (`C:\workspace\drawing-checker\data\`) but the handoff writes nothing there;
  no session snapshot diff was taken because the handoff's own scope note
  says drawing-checker was only read from, and I have no contrary evidence
  from the diff (nothing under this repo references a new run, and the
  worksheet's own §3 table lists which extractions were consulted by name).
- **Worktree/main-checkout hygiene** — the author's LESSONS file documents
  writing four tracked-file edits to the main checkout first, catching it via
  a clean `git status` in the worktree, and reverting + redoing correctly at
  worktree-relative paths. I found no leftover evidence of the mistake (the
  main checkout's `git status` is clean except two pre-existing, unrelated
  untracked files belonging to the parallel `stack_viewer_layout_v2` work,
  which the lesson also names and correctly leaves alone).
- **Root `PROVENANCE.md` amendment discipline** — **caught by the test
  suite, not by me first**: the handoff edited `docs/tolerance_stacks/README.md`
  (an imported file tracked by the repo-root `PROVENANCE.md`) without
  appending an "Amended again" note to that file's row, which
  `test_this_branch_amended_the_row_of_every_imported_file_it_changed` polices
  automatically since `provenance_byte_identical_test`. **Fixed inline**:
  appended an `**Amended again 2026-08-25** (`endstop_graft_workorder`)` note
  naming the one row added and the one sentence changed.
- **`docs/prompts/REVIEW_AGENT.md` overlay** — already tracked and populated
  in this worktree (not the composed `.dispatch/prompts/` copy); edited the
  right file (see Overlay maintenance, below).

## Tests

`venv-win/Scripts/python.exe -m pytest -q`, run from this review worktree
(main checkout's interpreter, worktree's file tree):

- **Baseline (`master`, pre-merge): 459 passed, 1 skipped.**
- **Immediately after merging the handoff branch, before any fix: 457
  passed, 2 failed, 1 skipped** —
  `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
  (the new worksheet was missing the current "5 of 26" calibration figure)
  and `test_this_branch_amended_the_row_of_every_imported_file_it_changed`
  (root `PROVENANCE.md` row for `README.md` not amended). Both are genuine,
  not guard false-positives — confirmed by reading each test's assertion
  against the actual diff before fixing anything.
- **After the four inline fixes: 459 passed, 1 skipped**, back to baseline
  plus the new content, no new skips introduced.

I have not re-run the suite from `C:\workspace\tolstack` yet at review-report
time; that happens as part of the merge-to-`master` step below, per this
repo's "run the suite in both checkouts" rule, since the main checkout has
the real `data/` tree this handoff's currency check reads from.

## Findings

**Should-fix (fixed inline, no further action needed):**

1. §2c undercounted — 11 written, 16 actual (rows 30–45) — propagated into
   the headline "38" figure in 3 files. Corrected to 43 throughout.
2. The blockquote ratio line asserted "38 traced" against a "0 traced"
   conclusion stated everywhere else in the same document. Corrected to "0
   traced / 0 inferred / 43 untraced, out of 43 element instances."
3. New worksheet was missing the required current-ratio calibration
   sentence ("5 of 26"), causing
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
   to fail. Added.
4. Root `PROVENANCE.md`'s `README.md` row was not amended for this
   handoff's edit to that file, causing
   `test_this_branch_amended_the_row_of_every_imported_file_it_changed` to
   fail. Amended.

**Nits:** none beyond the above.

No blockers. No invented tolerances — every number in this workbook is
either a transcribed cell (correctly labelled `untraced`) or a re-derived
total that matches its cached value, and the four should-fix items above are
all corrections to summary arithmetic/process metadata, not to the
underlying transcription, which is accurate throughout.

## Overlay maintenance

Appended one entry to `docs/prompts/REVIEW_AGENT.md`'s "Recurring bugs to
check" list: a workbook's own headline element-instance count needing
re-derivation from its section tables (not just its `traced` ratio), since
this is the first sighting of that specific count — as opposed to the
`traced`/`inferred`/`untraced` labels themselves — being wrong. The existing
"derived headline figure" and "one number, two nouns" entries are the closest
priors; this is a distinct enough shape (a plain miscount feeding a stale
copy in 3 files, plus an inverted "N traced" assertion) to warrant its own
line rather than folding into either.

## Verdict

**APPROVE.** Merging into `master`, cleaning up worktrees/branches, and
pushing per this repo's standing review-agent instructions.
