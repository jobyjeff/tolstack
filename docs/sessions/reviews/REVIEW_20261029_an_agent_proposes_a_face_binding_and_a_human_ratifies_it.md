---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review — an_agent_proposes_a_face_binding_and_a_human_ratifies_it

The branch is `handoff/an_agent_proposes_a_face_binding_and_a_human_ratifies_it`
at `286214c3`, 7 commits, and this is the first review of it. The branch
worked the `active/` handoff. The handoff was not already merged: the
`merge-base --is-ancestor` check came back negative. `integration` had moved
`bf180b3d` → `d28104a3` under the branch, but only in three docs files (an
issue addendum and a board move). The merge into `review/…` was clean, with no
conflicts. Every artifact the diff adds arrives as `A`, so it overwrote no
other session's record.

## What was verified

**The fold (value level).** A `proposed` event never enters `bindings`. An
accept must bind the proposed face at the proposed end, a proposal answered
twice is a load error, and an `agent:` actor cannot write `bound` or
`rejected` (`tolerance_stack/feature_identity.py`). `fit_bound_features.py`
reads `record.bindings` only (`:433`). **I watched a guard fail:** I mutated
`build_projection` so that a proposal is also appended to `bindings`. That
turned exactly `test_a_proposal_never_stands_as_a_binding` and
`test_a_proposal_produces_no_fitted_nominal_and_its_accept_does` red, and I
then restored the file.

**The CLI** (`scripts/propose_bindings.py`). It refuses all seven words in
`REFUSALS`, and a test reaches each one. It writes `proposed` only, the agent
actor is required, and a report is all-or-nothing at the check stage. Every
writer that hard-coded `"annotate-app"` now writes `AA.humanActor(...)`; a
grep of `apps/annotate` finds none left.

**The provenance audit of the first pass.** This handoff adds no stack value,
so the audit is about the 55 inbox events. I re-read all 55 from the main
checkout through this branch's schema: `0 bound / 55 proposed / 55 open`,
across 33 stack keys, 45 high and 10 medium. That matches the lesson. I
re-fitted every proposed face independently with `fg.fit_face`. The stored
`surface_class` equals the fitted class on 55 of 55, and every face satisfies
its end's shape rule. Every pair distance the bases quote re-derives from the
mesh:

| edge | measured |
| --- | ---: |
| `pitch_link_length` | 105.9906 |
| `tan_link_length` | 61.4504 |
| `piston_head_lower_thickness` | 2.4910 |
| `piston_head_upper_thickness` | 6.5560 |
| `gas_spring_mount_flange_to_end_stop` | 8.6670 |
| `gas_spring_mount_datum_a_to_end_stop` | 76.8600 |
| `bushing_214820` | 4.7625 |
| `pitch_link_eye` | 7.1120 |
| `washer_nas1149v0332` | 0.8130 |
| `bolt_length_11` | 25.6540 |
| `under_head_chamfer_washer` | 1.6000 |

The radii quoted in the bases also match the fits: 5.147, 2.41/2.413/2.415,
7.141, 7.9375, 6.7318 and 16.5. The `pitch_link_length` nominal of 105.9908
is in the topology (`properties.nominal_length_mm`).

**The lesson's arithmetic.** 74 nodes and 95 edges give 190 ends, and
55 + 45 + 90 = 190. The 45/10 confidence split and N = 55 are exact. I did not
re-derive the census table, which needs the browser's anchor precedence. The
tactical's real-data check recorded it as equal to the Python census.

**Mandatory checks 1–7 (stack provenance).** None of them applies to this
diff: it changes no file under `docs/tolerance_stacks/` or `docs/topologies/`,
so no element value, sign, LMC/MMC mapping, RSS or traced ratio moved. A
binding is identity, not a value source (`CLAUDE.md`), and a proposal is less
than a binding. The traced ratio is unchanged.

## Tests

The tactical report records a full-suite run in the worktree at `161913cf`:
`1654 passed, 1 skipped, 1 failed`. The one failure is
`test_viewer_js_suite`, which is red in every worktree by design, and that
tier ran 621/621 against a scratch root. The record is consistent with the
diff, so the tactical run gets the benefit of the doubt.

