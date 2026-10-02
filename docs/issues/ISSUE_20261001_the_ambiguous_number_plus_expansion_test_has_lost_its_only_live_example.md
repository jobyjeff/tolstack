---
type: chore
priority: low
area: tests/test_fit_bound_features
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_mesh_store_reconciled_to_the_pure_signature.md
status: deferred
class: test_coverage_retired_by_a_fix
defer_until: 2026-11-01
resolution: deferred 2026-10-02 (triage) -- `low`, deferred by default under the budget rule. ISO date rather than a class trigger: this sweep measured 283 issues workspace-wide already deferred behind class triggers whose live count the budget rule itself drove below the CLASS_WAKE_THRESHOLD of 3 -- see dispatch/docs/issues/ISSUE_20261002_a_class_defer_trigger_cannot_fire_once_the_budget_rule_has_deferred_the_class.md.
---

# `test_a_placement_always_comes_from_the_mesh_that_owns_it` now skips, permanently, until a new ambiguous-number case appears

## What happened

`tests/test_fit_bound_features.py::test_a_placement_always_comes_from_the_mesh_that_owns_it`
(line 422) is guarded by
`@pytest.mark.skipif(sha_for("asm217755_MS14101_3_1ec77e91") is None, ...)`.
Its own docstring explains why it hard-codes that specific, now-superseded
part_id rather than the current `BEARING_PART_ID` constant: it needs **two**
installed geometries under one ambiguous product number, where only one of
them carries a `placements.json` expansion sidecar -- and the pitch-link
`MS14101-3` duplicate (`_9bfdb344` clean / `_1ec77e91` contaminated) was the
only live case of that shape.

This handoff (`mesh_store_reconciled_to_the_pure_signature`) fused that
duplicate: both signatures collapsed to `815597cb...` under the pure
`shape_signature` key (rotorkit's `shape_signature_is_pure`,
`LESSONS_20261001_shape_signature_is_pure.md`), and `_1ec77e91`'s directory
moved to `data/meshes_superseded/` (gitignored, main checkout). So
`sha_for("asm217755_MS14101_3_1ec77e91")` now returns `None` against the live
store, correctly and permanently -- the scenario this test measures no longer
exists anywhere in `data/meshes/`.

## Why it is worth a line rather than silent

This is the right skip (not a bug this handoff should chase), and it is
exactly the failure class this handoff exists to make loud elsewhere: an
exact-match lookup returning nothing because the key space moved. The
difference here is there is nothing to repoint it to -- the fused store no
longer has two directories under one ambiguous number with a sidecar
mismatch. Left as a skip with no further signal, this coverage is just gone;
nobody is told to come back to it when (if) a future rotorkit extraction
produces a new ambiguous-number-plus-sidecar case.

## Not fixed here

Filing rather than fixing because closing it needs a decision this handoff
has no standing to make: retire the test outright (its purpose is served,
case closed), or keep it as a dormant regression guard for a scenario class
that could recur, in which case it needs either a synthetic fixture (the
module's own docstring notes synthetic *bindings* are already normal here,
only the *geometry* is meant to be real) or an explicit note that it is
intentionally dormant until the next ambiguous extraction.
