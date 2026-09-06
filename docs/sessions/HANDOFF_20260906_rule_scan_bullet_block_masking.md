---
priority: med
depends_on: []
---

# HANDOFF 2026-09-06 — rule_scan_bullet_block_masking: split rule-passage units on bullet-item boundaries, not just blank lines

Source: `docs/issues/ISSUE_20260903_a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement.md`
(found during review of `doc_coverage_sets_derived`, 2026-09-03). Baseline:
trunk, with `doc_coverage_sets_derived` merged. Scope: `tests/test_thermal_exception_list.py`
(`_flattened_units()`, `passages_in()`, `Passage.conditional`) and its own test
coverage. Do NOT touch `tests/test_tolerance_stack.py`'s curated-publisher
logic — that's a separate handoff (`drop_stale_gitignore_publisher_exemption`).

## Deliverable

1. **Split a flattened unit further than "blank line to blank line".**
   `_flattened_units()` currently treats an entire blank-line-delimited block
   as one unit; `passages_in()` stops at the first `RULE_STATEMENT` match per
   unit (`break  # one finding per passage`), and `Passage.conditional` is
   computed over the *whole* unit — so one `exception` / `Where computation
   may live` anywhere in a large block marks every rule statement in that
   block conditional, even ones pages away. This repo has such blocks:
   `docs/prompts/REVIEW_AGENT.md:1527-1747` flattens to 14 976 characters in
   a single unit (confirmed: inserting an absolute rule statement at line
   1701, inside that unit, left `test_thermal_exception_list.py` at 14
   passed — it should have gone red).
   The precedent is the table fix already landed in this same handoff cycle:
   a markdown table is split row by row rather than treated as one unit,
   pinned by `test_the_rule_statement_scan_can_fail`. Apply the same idea to
   bullet blocks: split a run of `- [ ]` / `- ` list items on the item marker,
   keeping each item's continuation lines with it, so each bullet becomes its
   own unit and carries its own qualifier independently of its neighbors.
2. **Extend `test_the_rule_statement_scan_can_fail` with the masking case**
   this bug describes: a qualified bullet item immediately followed by a bare
   (unqualified, absolute) one in the same original block — assert the bare
   one is still found as an unconditional rule statement. This is the
   regression test for the defect; without it the split could silently regress
   back to one-unit-per-blank-line-block.
3. **Fix the failure-message granularity as a side effect of the split.** The
   issue notes a 220-line unit currently reports the block's first line, not
   the offending sentence's, when a finding fires — once bullets are split
   into their own units, each unit's own line number naturally becomes the
   reported one. Confirm this in the new test's assertion (check the reported
   line number, not just pass/fail).

## Definition of done

- The 15 KB `docs/prompts/REVIEW_AGENT.md` bullet block (or an equivalent
  fixture) no longer masks a bare rule statement placed after a qualified one
  in the same block.
- `test_the_rule_statement_scan_can_fail` covers the masking case with an
  assertion on the reported line number.
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`). Note: per
  this repo's own `CLAUDE.md`, a docs-only change here can legitimately turn
  the suite red — if splitting bullet blocks surfaces a *newly-detected* bare
  rule statement somewhere in the existing docs corpus that was previously
  masked, that's a real finding, not a test bug; qualify the sentence in the
  doc (don't weaken the test) and note it in the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20260906_rule_scan_bullet_block_masking.md`):
  the split rule chosen (bullet-marker boundary + continuation-line rule),
  and whether the corpus sweep surfaced any previously-masked real findings.
