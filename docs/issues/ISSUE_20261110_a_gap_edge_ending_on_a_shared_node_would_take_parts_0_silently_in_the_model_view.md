---
type: chore
priority: low
status: deferred
area: model_view
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: class:silent_failure
class: silent_failure
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# A gap edge ending on a shared node would take `parts[0]` silently in the model view

`tolerance_stack/model_view.py`'s `_end_part` gives a gap edge's end to the end
node's first-listed part. The module docstring and `docs/DAG_TOPOLOGY.md` say
the case of a gap edge ending on a node two parts share is "left open rather
than answered by a rule nothing exercises", and the review re-derived that
neither committed model has one (v2: 0 of 8 gap edges; v1: 0 of 17). But the
code does answer it -- with `parts[0]`, the exact shape
`ISSUE_20261029_an_armed_pick_assumes_the_face_is_on_the_nodes_first_named_part.md`
and the review overlay's "A contact face's part taken from `parts[0]`" entry
name -- and nothing pins the measurement, so the first author who adds such an
edge gets a feature id, a joint id and a `within` computed off whichever part
happens to be listed first, with no test red and no note on the page.

## What to do

Either of the two makes it loud; pick one:

- `_end_part` raises (or the view records the edge under a `gaps` list) when
  `len(node.parts) > 1`, with `tests/test_model_view.py` pinning that refusal
  on a synthetic topology; or
- `tests/test_model_view.py` pins "no committed model has a gap edge ending on
  a shared node" over `docs/topologies/*.json`, so the first such edge reddens
  the suite and the rule is decided then, by whoever authored it.

The first is the honest one (the view says what it does not know); the second
is one assertion.
