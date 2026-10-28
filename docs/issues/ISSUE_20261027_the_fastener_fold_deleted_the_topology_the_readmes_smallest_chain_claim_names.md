---
type: bug
priority: high
status: resolved
area: viewer/README claims
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
handoff: docs/sessions/HANDOFF_20261027_the_checks_and_claims_the_folds_left_naming_what_they_removed.md
class: fold_left_stale_reference
---

# The fastener fold deleted the topology the README's `smallest_chain` claim names

`integration` at `449d8609` (handoff `the_fastener_stacks_join_the_model`,
`b3ae1bb6` "fold the four fastener grip stacks into vpa_pitch_linkage")
removed `docs/topologies/topology_pitch_link_to_pitch_plate.json`. Two
things still name that topology:

- `apps/viewer/README.md` ~980, a declared claim. It says
  `metric: smallest_chain`, `topology: pitch_link_to_pitch_plate`,
  `value: pitch_link_thread_region_t`.
- `tests/test_viewer_readme_doc_facts.py:66`, which sets
  `SUBJECT_TOPOLOGY = "pitch_link_to_pitch_plate"`.

With the projections **rebuilt from that tree**, `pytest -q` is red on two
tests:

- `tests/test_claims_registry.py::test_every_declared_claim_agrees_with_its_source`,
  which reports `apps/viewer/README.md:980 smallest_chain(...): the
  projection holds no topology 'pitch_link_to_pitch_plate'`.
- `tests/test_viewer_readme_doc_facts.py::test_thread_region_t_is_the_smallest_chain_not_the_largest`,
  which fails with `StopIteration`.

Measured in the review of `leaders_follow_the_active_study_across_the_seam`,
which merged `integration` and rebuilt the projections with
`scripts/rebuild_projections.ps1 -RepoRoot <worktree>`. That branch does
not touch the claim, the tests or `docs/topologies/`: all three are
byte-identical to `integration`. A run against a projection built before
the fold still finds the old topology and passes, which is how this got past
the fold's own gate.

The fix is either of these:

- re-point the claim and `SUBJECT_TOPOLOGY` at the three `pitch_link_*`
  studies, which now live on `vpa_pitch_linkage`, and re-derive which one
  is smallest;
- retire the claim with a dated note.

Do not delete the declaration silently; `tests/claims_registry.py`'s
message says why. Priority is `high` because the next batch merge's
rebuilt-projection run is red on it.

## Resolved 2026-10-27 (handoff the_checks_and_claims_the_folds_left_naming_what_they_removed)

Re-pointed, not retired: the claim reads `topology: vpa_pitch_linkage`,
`studies: pitch_link_`, `value: pitch_link_thread_region_t`, and the metric
gained the `studies` field because the topology now holds twenty-odd studies.
The smallest chain of the three `pitch_link_*` studies is still
`pitch_link_thread_region_t` (2 edges; the others 6 and 7).
