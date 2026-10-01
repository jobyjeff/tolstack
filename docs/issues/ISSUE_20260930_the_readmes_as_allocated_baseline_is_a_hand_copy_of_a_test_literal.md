---
type: chore
priority: low
status: open
area: viewer/dag-layout
class: unpaired_hand_copy
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_columns_ordered_to_minimise_crossings.md
---

# The README's as-allocated crossing baseline (20 / 12 / 52) is a hand copy of a test literal, and the layout it describes IS derivable

`columns_ordered_to_minimise_crossings` (2026-09-30) gave `apps/viewer/README.md`
a `layout_crossings` claim fence for the three numbers the pass *reaches*
(branch 0, close 17, leader 0), re-derived from the committed document on every
run. The baseline it came from is in the same paragraph as bare prose:

> the baseline it came from — branch 20, close 12, leader 52, as the walk
> allocated them on 2026-09-30 —

and the same three digits are a literal in
`tests/test_topology_projection.py::test_the_pitch_systems_short_legs_now_sit_nearest_the_trunk`.
Nothing pairs the two. Edit the test's pin — which is exactly what a future
change to `_Serializer.allocate` or to the walk's row order would force — and
the README's sentence is stale with nothing red.

**Why this is worth a row rather than a shrug: the layout is derivable.** The
handoff's lesson and the README's first draft both justified the hand copy with
"a layout that no longer exists cannot be re-derived from this tree", and that
is not so: the diff's own `_as_allocated()` helper re-derives it on every test
run by patching `order_columns` out of the walk, and the `before == {...}`
assertion compares against that re-derivation. What cannot express it is the
**metric**: `tests/claims_registry.py::_derive_layout_crossings` goes through
`serialize_topology()`, and that always orders. (The README's reason was
corrected in review; the hand copy is this issue.)

## The smallest fix

Give the `layout_crossings` metric a field saying which layout is meant — e.g.
`pass: applied | as_allocated` — and have `_derive_layout_crossings` patch
`order_columns` out for the second, the same way the test does. Then the
baseline becomes a second `claim` fence beside the first and the paragraph
carries no undeclared digits.

The alternative, if a second fence reads as clutter: drop the three digits from
the README prose and point at the test by name for them. Either closes it; what
should not survive is three figures in a live document that no guard reads.

## Not urgent

Both copies agree today, and the walk is not under active change. The cost of
being wrong is a stale sentence in a README, not a wrong number in a stack.
