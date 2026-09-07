---
type: review
handoff: drop_stale_gitignore_publisher_exemption
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review — drop_stale_gitignore_publisher_exemption

Not a tolerance-stack handoff (it's a test-guard fix), so the tolerance-stack
mandatory checklist doesn't apply. Reviewed against the universal checks and
this repo's overlay.

## What I verified

- **Scope.** The handoff branch (`e124186`, single commit on top of
  `integration`'s tip `3a64616`) touches exactly `tests/test_tolerance_stack.py`,
  `PROVENANCE.md`, and the new lessons file — matches the handoff's stated
  scope exactly. `tests/test_thermal_exception_list.py` was correctly left
  untouched (owned by a separate handoff, `rule_scan_bullet_block_masking`).
- **The diff.** Both existence-check paths in `traced_ratio_publishers()`'s
  callers had the `data/inbox/specs/README.md` exemption removed: the `gone`
  assertion's `not in (...)` clause, and the `missing`-loop's `continue`
  (folded into the append condition as `if not p.exists() or current not in
  p.read_text(...)`). Both stale `# gitignored` comments deleted. Confirmed
  the premise: `git check-ignore -v data/inbox/specs/README.md` returns
  nothing and `git ls-files data/` lists it — tracked, not gitignored,
  present in this worktree and the main checkout alike.
- **A new guard has been observed failing (universal check).** Reproduced
  the before/after myself, not just trusted the lesson's numbers:
  - Pre-merge (exemption still in place), moved
    `data/inbox/specs/README.md` out of this worktree and ran
    `tests/test_tolerance_stack.py tests/test_thermal_exception_list.py`:
    **159 passed** — silent, matching the founding issue's measured claim
    exactly.
  - Restored the file, merged `handoff/drop_stale_gitignore_publisher_exemption`
    into this review branch (clean fast-forward, no conflict — nothing to
    resolve under the conflict carve-out).
  - Post-merge, same deletion: **2 failed, 157 passed**, both failures naming
    `data\inbox\specs\README.md` by path. The guard now fails on exactly the
    input it was written to catch.
  - Restored the file, ran the full suite: **667 passed, 1 skipped**, clean.
    `git status --short` on `data/inbox/specs/README.md` and the whole tree
    is empty afterward — no test pollution left behind.
- **PROVENANCE.md row.** The new `Amended again 2026-09-06` sentence
  correctly states "no test added or removed, no count or value changed;
  two existing checks' stale exemption removed" — accurate against the diff.
- **Restatement / stale-count check (universal).** Grepped
  `tests/test_tolerance_stack.py` for `# gitignored` post-fix: zero hits. The
  lesson's claim that no other curated-list entry carried a similar
  exemption checks out — `_RATIO_PUBLISHER_NAMES` only ever had this one.
- **Lesson file.** Present at the path the handoff specified, and it
  correctly flags an ambiguity in the handoff's own DoD wording: "both files
  fail when the README is removed" is true of the combined pytest
  invocation's nonzero exit, not of `test_thermal_exception_list.py`
  individually (that file has zero references to the README and none of its
  own tests go red alone). Worth noting as a should-fix against the *handoff
  text*, not the work — not filing an issue for it since the lesson already
  documents the correct reading and no code or doc claims otherwise.

## Findings

None. No blockers, no should-fixes, no nits.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md`'s "Recurring bugs to check" list already covers
the general shape of doc-scan guards that can't observe absence
(`ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section`), but
this handoff's specific failure — a guard's own hardcoded exemption resting on
a factual claim (`# gitignored`) that had gone stale — is a distinct enough
shape (the guard *could* observe the deletion; a coded belief told it not to)
that I added a new bullet for it, seeded from this review.

## Verdict

**APPROVE.** Merged to `integration` (fast-forward) and pushed.
