---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — a_seat_and_a_pattern_get_contact_suggestions_too

The branch `handoff/a_seat_and_a_pattern_get_contact_suggestions_too` (6 commits,
`0a4b22dd..bcaf5a0b`) was cut from integration `78d5cc45` and fast-forwarded onto
`review/…`. Integration did not move during the review. This is the first run of
this handoff: nothing earlier was on the review branch, and every lesson, issue
and spec in the diff arrives as `A` except the two re-anchored specs and one
re-anchored spec `M`.

## What was verified

**Code read.** I read the whole diff: `interface_contact.py`
(`node_pairing`, `pair_patterns`, `_size_classes`, `_lone_ball`, the `ball` arm
of `pair_faces`/`edge_candidates`), `build_contact_suggestions.py`
(`ball_side`, `node_ends`, `_node_end`, `node_row`, and `_measure`, which is
now shared by both row kinds), `sweep.js` (`contactRowsAt`, the
`edgeWithinOnePart` structural rule), `suggestions.js`, and the docs.

- `edgeWithinOnePart`'s new rule (a structural edge whose `part` is no
  assembly is within that part) matches `Topology.dimension_ends` in
  `topology.py`.
- `node_ends` uses `model_view.end_feature`, so a Take through a listed end
  writes the feature the node row's side describes.
- Nothing writes events. Fences held: there is no `apps/viewer/` change apart
  from the regenerated `vocab.gen.js`, and no change to `propose_bindings.py`
  or to any topology id.

**Tests on fixtures, one per new kind, each with a negative.**
- Seat: a block lifted 5 mm offers nothing.
- Pattern: flanges 10 mm apart offer nothing, and an off-ring hole is left out.
- Ball: a ball 0.5 mm off its race's centre offers nothing, and ends that do
  not say which is the ball are not compared.
- Declared occurrence: already done by the lug handoff, as the lesson says. On
  my scratch rebuild the four race press fits and the four inner-race ball
  joints went from `no_contact` (live, built from master) to `ok`.

**DoD re-derived on real data.** I built a scratch root at
`data/scratch/rv_seat_pattern_1123` from the main checkout's data. Every
projection was rebuilt from the merged tree with `--data-root`; all stamps are
at `bcaf5a0b` with `dirty: false`, and the contact leg took 1079 s. The probe
script is in the session scratchpad.
- v2 has 21 shared nodes: 19 `ok`, and the 2 named tan-link race seats
  `no_contact` ("the parts meet, but no pair of faces passes the margins").
  That agrees with the lesson's 10-empty table and with
  `V2_NODES_WITH_NOTHING`.
- **No edge row went from `ok` to anything else**, in either model, against
  the live projection.
- The served copy (`kinematic/annotate.json`) carries the node rows: 21 for
  v2, 34 for v1.
- I did not re-run the lesson's per-end bound/proposal/row/nothing tally. I
  confirmed the node-row half and the edge half of it.

**Jeff's log.** `data/inbox/feature-identity/` held 116 files before and after
this review, with an aggregate hash of `ec3ac3e2…dead7` both times. The main
checkout is clean.

**Shots read.** I read 04 (the seat, edge-on, lit at the flange) and 05 (the
pattern). Shot 05 is the source of the should-fix below.

## Tests

