# Lessons — a_feature_is_bound_once_to_a_set_of_faces (2026-11-13)

**`fits.json` keeps schema `/v0`.** Every field `C:\workspace\linkage` reads
(`event_id`, `mesh`, `local.surface`, `occurrences[].geometry`,
`occurrences[].instance_path`) keeps its place and meaning. A row is now a
bound **feature**. New fields sit beside the old ones: `feature`, `event_ids`
and `geometry_keys`; `geometry_key` is the set's first face. `stack_key` and
`direction` stay only on a row whose feature stands on one old edge-end
event. Linkage was not touched.

## The real log, folded read-only

Summary line (`FeatureIdentityProjection.summary_line`, from
`data/inbox/feature-identity/` on 2026-11-13, nothing written there):

> 9 feature(s) bound, 0 holding a set, 1 disagreement(s), 0 orphan(s); 78 old event(s) read through

All 53 open proposals fold through to 28 features and stay open.

### Every one of the 15 bindings

| seq | old key (model / edge / end) | face | feature | faces the feature holds | state |
|---|---|---|---|---|---|
| 56 | v1 / pitch_link_length / to | 140 | pitch_link@pitch_link_upper_sphere_centre | 140 | bound |
| 57 | v1 / tan_link_length / from | 64 | tan_link_212956_005@tan_link_lower_sphere_centre | 64 | bound |
| 58 | v1 / tan_link_length / to | 0 | tan_link_212956_005@tan_link_upper_sphere_centre | 0 | bound |
| 59 | v1 / pitch_link_length / from | 104 | pitch_link@pitch_link_lower_sphere_centre | 104 | bound |
| 63 | v1 / pitch_plate_slide_bushings_to_piston_body / to | 166 | gas_spring_piston_214700_002@gas_spring_piston_body_od | 166 | bound |
| 64 | v1 / pitch_plate_slide_bushings_to_piston_body / from | 53 | gas_spring_mount_213668_002@gas_spring_mount_bushing_bore | 53 | bound |
| 65 | v1 / hub_to_pitch_plate_spindle_coaxiality / from | 3460 | hub@hub_spindle_bore_axis | 3460, 144 | **disagreement** |
| 67 | v1 / hub_to_pitch_plate_spindle_coaxiality / to | 487 | pitch_plate_215177_001@pitch_plate_spindle_bore_axis | 487 | bound |
| 68 | v1 / pitch_link_length / to | 140 | pitch_link@pitch_link_upper_sphere_centre | 140 | bound (repeats 56) |
| 69 | v1 / pitch_link_length / from | 104 | pitch_link@pitch_link_lower_sphere_centre | 104 | bound (repeats 59) |
| 70 | v1 / tan_link_length / from | 64 | tan_link_212956_005@tan_link_lower_sphere_centre | 64 | bound (repeats 57) |
| 71 | v1 / tan_link_length / to | 0 | tan_link_212956_005@tan_link_upper_sphere_centre | 0 | bound (repeats 58) |
| 76 | v1 / hub_spindle_to_tan_link_mount_face / to | 526 | hub@tan_link_mount_hub_face | 526 | bound |
| 77 | v2 / hub_boss_in_tan_link_mount_pilot / from | 144 | hub@hub_spindle_bore_axis | 3460, 144 | **disagreement** |
| 78 | v1 / hub_blade_axis_offset / to | 2564 | hub@hub_blade1_root_bearing_bore | 2564 | bound |

### The one disagreement Jeff must settle

**The hub's locating boss (`hub@hub_spindle_bore_axis`).** Two bindings land
on it:

- 2026-11-06, v1's spindle coaxiality start: **face 3460**, a Ø95 cylinder
  (r 47.5; 3461 is its other half).
- 2026-11-12, v2's pilot fit start: **face 144**, a Ø215.9 cylinder
  (r 107.95; 145 is its other half).

The two are coaxial but are not one surface. One is the bore and one is the
boss OD. The node is an axis, and either face realises it. Which one is the
datum is Jeff's call. Until he presses **Keep** the feature reads suggested,
and the fitter leaves it unresolved (reason `disagreement`).

## The fitted nominals, before and after

"Before" is integration's `fit_bound_features.py`, run on the same log into
scratch. The main checkout's `fits.json` was an empty build (0 bindings), so
it was no baseline. "After" is this tree's fitter, also run into scratch.

