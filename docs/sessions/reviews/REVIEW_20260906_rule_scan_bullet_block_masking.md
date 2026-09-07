---
type: review
handoff: rule_scan_bullet_block_masking
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review: rule_scan_bullet_block_masking

## What I verified

This is a code/test-only handoff (not a tolerance stack), so the mandatory
stack checklist (provenance, signs, LMC/MMC, RSS, etc.) does not apply. Scope
was `tests/test_thermal_exception_list.py`'s `_flattened_units()` /
`passages_in()` / `Passage.conditional`, per `ISSUE_20260903_a_qualifier_
anywhere_in_a_15kb_block_covers_an_absolute_rule_statement.md`.

- **Reproduced the pre-fix bug myself**, before merging: fed a synthetic
  two-bullet block (qualified item followed by a bare one) to `passages_in()`
  on the pre-merge tree. It collapsed to one unit at `d.md:1` and the bare
  statement was masked — exactly the defect described.
- **Merged `handoff/rule_scan_bullet_block_masking` into this review branch**
  (fast-forward, `13ff8f9` → `765ff72`, no conflict). Actual diff is two files:
  `tests/test_thermal_exception_list.py` and the lesson; the other files in
  the branch-vs-integration-base diff were already-merged prior handoffs,
  confirmed via `git show 765ff72 --stat` (2 files) vs. `git diff 65d55dd..
  handoff --stat` (9 files, cumulative).
- **Re-ran the same synthetic probe post-merge**: now splits into two units
  (`d.md:1` qualified, `d.md:2` bare-unconditional) — bug fixed.
- **`tests/test_tolerance_stack.py` untouched** — confirmed via
  `git diff 13ff8f9 HEAD -- tests/test_tolerance_stack.py` (empty), per the
  handoff's explicit scope exclusion (that's `drop_stale_gitignore_
  publisher_exemption`, already merged separately).
- **Independently recomputed the corpus-sweep claim** rather than trusting the
  lesson's prose: called `rule_statements()` directly over the live repo
  post-merge — 20 total passages, 0 unquoted+unconditional (bare). Matches the
  lesson's "no previously-masked real finding surfaced."
- **Checked the real `docs/prompts/REVIEW_AGENT.md` block** the issue named
  (old lines 1527-1747): `_flattened_units()` now yields 17 units in that
  range instead of 1, confirming the split actually fires on the reproduction
  case, not just the synthetic fixture.
- **Nested-bullet edge case**: `BULLET_START` matches a marker at any
  indentation, so a nested sub-bullet also opens its own unit rather than
  staying attached to its parent as a continuation. This is finer-grained than
  strictly necessary but not a defect — the module's own docstring says false
  positives are cheap here and silence is not, and finer splitting can only
  ever reduce masking, never introduce it.
- **Full suite**: `667 passed, 1 skipped`, both immediately pre-merge (checked
  out `13ff8f9` directly) and post-merge — identical counts, confirming the
  lesson's claim that the fix surfaced no new findings in the tracked corpus.
- **No stray files**: `git status --short` clean after merge; scratch probes
  were written under the session scratchpad/tmp, not the repo, and removed.
- Regression test (`test_the_rule_statement_scan_can_fail`) asserts on the
  reported line number, not just pass/fail, satisfying deliverable #3
  (failure-message granularity).

## Findings

None. Clean implementation: the split is additive (a block with no bullet
marker still collapses to exactly one unit, so the 12 pre-existing table/
non-bullet test cases needed no changes), the regression test covers both the
plain-bullet and checkbox+continuation-line shapes, and the corpus-sweep claim
in the lesson reproduces exactly under independent verification.

## Verdict

**APPROVE.** Merged to `integration` (fast-forward), tests green in the merged
tree, pushing now.
