---
type: chore
priority: low
status: triaged
area: docs/sop
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
strategy: docs/strategy/BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md
---

# Nothing stops a `Study` or `StackDefinition` `description` growing a derivable count

`projection_field_guard_rows` (2026-09-15) brought `Topology.description` under
`tests/test_topology.py`'s structural-count pairing —
`ISSUE_20260914_topology_description_sits_outside_the_structural_count_guard`
suggestion 1. Suggestion 2 was a question, and this is what measuring it found.

## Measured, 2026-09-15

- **No committed `study_*.json`'s `description` (or any other top-level prose
  field) states an inventory today.** All 21 scanned with the guard's own
  `prose_candidates` + `inventory_sentences`: zero hits.
- **No committed `stack_*.json`'s `description` states a derivable count
  either.** Five have a `description`, two have none; none contains a
  `<number> <noun>` pair at all.

## So there is nothing to fix — and extending the topology guard would be wrong

Worth stating plainly, because "add the field to the tuple" is the obvious move
and it is the wrong one:

- **A study.** `_COUNTABLES` derives its six numbers from the **graph**
  (`len(t.parts)`, `len(t.nodes)`, `_cycle_rank(t)` …). A study's own countable
  is the length of its `selection`, which is a *subset* of the graph. So
  scanning `Study.description` against `_COUNTABLES` would read "this study
  walks 4 edges across 3 parts" as a false claim about a graph with 7 edges —
  a false positive, and the loud kind that gets a guard deleted. A study-side
  pairing needs a study-side baseline, which is a different guard.
- **A stack.** A stack has elements, not parts/interfaces/edges. None of the
  six labels applies, so there is no baseline at all to pair against.

## The decision this needs

The issue offered two routes and this is a judgement, not a fix:

1. Write the prohibition down — `docs/SOP_TOLERANCE_STACK.md`'s "Titling an
   artifact" says a `description` never carries a derivable count, and the SOP
   vocabulary scan (`tests/test_sop_vocabulary.py`) already has the machinery
   to keep prose paired to code. A rule read by an author is cheaper than a
   scanner for something nobody has done yet.
2. Or give studies their own pairing with their own baseline (selection length,
   term count) when a study description first restates one.

Route 1 is the cheap one and the one that fits "an unanswerable stack stated
plainly beats a confident wrong one". Route 2 is real work with no demand yet.
Filed for a strategy read rather than picked here: the handoff's brief was to
measure and say what it found, and inventing an SOP rule is past that line.
