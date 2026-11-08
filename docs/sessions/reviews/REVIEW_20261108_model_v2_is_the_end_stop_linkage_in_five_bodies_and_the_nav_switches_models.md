---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE (round 2)
blockers: 0
---

# Review — model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models

Branch `handoff/…` at `f5b9755d` (6 commits), merged into
`review/…` (cut from `integration` `fef9a376`, clean merge, no conflicts).
Containment check: not already on `integration`. First review of this slug.

**Verdict: REQUEST CHANGES — one blocker.** The v2 file, the occurrence rule,
the Models nav and the docs are good work and mostly ready; the blocker is
in the one piece the handoff did not specify, the `ids_from` read-through,
and it can corrupt the append-only feature-identity log on a single click.

## Blocker

### B1. A re-pick on a v2 edge whose binding is read through from v1 writes an event the fold refuses

- **Where:** `apps/annotate/binding_state.js` `AA.identityReadThrough`;
  `apps/annotate/app.js` `cmdTake` (~l. 4097) and the armed click
  (~l. 2991, `AA.planArmedClick`); `tolerance_stack/feature_identity.py`
  `build_projection` (supersedes, l. 576–588) and `_answered_proposals`
  (l. 626–645).
- **What's wrong:** under v2, `mergedIdentityProjection()` returns v1's records
  re-keyed to `vpa_end_stop_v2`. `cmdTake` builds `stackKey` from the open
  topology (v2), reads the end's *standing* binding from that merged record —
  which is v1's `bound` event — and `planArmedClick`/`planAnswer` set
  `supersedes` to that v1 event id. The written event is keyed to v2 and
  supersedes a v1-keyed event. The Python fold refuses exactly that:
  `event … supersedes …, which is on a different stack key`. Reproduced in a
  scratch fold from the real `0001_pitch_link_length_accepted.json` (v1 bound,
  then a v2-keyed bound with `supersedes` pointing at it):
  `FOLD REFUSED: event 'v2-rebind' supersedes 'v1-bound', which is on a different stack key`.
  The log is append-only, so after one such click
  `build_feature_identity_projection.py` cannot rebuild until someone designs
  a correction — the same state
  `ISSUE_20261108_four_feature_identity_events_share_a_seq…` already describes,
  reached a second way. Exposure is real: v2 is the default model, the pane
  plays the P2 sweep on it, and four of its edges (`pitch_link_length`,
  `tan_link_length`, `hub_to_pitch_plate_spindle_coaxiality`,
  `pitch_plate_slide_bushings_to_piston_body`) carry v1 bindings that the
  re-pick path supersedes.