| tier | where | result |
|---|---|---|
| risky subset, pre-landing: `test_contact_suggestions`, `test_interface_contact`, `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`, `test_feature_identity`, `test_part_mesh_aliases`, `test_mutation_witnesses`, `test_architecture_inventory`, `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`, `test_claims_registry`, `test_model_view` | review worktree | 505 passed, 2 skipped (the two `[real]` node checks: the live projection predates node rows) |
| the same two `[real]` checks against the scratch projection, copied into the worktree's `data/` and then removed | review worktree | `test_contact_suggestions.py` 25/25 |
| default tier, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs` | review worktree | **2619 passed, 1 failed, 3 skipped, 4 deselected in 497 s**. The failure is the documented worktree red `test_viewer_js_suite.py`. Recorded, inside budget. This repo's conftest prints no contention header lines. |
| viewer fast tier `--repo <scratch>` | merged tree | 628/628, projection paired at `bcaf5a0b` |
| annotate fast tier | merged tree | 335/335 |
| whole browser tier `--repo <scratch>` | merged tree | 46/49. The 3 reds are below. The runner wrote its own ledger row at 17:23:53Z (2459 s, over budget; that budget is already tracked by `ISSUE_20261106_…_ran_51_minutes…`). |
| witness gate `--changed-since 78d5cc45 --budget-min 10` | merged tree | **15/15 witnessed, 15/18 reached in 9m35s, 3 left to the sweep (budget)**. The tactical's `--only` run of the branch's own six guards was 12/12, ledger row 16:06:27Z. |

**The three browser reds are pre-existing and data-bound, not this diff:**
- `a suggestion names its face …`, 3/5, with the same two sub-checks and the
  same `MISSING` lines on an integration `78d5cc45` export and on the merge,
  run `--only` against one scratch root. Filed as
  `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md`.
- `a pattern is bound as its like faces …` was 6/11 in the whole tier and
  8/11 alone, the same on the baseline and the merge (the same three
  sub-checks). That is the known suite plus the deferred whole-tier flake
  (`ISSUE_20261120_the_pattern_suites_parts_filter_count_is_red_in_the_whole_browser_tier_and_green_alone.md`).
- `annotate model in the scene` stops after 9/9 on `w.__lastAnchors`
  undefined, exactly as
  `ISSUE_20261123_the_scene_suite_gets_no_anchors_message_once_v2_takes_ten_values.md`
  describes. The diff does not touch `app.js`. I did not pair this one.

## The mandatory stack checks

This is not a stack, a parse event or a topology edit. Checks 1–7 (traced
sources, signs, LMC/MMC, RSS, nominal in band, quantised hardware, the ratio)
do not apply: no element, value or `source_ref` changed. The one
value-adjacent claim is that a suggestion is never a value. It holds: rows are
evidence and colour only, and nothing writes an event.

## Findings

**Should-fix (filed, not blocking):**
1. `tolerance_stack/interface_contact.py` `pair_patterns` / `_size_classes`
   group pattern holes at the like-hole rule's `radius_fraction` 1e-3. The
   fitted Ø17.5 counterbores scatter by about 1.4e-3, so they break up into
   one-hole size classes. The plate side of the piston-body pattern therefore
   lists "face 857" and "face 883" as pattern rows with a Take (shot 05), and
   v2's mount clocking node carries 10 candidates. Ranking keeps the real
   pattern first, but a Take on those rows binds the pattern feature to one
   counterbore face. Filed:
   `docs/issues/ISSUE_20261123_a_fastener_pattern_node_offers_single_counterbore_faces_as_pattern_rows_with_a_take.md`.

**Nits:**
- `ISSUE_20261122_two_parts_that_are_solids_of_one_mesh_at_one_place_are_never_compared_for_contact.md`
  (open, on integration) is the question deliverable 4 answers, and the lesson
  does not name it. I appended a dated addendum saying what was done; triage
  can disposition it.
- The lesson's "No end that had a row lost it" is right for the edge half. The
  live projection has no node rows, so that half is vacuous by construction.

The lesson's arithmetic checks out where I re-derived it: 21 shared nodes, 2
empty seats, the 4 ball joints `ok`, 116 log files, and the test counts match
the ledger.

## Fixed inline

Nothing in the code. Review artifacts only: the overlay (a risky-subset row for
the contact engine and a recurring-bug entry for set offers fragmented by fit
noise), the new issue, and the addendum.

## Verdict

**APPROVE.** It lands in `integration` by fast-forward.