- **Pre-merge risky subset** (rows: Python, `apps/annotate/`, guard/witness,
  docs prose):
  - `pytest -q` over `tests/test_feature_identity.py`,
    `tests/test_feature_geometry.py`, `tests/test_propose_bindings.py`,
    `tests/test_architecture_inventory.py`,
    `tests/test_js_python_vocabulary.py`,
    `tests/test_js_vocabulary_is_generated.py`,
    `tests/test_part_mesh_aliases.py`, `tests/test_mutation_witnesses.py`,
    `tests/test_tolerance_stack.py`, `tests/test_provenance.py`,
    `tests/test_thermal_exception_list.py` and `tests/test_claims_registry.py`:
    **435 passed**.
  - `node apps/annotate/run_tests.cjs`: **255/255**, with no `SKIP [real]`
    line.
  - `node apps/annotate/run_browser_check.mjs` (`node_modules` junctioned into
    the worktree): **103/105**. The two reds are the mock-anchor checks
    already filed on integration as
    `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.
    Every check in the new accept and reject passes is green.
- **Witness tier** (`node scripts/run_mutation_witness_tests.mjs --repo
  C:/workspace/tolstack/data/scratch/agent_proposes --changed-since
  integration`): **28/28 witnessed, 28/28 reached, 0 left to the sweep**,
  8m58s, exit 0. All 8 new specs are among them. The scratch root is the
  tactical agent's. Its `apps/` is byte-identical to this tree
  (`diff -rq` is empty), and its projections were built from the handoff tree.
  The integration drift was docs-only, so those projections match the merged
  tree.
- **Post-merge full suite** (`C:/workspace/tolstack/venv-win/Scripts/python.exe
  -m pytest -q -rfs`, review worktree): **1 failed, 1654 passed, 1 skipped**
  in 330 s. That is inside the budget, and the time is recorded with
  `dispatch suite-time record`. The failure is the by-design
  `test_viewer_js_suite`. Its tier ran **621/621** through
  `node apps/viewer/run_tests.cjs --repo <scratch>`. The skip is the
  uninstalled pitch-link bearing re-extraction. The repo's conftest prints no
  contention header lines.
- **Not run by me:** the viewer browser TRUTH tier. The diff touches
  `apps/viewer/` only in the generated `vocab.gen.js`, which adds lists and
  nothing positional. The tactical ran that tier: 33/35, and both reds are
  already filed as under-load flakes.
- **Data pollution:** none. Nothing under the main checkout's `data/`, outside
  `data/scratch/`, is newer than the start of my runs. The inbox still holds
  55 events plus its README.

## Findings

### Should-fix (unfixed, so filed)

1. **Until the batch merge, trunk's annotator misreads the proposal pass.**
   - *Location:* trunk `apps/annotate/binding_state.js`,
     `AA.elementBindingState`, read against the main checkout's rebuilt
     `data/projections/feature-identity/bindings.json`.
   - *What is wrong:* trunk reads a record with empty `bindings` as
     `owner_not_in_set`. So the 33 rows that carry proposals show the "not in
     this set" alert, where "No face is bound" is the true message. A hand run
     of trunk's feature-identity builders also fails on the new verdict. The
     handoff's DoD required this ordering (events written before the merge),
     so this is not a defect in the author's execution.
   - *Fix:* the batch merge resolves it.
   - Filed as
     `ISSUE_20261029_trunks_annotator_reads_the_proposal_pass_as_owner_not_in_set_until_the_batch_merge.md`,
     and added as a new overlay entry.

### Nits (not filed)

- **`propose_all`'s all-or-nothing covers the checks, not the writes.** A
  `FileExistsError` on row k leaves rows 1..k-1 already written. Collision is
  near-impossible, because numbers start at max + 1.
- **The JS picks actor kinds by position.** It uses `AA.ACTOR_KINDS[0]` and
  `[1]`, while Python names the agent kind `AGENT_ACTOR`. This matches the
  file's existing `AA.DIRECTIONS[1]` / `MODEL_ANCHOR_SOURCES[n]` idiom, and
  the guard that refuses an agent's accept or reject is witnessed.

### Judgement calls in the lesson I agree with

- **Accept and Reject sit in the bar, not on the rail row.** An edge can carry
  two proposals, and a 260 px row cannot hold two button pairs.
- **The shape rule moved to Python** and is now generated into the JS, so the
  CLI's refusal and the annotator's colouring cannot disagree.
- **The pitch-plate bores went to the gap list.** The drawing contradicted the
  engine's ranks 1 and 2, so a medium proposal would have been a guess.

**Design check:** the chip is muted at `--t-meta`. The proposal stripe is
dashed in the suggestion accent rather than a state hue, and the basis is
behind a hover. I found no named-rule violation.

## Verdict

**APPROVE.** No blockers, and I made no inline fixes. The merge goes to
`integration` by fast-forward.

## Note for the next reviewer

The tactical agent's scratch root `C:\workspace\tolstack\data\scratch\agent_proposes\`
is gitignored, and this review no longer needs it. I left it in place on
purpose. It holds **junctions** to the main checkout's `data/meshes` and
`data/inbox/*`, so a recursive delete that follows them would destroy real
inbox data. Remove the junctions first, as links (`rmdir` on each junction),
then delete the rest.
