---
type: bug
priority: med
status: open
area: mutation_witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md
---

# No pytest guard in `test_tolerance_stack.py` or `test_topology.py` can be enrolled: the mutation shadow omits every document they read

Found while enrolling the guard this handoff added. The spec was written, the
file name was derived, both mutations were exact — and the run refused both
before applying either:

```
--- python__test-one-part-and-feature-states-one-nominal-in-every-to__31a8b9ea#1
  clean run of python / tests/test_tolerance_stack.py...
  SKIPPED: the tier is already red with NO mutation applied, so nothing this
  entry does would prove anything. Fix the tier first.
    | FAILED tests\test_tolerance_stack.py::test_the_claim_corpus_exempts_dated_history_on_purpose
    | FAILED tests\test_tolerance_stack.py::test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete
    | FAILED tests\test_tolerance_stack.py::test_every_traced_ratio_publisher_declares_the_current_figure
    | 3 failed, 162 passed
```

The refusal is correct and the spec was withdrawn rather than left to sit
`NOT WITNESSED` — a decayed witness exits non-zero, and handing the operator a
red merge-time tier to record an enrollment is the wrong trade.

## Why the tier is red with no mutation applied

`SHADOWED` (`scripts/run_mutation_witness_tests.mjs`) copies `apps/`,
`scripts/`, `docs/topologies`, `docs/tolerance_stacks`, `docs/spec_library`,
`tests/`, `tolerance_stack/` and `.gitignore`. The claims-corpus guards read
documents in none of those. Run against the shadow by hand, the three name
exactly what is missing:

| guard | what it cannot find in the shadow |
|---|---|
| `test_the_claim_corpus_exempts_dated_history_on_purpose` | `docs/sessions/` |
| `test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete` | `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/REVIEW_AGENT.md` |
| `test_every_traced_ratio_publisher_declares_the_current_figure` | `ARCHITECTURE.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/REVIEW_AGENT.md`, `data/inbox/specs/README.md` |

`tests/test_topology.py` is blocked the same way and is worse: 13 failed / 134
passed in the shadow, almost all of them
`test_the_doc_states_this_graphs_whole_shape_and_states_it_right`, which reads
`docs/DAG_TOPOLOGY.md`.

## Why it matters

These are the repo's two largest guard modules and the two that hold the
value-level and topology rules. Every pytest guard written in either is
unenrollable today, and — because
`CENSUS_LIMITS.python_not_censused` means the census cannot see a pytest guard
at all (`ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard`) — nothing
anywhere says so. The two limits compound: the first makes a pytest guard
invisible to the census, and this one makes it un-witnessable even when an
author goes looking. "A guard you add is enrolled in the same change"
(`CLAUDE.md`) is currently unsatisfiable for the modules where most new guards
land.

## What would fix it

Adding `["README.md"]`, `["CLAUDE.md"]`, `["ARCHITECTURE.md"]`,
`["docs", "DAG_TOPOLOGY.md"]`, `["docs", "SOP_TOLERANCE_STACK.md"]`,
`["docs", "prompts"]` and `["docs", "sessions"]` to `SHADOWED` is the whole of
it on the face of it — they are small, tracked, and already read by guards the
shadow is meant to host. `data/inbox/specs/README.md` is the one that needs
thought rather than a line: `data/` is deliberately not shadowed (gigabytes,
gitignored, main-checkout only), and `--repo` is how a tier reaches it.

**Not fixed here on purpose.** `scripts/run_mutation_witness_tests.mjs` is
fenced out of this handoff — `mutation_witness_shadow_is_per_run` was staged in
parallel and owns that file. This issue is the channel, so the work survives
that handoff reaching `completed/`.

## The guard left unenrolled

`tests/test_tolerance_stack.py::test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`
(added 2026-10-01). Its spec is written and verified correct in every respect
the harness could reach; re-deriving it is five minutes once the shadow is
widened. Both mutations, for whoever picks this up:

| file | find | replace |
|---|---|---|
| `docs/topologies/topology_pitch_system.json` | `"nominal_length_mm": 105.9908,` | `"nominal_length_mm": 109.4,` |
| `docs/topologies/topology_vpa_pitch_linkage.json` | `"nominal": 105.9908,` | `"nominal": 106.9908,` |

The first replays the real defect
(`ISSUE_20260930_two_topologies_state_the_pitch_link_length_3mm_apart.md`) and
is the `properties` half; the second is the `dimension` half. Two are needed
because `_edge_nominal_statements` builds its list from two independent
branches and a witness on one proves nothing about the other.