- **The answer paths do not agree with each other either**, which is the
  design point to settle, not just the one line: Accept and Reject build their
  events from `proposal.stack_key` — the inner proposal objects keep **v1's**
  key — so they write v1-keyed events (the fold accepts them), while Take and
  the armed click write **v2-keyed** ones. The read-through comment ("an event
  written here is keyed to this topology") is true for neither half. And
  `own[edge_id]` is per *edge*: the first v2 event on either end of a shared
  edge hides v1's record for **both** ends, so binding `from` under v2 makes
  the `to` end's v1 binding disappear from v2's view.
- **Suggested fix (author's design call):** pick one key for a write made on a
  shared id under `ids_from` and use it on every answer path. The simplest
  coherent one is the source model's key (`ids_from`), since
  `test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`
  already pins the shared ids to the same feature — then every
  `supersedes`/`ratifies`/`rejects` stays on one key and no read-through
  bookkeeping is needed for the write side. The alternative (v2's own key,
  per-end read-through, never superseding across keys) needs a rule for what
  a v2 re-bind does to the v1 binding. Either way, **add a test that folds
  the events every answer path builds under a read-through record through
  the Python rules** (accept, reject, take a different face, take with open
  proposals) — no current test writes under `ids_from`. Document the chosen
  key in `DAG_TOPOLOGY.md` "Models" and `ANNOTATION_SURFACE.md`.

## Nits (for the same rework round)

- `apps/annotate/sweep.js` ~l. 184: `AA.sweepPlaysOn` was inserted between
  `AA.sweepTopologyId`'s comment ("The topology a run's feature joins name…")
  and its function, so that comment now heads the wrong function.
- v2 opens first only because `topology_vpa_end_stop_v2` sorts before
  `topology_vpa_pitch_linkage` alphabetically; the handoff offered "sort v2
  first or give the file an explicit `order`" and neither was done. Harmless
  today; a v3 named after the alphabet will silently not be the default.
- `VA.topologyIdsFrom` (`apps/viewer/topology.js`) and `AA.topologyIdsFrom`
  (`apps/annotate/binding_state.js`) are the same reader written twice.

## What I verified

- **Mandatory stack checks 1–7:** the work adds **no element values**, no
  checks, no study — every one of v2's 27 edges is valueless
  (`dimension` absent on all 27, each with a `note`), so checks 1–6 exit with
  nothing to audit. Check 7: v2 contributes **0 element instances**; the
  traced ratio's named set is unchanged. Cite-or-gap holds: nothing invented.
- **Title** "End-stop pitch linkage, one blade" — short noun phrase, a
  `description` carries the rest; ids are new, nothing moved.
- **Lesson arithmetic re-derived** from the files and the event log: 23/23 node
  ids reused; the two new edges are exactly `pitch_plate_pilot_in_piston` and
  `piston_body_id_datum_to_head_seat`; the bound/proposals-only edge lists match
  the log edge for edge.
- **Bodies:** five mechanism bodies with linkage's part lists plus three
  riders (`piston_head_lower`, `piston_head_upper`, `piston_cover`); no
  gas spring, VPA, ring gear, brake or hardware parts.
- **Alias row** for `piston_cover_214958_002` → `asm217755_214958_002`, with
  drawing-number evidence and the rotorkit run named.
- **`Part.occurrence`** validated in `__post_init__`, additive, `/v0` kept.
- **Nav / boot:** `localStorage` reads and writes wrapped in try/catch through
  the injected store; a deep link still wins (`bootModel` runs only on the
  not-still-valid branch).
- **Scope fence:** `topology_vpa_pitch_linkage.json`, the existing studies, the
  kinematic loader, the play transport, colours and the grid's value columns
  are untouched.
- **Guards:** eight new mutation specs, two re-anchored, one replaced for the
  renamed nav guard; `DECLARED_GUARDS` pins moved.

## Tests

Tactical record: full `pytest -q` in its worktree with the merge candidate's
inputs bridged, **1862 passed, 1 skipped**, plus viewer 672/672, annotate
300/300, browser tier 43/43 (four by `--only` after fixes), witnesses
26/28 witnessed with the two misses re-witnessed by `--only`. Consistent with
the diff; benefit of the doubt given.

Pre-merge risky subset, on the merged review tree:
- `pytest -q tests/test_topology.py tests/test_kinematic.py
  tests/test_part_mesh_aliases.py tests/test_topology_prose_for_a_reader.py
  tests/test_topology_projection.py tests/test_architecture_inventory.py
  tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py
  tests/test_feature_identity.py tests/test_mutation_witnesses.py
  tests/test_claims_registry.py tests/test_tolerance_stack.py
  tests/test_provenance.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py` — **1181 passed** (151 s).
- `node apps/annotate/run_tests.cjs` — **300/300**, `[real]` checks ran.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` —
  **549/550, `[real]` tier NOT RUN**: the freshness guard correctly refused
  the main checkout's projection (built from trunk, not this tree). I did not
  arm it against a scratch rebuild because the verdict did not depend on it:
  B1 is shown by code reading plus a scratch Python fold, and no viewer test
  writes under `ids_from`. The rework's reviewer should arm it.
- Browser tier and mutation witnesses not run this round (REQUEST CHANGES).

No post-merge full suite: the verdict is REQUEST CHANGES, so nothing lands on
`integration` this round.

## Overlay

Added a **Recurring bugs** entry, "A record read under one stack key and
answered under another", for B1's class.

## Re-run 2026-11-08 — round 2: APPROVE

Round 1 was REQUEST CHANGES, 1 blocker (B1). The rework is `d0863681` + its
lesson `3f459ea9`, merged into `review/…` as `008b3007`; `integration` had not
moved (`git merge integration`: already up to date), no conflicts.

### B1 — closed

A shared id under `ids_from` now has **one** feature-identity key, the source
model's, on every write path:

- annotator: `identityWriteKey` → `AA.identityKey` in `cmdTake`, the armed
  click, the bind dialog and *not in set*; Accept, Reject and a correction
  already copy the key of the event they answer (v1's), so all paths agree;
- Python: `tolerance_stack.topology.identity_topology_id`, used by
  `scripts/propose_bindings.py`, so an agent proposing on v2 writes v1's key;
- the per-edge `own` rule is gone from `AA.identityReadThrough`, so the
  "binding `from` hides `to`" case cannot arise (v2 never gets a record of its
  own on a shared id).

I read each path against `feature_identity._answered_proposals` and the
supersedes check: every `supersedes`/`ratifies`/`rejects` now names an event
on the same key. The test I asked for exists and runs the real thing —
`tests/test_feature_identity.py::test_every_answer_on_a_shared_id_writes_events_the_fold_accepts`
loads the annotator's modules in node, runs accept, reject, take-a-different-face
and take-with-proposals against a read-through record, and folds each through
`build_projection`. It has a python-tier witness, and the author recorded it
failing under the mutation (`take_a_different_face wrote on ['v2']`).
Documented in `DAG_TOPOLOGY.md` "Models" and `ANNOTATION_SURFACE.md`.

### Nits — all three closed

- the `sweep.js` comment is back on `AA.sweepTopologyId`;
- v2 is the default by rule: the builder lists a model ahead of the model it
  reuses ids from (`in_model_order`). I traced the sort key: v2 ranks
  `(1, -1)`, v1 `(1, 0)`. The cycle guard holds. The test uses ids that sort
  the wrong way, so it can fail;
- the viewer's duplicate reader is gone. The projection carries `ids_from` at
  the top level. The annotator keeps its own (it is a separate page).

### Tests on the merged tree (`008b3007`)

Armed: `dispatch bridge-test-inputs C:/workspace/tolstack . --also node_modules`
(all 7 declared inputs + node_modules `linked`), then
`scripts/rebuild_projections.ps1` into the review worktree's own
`data/projections/`. All four provenance stamps read `sha12=008b3007c0ee
dirty=False behind_trunk=0`, so the `[real]` tiers judged this tree.

- **Full suite** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`:
  **1869 passed, 1 skipped, 2 deselected** (the pre-existing
  `test_fit_bound_features.py:424` skip). That includes `test_viewer_js_suite.py`
  with its `[real]` tier armed. This repo's conftest prints no contention
  header lines. Wall time was **2161 s**, recorded `OVER BUDGET by 26m01s`.
  It was contended: the witness gate below ran beside it the whole time, and
  the same tree ran in 553 s alone on the tactical branch. I appended the
  measurement to the open `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`
  rather than filing a twin.
- `node apps/annotate/run_tests.cjs`: **301/301**, `[real]` checks ran.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration`:
  **35/37 witnessed**, 37 of 50 reached in 29m44s, and 13 left to the sweep
  (budget). The two misses, `…synthetic-binding-moves-exactly-one-node…__389dc6f7`
  and `…spindle-coaxiality-pair-is-one-dot…__2a3ef74c`, were both "tier red
  before mutation". Re-run alone with `--only`, both were **witnessed** (3m13s,
  4m15s). So they are batch flakes, not decays. 389dc6f7 also missed in the
  tactical batch, so I filed
  `ISSUE_20261108_the_synthetic_binding_witness_is_red_before_mutation_inside_a_changed_since_batch_and_green_alone.md`.
- `node scripts/run_viewer_browser_tests.mjs`: **42/43**, 1623 s. `topology
  http` failed in the batch. Re-run alone (`--only "topology http"`) it passed
  209/209 on the same tree. My output filter kept only the check-level lines,
  so the failing sub-check from the batch is not recorded. Treat it as
  batch-only and unexplained rather than understood.
- Not run by me: the annotate `run_browser_check.mjs` mock pass. The
  exploratory click-around and the shots are the tactical agent's
  (lesson, "The shots"), which I read but did not repeat.
- Not polluting: projections were written into the review worktree's own
  gitignored `data/projections/`, and the shared inputs were bridged
  read-only.

### Verdict

**APPROVE (round 2), 0 blockers.** No should-fix is left unfixed.

### Landing: integration moved, one conflict, and integration was already red

My first `git fetch . review/…:integration` was refused because
`integration` had moved, and nine commits had landed:
`the_linkage_play_control_is_the_only_one_and_it_moves_everything`, round 2,
and an issue. Merging `integration` into `review/…` conflicted in
`scripts/guard_enumeration.mjs` `DECLARED_GUARDS`:

- integration had swapped fast guards one for one at 669, with a new digest,
  and taken annotate to 297;
- this branch had taken fast 669→672 and annotate 296→301.

Resolution: I kept both sides' comments and re-measured the pins on the
merged tree with `census()`. They came out fast **672** / `c6b7e89ec8b5` and
annotate **302** / `10971c663fa6`, which is exactly 669+3 and 297+5. I
grepped for marker lines and found none. Merge commit `f030bdac`.

After the merge I rebuilt the projections (stamps `sha12=f030bdaceba1
dirty=False`) and re-ran a risky subset:

- `pytest -q tests/test_mutation_witnesses.py tests/test_viewer_js_suite.py
  tests/test_feature_identity.py tests/test_topology.py tests/test_kinematic.py
  tests/test_architecture_inventory.py tests/test_js_vocabulary_is_generated.py`:
  **430 passed, 1 failed**;
- `node apps/annotate/run_tests.cjs`: **302/302**;
- `node apps/viewer/run_tests.cjs`: **672/672**.

The one failure, `test_every_anchor_resolves_to_exactly_one_place`, is
**integration's own**. Spec `…a-seek-in-the-pane-lands…__f697d046` anchors on
`Math.abs(state.kinematicPose - index) > 1e-6`, and that line is in **0**
places on the `integration` tip as well as on the merge. The play-control
rework (`665e4d34`) rewrote it. It is not this handoff's, and I did not fix
it in someone else's work: filed high as
`ISSUE_20261108_the_pane_seek_witness_anchor_rotted_on_integration_and_reddens_pytest.md`.
Landing this branch neither causes that red nor hides it.