| old binding (edge, end, face) | feature | after | max change |
|---|---|---|---|
| v2 hub_boss_in_tan_link_mount_pilot from 144 | hub@hub_spindle_bore_axis | unresolved: disagreement | -- |
| hub_blade_axis_offset to 2564 | hub@hub_blade1_root_bearing_bore | cylindrical, [2564] | 0 |
| hub_spindle_to_tan_link_mount_face to 526 | hub@tan_link_mount_hub_face | planar, [526] | 0 |
| hub_to_pitch_plate_spindle_coaxiality from 3460 | hub@hub_spindle_bore_axis | unresolved: disagreement | -- |
| hub_to_pitch_plate_spindle_coaxiality to 487 | pitch_plate@pitch_plate_spindle_bore_axis | cylindrical, [487] | 0 |
| pitch_link_length to 140 | pitch_link@upper_sphere_centre | spherical, [140] | 0 |
| pitch_link_length from 104 | pitch_link@lower_sphere_centre | spherical, [104] | 0 |
| pitch_plate_slide_bushings_to_piston_body to 166 | piston@body_od | cylindrical, [166] | 0 |
| pitch_plate_slide_bushings_to_piston_body from 53 | gas_spring_mount@bushing_bore | cylindrical, [53] | 0 |
| tan_link_length from 64 | tan_link@lower_sphere_centre | spherical, [64] | 0 |
| tan_link_length to 0 | tan_link@upper_sphere_centre | spherical, [0] | 0 |

- **Totals.** Before: 11 bindings, 11 fitted. After: 10 features, 9 fitted, 1
  unresolved (the disagreement).
- **Unchanged.** Nine nominals are identical. Linkage's four sphere centres
  are among them.
- **Not fitted.** The two hub faces now in disagreement are not fitted. They
  were fitted before as two separate rows on one feature, which is the
  conflict this handoff exists to stop.
- **Not written to the main checkout.** The fit was not written to the main
  checkout's projections. That writes linkage's input from an unmerged
  branch; it is the rebuild rail's job after the merge.
- **The kinematic study was not rebuilt here.** `build_kinematic_projection.py`
  does not read the identity stream (`grep` finds no `feature_identity` or
  `fits.json` in it), so this change cannot move it. The review's
  rebuild-first step builds it.
- **One fit through a set, on real geometry.** `test_fit_bound_features.py`
  binds both halves of the pitch plate's spindle bore (439 and 465, one
  surface, not touching). It now gets one row and one cylinder, at r 16.5,
  along assembly Z.

## The DoD run (scratch, v2, 3840×2160)

`node tests/debug_feature_bound_once_20261113.mjs --keep`. It uses the
previous handoff's mounts on a private port, and `/tolstack/data/` is a
scratch copy:

- the viewer projections;
- the topology projection rebuilt from this tree (features carry `identity`);
- the served log folded from a copy of the real log.

The pane's folder grant is its real FSA path over a fake handle backed by
the scratch copy. The scratch copy (`data/scratch/feature_bound_once_20261113`)
was deleted afterwards. Shots are in
`docs/sessions/lessons/shots/a_feature_is_bound_once_to_a_set_of_faces/`.

