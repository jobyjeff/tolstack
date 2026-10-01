---
type: chore
priority: med
status: deferred
area: guards/mutation-witness
class: guard_cannot_fail
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_guard_census_pins_the_set_not_the_count.md
defer_until: dispatch/docs/strategy/BRIEF_20260930_porting_a_proven_lever_across_repos.md
---

# The mutation-witness tier's exit code reads one of the three census pins, so two of them are pytest-only

`guard_census_pins_the_set_not_the_count` (2026-09-30) turned `DECLARED_GUARDS`
from a bare count into three values per source — `declared`, `enrollable` and
`names` (a digest of the guard name set) — and
`tests/test_mutation_witnesses.py::test_the_enrollment_census_holds` asserts on
all three.

**`scripts/run_mutation_witness_tests.mjs` still gates on one.** Its tail reads

```
const moved = STATE.rows.filter((r) => r.declared !== r.pinned);
```

and sets `process.exitCode = 1` from that. So the two arrivals the new pins
close — a guard swapped for another in one change, and a second declaration of
an existing name — are red in `pytest -q` and **exit 0 in the tier**. The tier
*prints* them (`censusReport` marks every moved pin), which is the half that
made this acceptable to leave; nothing reads a printed line but a person.

That matters because `CLAUDE.md` puts this tier on the batch-merge must-run
list precisely as the place a census defect is caught, and its non-zero exit is
what the operator's sweep reads.

**Why it was left.** The file was fenced out of that handoff: a sibling handoff
staged the same sweep (`projection_freshness_pairs_with_the_tree`) was told its
input set is coupled to this file's `SHADOWED` list, and the two handoffs were
scoped to share no files.

**The fix** is three lines, once that sibling has landed: import `pinsMoved`
from `scripts/guard_enumeration.mjs` (it already exists, and `census()`'s own
`censusHolds` is computed from it) and filter on it instead of on
`r.declared !== r.pinned`, widening the message that follows to print each
moved pin's own sentence and the `pinLine` to paste back.
