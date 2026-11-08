---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
reviewer: agent
date: 2026-11-08
verdict: REQUEST CHANGES
blockers: 1
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