| shot | what it shows |
|---|---|
| 01 | The hub boss reads **"2 faces disagree · face 3460 Keep · face 144 Keep"**, status suggested. The disagreement is the real log's own: two old-shape events, so none was created. |
| 02 | **Keep** on 144: "bound · face 144 of 214373-002". The pane's end view has it bound at all four v2 ends at that node: the pilot fit and three hub dimensions. v1 has four more, including the coaxiality start. The handoff said "five ends"; v2 now has four edges at the node, and v1 adds the fifth. |
| 03 | **Correct**, then a click on 144: its split half **145 is swept in**, with no question. The body reads "bound · 2 faces", with Remove on each face, and every end carries both faces. |
| 04 | Gas-spring mount bushing bore, **Correct**, a click on seat face 53. The bar at the top of the pane reads **"4 like faces on this surface · Take all 4 · Just this one"**. 610 (53's other half) is swept; 109 and 628 (the other seat) are offered. |
| 05 | **Take all 4**: "bound · 4 faces of 213668-002". Both seats are lit in the scene. It was written as one v1 event superseding the old edge-end binding (`supersedes` across shapes). |
| 06 | A reload with the pane closed: both features read bound. |

Python folds the scratch log afterwards to "10 feature(s) bound, 2 holding a
set, 0 disagreement(s), 0 orphan(s)".

**Time per write.** Click to body took 13–22 s through the probe's
HTTP-backed handle, the same order as the 11-12 lesson's 8–22 s. Hub
classification (3473 faces) is about 1.2 s in node.

**Exploratory click-around: partial.** It covered the probe's flows, hovering
a set's face lines, and reloads. Not done: a full walk of every feature, and
filmstrips. No motion changed.

## Decisions not in the handoff

- **v1 events alone decide a feature once one is written.** As soon as any v1
  `bound` or `retracted` names a feature, the old bindings read through to it
  are `replaced` and stay in history. Unbinding a v1 binding does not bring
  the old ones back. Keep, Correct and Remove all write v1.
- **One cross-shape pointer.** A v1 event may answer, supersede or retract a
  v0 event, but only one read through to the same feature (`_same_thing`,
  `_answer_names_its_proposal`). Without it, unbinding or correcting an
  inherited binding would need an old-shape write.
- **The shared-surface rule applies only to old events.** Two standing v1
  bindings with different face sets disagree, with no surface test, so the
  browser never needs mesh fits to fold. The surface test needs meshes, so
  Python computes the pairs and the served log carries them (`same_surface`).
  The browser works out the read-through itself from the topology
  projection's `model.features[].identity`.
- **`model_view` keys features.** `feature_identity_topology_id` is the
  feature-level twin of `identity_topology_id`: a node v2 shares with v1, on
  a part v1 also puts there, is keyed under v1.
- **Flip** on a feature-keyed binding becomes two events: bind on the other
  end's feature, then retract here.
- **`owner_not_in_set` stays edge-keyed (v0).** It names a dimension, not an
  end. It is carried on its edge's row in the end view.
- **The group offer sits at the top of the pane.** Embedded, the pane's iframe
  runs below the page fold, so a bottom bar (where the toast is) was
  invisible. While up, it covers the pane's one-line instruction.

## Things that cost time

- **The pane's publish path re-folded without the topologies.** After every
  write it adopted a fold of the re-read log (`publishIdentity`) but left
  `identityEvents` stale, so a Keep wrote and nothing changed on screen. Every
  place that reads the log must set `identityEvents` and fold with
  `foldOpts()`.
- **`AA.faceVertexRanges` returns `{start, count}`, not pairs.** My
  `AA.facesTouch` read `r[0]`/`r[1]`, touched nothing, and every split half
  came back *offered*. The hub re-pick then waited, for 480 s, on an offer
  the probe never answered. Python and node agreed once fixed: hub 144→145
  swept; mount 53→610 swept, 109/628 offered; plate 487/521 offered. A fast
  check now pins sweep vs offer (witnessed).
- **A re-pick of the face already bound was refused** ("already bound").
  It now binds when the face's surface brings faces the set lacks.
- **Two classifications of one 3473-face part ran at once** (arm, then
  click). They are now de-duplicated (`faceClassesPending`).
- **`git checkout <file>` to undo a hand mutation also discards your
  uncommitted edits in that file.** I lost and restored (from a backup) the
  `FACE_VERDICTS` change. Back the file up, or commit first.
- **The viewer fast tier refuses inside a witness shadow tree** when the main
  checkout's projections predate the tree ("projection NOT paired"). The
  `fast__the-page-reads-the-log…` witness therefore read NOT WITNESSED
  ("red before the mutation"). I applied its mutation by hand to the
  worktree's fast tier (no `[real]`), and exactly that guard went red.
- **`as_dict` reported `features: []` for a fold given no models.** JS read an
  empty list as "has features" and called the end view where the fold module
  isn't loaded. The projection now reports features only when it had models
  (`featured`).

## What still stands in the way of "bind them all now"

**One sentence for Jeff:** bind them all now, but first press **Keep** on the
hub's locating boss (face 3460, the Ø95 bore, or face 144, the Ø215.9 boss),
because it is the one place the old picks disagree. Nothing else is in the
way once this branch merges and the projections are rebuilt.

Filed: `docs/issues/ISSUE_20261113_a_hole_pattern_is_a_feature_of_n_like_faces_and_has_no_fit.md`
(Jeff's third case, the pattern fit, fenced out by the handoff).

## Tests run

- **Default pytest tier.** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`,
  run in the worktree, single process: **4 failed, 1973 passed, 1 skipped**
  in 469 s. The time is in the ledger, inside budget. After that run I fixed
  two of the failures, and a rerun of their modules is green:
  - the guard census was not re-pinned for the new annotate check
    (`DECLARED_GUARDS` annotate 315 / `d77c397073b0`);
  - a leftover `tmp/mutation-witness-*` from my own witness runs broke one
    shadow-lock test.

  Two failures remain, and neither comes from this branch:
  - `tests/test_viewer_js_suite.py`, the documented worktree red (no
    projection in the worktree's `data/`);
  - `test_two_different_repo_roots_both_still_succeed`, which is MAX_PATH on
    older handoffs' shot names. It is already filed as
    `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`,
    and it passed in my first full run.

  The skip is `test_fit_bound_features.py`'s uninstalled re-extraction.
- **Fast node tiers.** `node apps/viewer/run_tests.cjs`: 568/568, `[real]`
  skipped (projections predate this tree). `node apps/annotate/run_tests.cjs`:
  315/315.
- **Witness `--only`.**
  - WITNESSED: the new sweep/offer guard, plus three re-pointed annotate
    anchors (session correction, accept supersedes, pick rejects first).
  - The re-pointed `fast__the-page-reads-the-log…` came back NOT WITNESSED,
    because the stale projection made the shadow tier red before mutation.
    Applied by hand to the worktree's fast tier, it turns exactly its guard
    red.
  - The re-pointed browser anchor (`a click binds face 1 at the end's own
    direction`) was not run. It needs the browser tier against projections
    built from this tree.
- **Browser runner `--only`: none run.** No browser suite was added or
  changed.

**The review owns these:** the whole browser tier and the witness
`--changed-since` gate. **Rebuild the projections first.** The topology
projection must carry `model.features[].identity`; without it the browser
keys v2-only events under v2, and the hub boss's two models stop meeting.
