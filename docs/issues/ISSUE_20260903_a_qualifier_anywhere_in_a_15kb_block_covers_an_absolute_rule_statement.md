---
type: bug
priority: med
status: open
area: tests/doc-guards
reporter: agent
---

# The one-fold rule scan's unit is a blank-line block, and this repo has 15 KB blocks — a qualifier at the top covers an absolute at the bottom

Found during `review/doc_coverage_sets_derived` (2026-09-03), which replaced the
hand-kept `RULE_PASSAGES` dict with the derived `rule_statements()` scan. The
derivation is the right call and this is the one hole left in it.

## What is true

`_flattened_units()` (`tests/test_thermal_exception_list.py`) splits a file on
**blank lines**, and `passages_in()` stops at the first `RULE_STATEMENT` match
per unit (`break  # one finding per passage`). `Passage.conditional` is then
computed over the whole flattened unit, so **one** `exception` / `Where
computation may live` anywhere in the unit marks the entire block conditional.

The handoff already found and fixed this masking for markdown **tables** — a
table block is split row by row, pinned by
`test_the_rule_statement_scan_can_fail`. Long **bullet blocks** were not split,
and this repo has very large ones: `docs/prompts/REVIEW_AGENT.md` lines
1527-1747 flatten to **14 976 characters** in a single unit, and 1749-1797 to
3 334.

## Measured

Inserting `` `fold()` is the only place element values are combined, full stop.``
at `docs/prompts/REVIEW_AGENT.md:1701` — inside the 14 976-character unit, which
already contains the word "exception" near its top —
leaves `tests/test_thermal_exception_list.py` at **14 passed**. The same
sentence appended to `docs/DAG_TOPOLOGY.md` (a paragraph-sized block) reddens
`test_every_live_passage_stating_the_rule_states_it_conditionally` naming the
line, as it should.

So the scan works where the rule's readers land (ARCHITECTURE.md, the
`tolerance_stack` docstrings, DAG_TOPOLOGY.md — all paragraph-sized) and is
silent across most of the reviewer overlay.

## Suggested fix

Split a unit further than "blank line to blank line". The table fix is the
precedent: a run of `- [ ]` / `- ` list items is many independent claims sharing
one block, exactly like table rows. Splitting on the list-item marker (and
keeping its continuation lines with it) would cut the 14 976-character unit into
per-bullet units and make each bullet carry its own qualifier. Whatever the
split, extend `test_the_rule_statement_scan_can_fail` with the masking case: a
qualified item followed by a bare one in the same block, asserting the bare one
is still found.

Note the same block size also degrades the failure *message*: a finding in a
220-line unit reports the block's first line, not the offending sentence's.
