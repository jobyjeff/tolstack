---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
reviewer: agent
date: 2026-11-13
verdict: APPROVE (round 3)
blockers: 0
---

# Review — a_feature_is_bound_once_to_a_set_of_faces (round 1)

Branch reviewed: `handoff/a_feature_is_bound_once_to_a_set_of_faces` at
`57bc82a8` (8 commits over `integration` `46415114`). Integration had not
moved since the branch was cut, so the merge into `review/…` was clean. It
was **not** landed. After the subset I reset the review branch to
`integration`, so this branch carries only this report, one issue and the
overlay entry.

## Blocker

**B1. Bind mode still writes edge-end (v0) events, and one correction there
makes the log unfoldable.** Location: `apps/annotate/app.js`,
`buildBindForm` (the `btn.onclick` that calls `AA.buildBoundEvent` with
`stackKey`/`direction`/`supersedes: bind.target.event_id`) and
`buildBindingsBlock`'s **Flip direction** button (the `flip.onclick` that
calls `AA.buildCorrectionEvent(row.event, { direction: other })`).

Bind mode is live: a goto out of sweep lands there (`leaveSweepForBind`).
Its `bind.record` comes through `mergedIdentityProjection` → `VA.endView`,
and `atEnd` stamps `feature_key` on every binding it hands out. Three
consequences:

1. **Replace the binding.** The form writes a **v0** `bound` whose
   `supersedes` names the target. The target is a v1 binding, or a v0 one on
   another edge read through to the same feature. Either way
   `feature_identity._same_thing` refuses it. Measured with a two-event log
   (v1 bound on `pitch_link@pitch_link_upper_sphere_centre`, then a v0
   correction of `pitch_link_length` `to` superseding it):
   `build_projection` raises `event 'n2' supersedes 'n1', which is on a
   different stack key`. `VA.foldIdentityEvents` never refuses, so the page
   carries on. Meanwhile `build_feature_identity_projection.py` (step 5 of
   `rebuild_projections.ps1`), `fit_bound_features.py` and
   `propose_bindings.py` all stop on the real log. This is the 2026-11-08
   class in the overlay ("A record read under one stack key and answered
   under another"), and it is the same shape: one click, append-only log.
2. **Flip direction** is now always a no-op. With a feature-keyed `earlier`,
   `buildCorrectionEvent` takes its v1 branch. It keeps
   `earlier.feature_key` and drops `direction`, so it writes a `bound` on the
   **same** feature with the same faces, superseding itself. The toast
   still says "Moved the face to …". Probed in node through
   `binding_state.js`: the result is `{feature_key: <same>, geometry_keys:
   [face 140], supersedes: "n1"}`, with no direction and no other feature. `cmdFlip` was
   converted to two events (bind there, retract here); this second flip site
   was not ("a fix applied at one of N sites").
3. **A plain bind-mode bind** on a feature that already has a v1 binding
   writes a v0 event. The fold puts it straight into `replaced`, so the
   click silently does nothing. That matters immediately: the first thing
   Jeff is asked to do is press **Keep** on the hub boss, which writes v1.

The handoff's deliverable 1 says every reader asks for a feature's binding.
The lesson says "Keep, Correct and Remove all write v1", and
`binding_state.js`'s own comment says v0 is written "for an
owner_not_in_set finding alone". Bind mode contradicts all three.

**Fix (author's):** make bind mode's form and Flip write feature-keyed events,
the way `cmdFlip` / `bindArmedFaces` do (or retire those controls). Add a
test that builds each bind-mode event against a record carrying a v1 binding
and folds it through the Python loader. `tests/test_identity_fold_is_paired.py`
is the natural home, and a witness belongs with it.

## Should-fix (for the rework, all in scope)

- **S1. Lesson: "it is the rebuild rail's job after the merge" (fits.json).**
  `scripts/rebuild_projections.ps1` does not run `fit_bound_features.py`; no
  rail rebuilds `fits.json`. Say who runs the fit after the batch merge, or
  correct the sentence.
- **S2. The lesson's "Exploratory click-around: partial"** did not reach bind
  mode. B1 is exactly what a click there would have shown. The round-2
  click-around should include a goto out of sweep, a bind, a replace and a
  Flip on a feature with a v1 binding.

## Filed (non-blocking)

- `docs/issues/ISSUE_20261113_design_a_disagreements_keep_rows_name_each_face_by_its_number_alone.md`
  (`priority: med`, `area: design`). The Keep rows say `face 3460` /
  `face 144` with no shape or size, and that is the choice Jeff is asked to
  make.
- Not filed yet, for round 2: an issue with `needs: jeff` asking him to press
  Keep on the hub boss. It only becomes actionable once this lands, and the
  Keep path should be re-checked after the B1 rework first.

## What I verified

- **The fold, on the real log, from the merged tree** (scratch data root
  `data/scratch/rv_fbo`, the real inbox copied, nothing written to it). The
  builder printed `9 feature(s) bound, 0 holding a set, 1 disagreement(s),
  0 orphan(s); 78 old event(s) read through`, the lesson's line exactly. The
  15-binding table is consistent with it: 4 repeats, 11 distinct bindings
  over 10 features, one of them the hub boss disagreement.
- **The disagreement is real.** 3460 is r 47.5 and 144 is r 107.95; the radius
  rule refuses at a 5e-5 fraction. Naming it for Jeff rather than choosing
  is what the handoff asked for.
- **The shared-surface thresholds** (`SAME_SURFACE_TOLERANCES`) each carry a
  measured basis. They are tested at 0.9×/1.1× of each limit and against the
  named real near-misses (111.997/112.013, the 5.5 bolt circle). They are
  paired to `AA.SAME_SURFACE` by value. `face_geometry.js`'s `sameSurface`
  matches Python statement for statement. The one divergence is a
  `radius > 0` guard Python lacks, which is harmless.
- **The three collision outcomes, Keep, unbind, remove-a-face, the cross-shape
  accept and the "accept must bind the proposed face" refusal** are pinned in
  `tests/test_feature_bound_once.py`. Both fit-through-a-set fixtures (two
  coaxial 120° seats; three coplanar feet) are built by hand.
- **The proposer and the fitter key on features.** `fits.json` stays `/v0`,
  and every field linkage reads keeps its place.
- **Schema window:** none of the tactical's v1 writes went to the real inbox,
  and every v1 writer is in this diff. Trunk's fold would refuse v1, but
  nothing on trunk writes it, so there is no window to file.
- **New vocabularies** (`FEATURE_OUTCOMES`, `FEATURE_STATES`, `ORPHAN_REASONS`)
  have registry rows and are in `vocab.gen.js`.
- **The tactical full-suite record** is present: worktree, single-process,
  4 failed / 1973 passed / 1 skipped, two of the failures since fixed and two
  explained. The benefit of the doubt holds.
- The tolerance-stack mandatory checks (1–7) **do not apply**: no stack
  element, band or `source_ref` changed.

### Pre-merge risky subset (named)

`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
over `test_feature_bound_once`, `test_identity_fold_is_paired`,
`test_fit_bound_features`, `test_propose_bindings`, `test_model_view`,
`test_feature_identity`, `test_feature_geometry`, `test_topology`,
`test_topology_projection`, `test_contact_suggestions`,
`test_architecture_inventory`, `test_js_vocabulary_is_generated`,
`test_js_python_vocabulary`, `test_mutation_witnesses`,
`test_part_mesh_aliases`, `test_annotate_js_suite` and `test_claims_registry`,
run on the merged review tree. Result: **593 passed, 1 skipped** in 299 s.
The skip is `test_fit_bound_features.py`'s uninstalled re-extraction. Green
is the point: no tier sees B1.

### Not run (REQUEST CHANGES, so no merge)

The post-merge full suite, the whole browser tier and the witness
`--changed-since` gate are owed by the round that lands this.

## For the round-2 reviewer

- The scratch root recipe worked: copy inbox, meshes and the non-viewer
  projections, copy `docs/`, junction `venv-win` and `node_modules`, then run
  the builders from the review worktree with `--data-root`. The feature
  identity step prints the summary line.
- Re-run the B1 probe: fold a v1 binding plus each bind-mode event through
  the Python `build_projection`.

## Re-run 2026-11-13 — round 2

Round 1 was REQUEST CHANGES with one blocker (B1, bind mode wrote v0
events). This round reviews `9dbce3b3` + `be1ad041` on top of `57bc82a8`.
Integration had not moved (`46415114`), so the merge was clean. It was
**not** landed: as in round 1, I reset the review branch afterwards.

### B1 — closed

- Every bind-mode write (Bind, Replace, the bindings block's Flip) and
  `cmdFlip` now goes through `AA.planFeatureWrite`.
- A target on the same feature is superseded. A target on another feature
  is taken back there with a v1 `retracted`, which is the one cross-shape
  pointer the fold accepts.
- `test_every_bind_mode_write_folds_in_python` builds all four writes with
  the annotator's own planner, against a record holding a v1 binding and an
  old one. It folds each through `build_projection` and checks the outcome.
  Its witness reproduces B1 exactly (supersede whatever the target), and the
  author reports it WITNESSED.
- The extra fix is right: the pane now repaints on write, and Flip
  re-checks that its binding still stands.
- S1 (the lesson's fits.json sentence) is corrected, and the gap is filed as
  `ISSUE_20261113_no_rail_rebuilds_fits_json_…`. S2 (the bind-mode
  click-around) is done in shots 07–09; shot 09 reads "hub spindle bore axis
  · face 2565" after the flip.

### Blocker (round 2)

**B2. The merged tree reddens five browser suites, all on the annotator
surfaces this handoff changed, and none of them was run before hand-back.**
The lesson says "No browser suite was added or changed". That is true of the
suite files, but the behaviour these suites pin did change: the armed click,
Take and the bind form all write a different event now. The previous
landing recorded the tier at 44/44 on `integration` (`b24cc81a`, same day).
The merged tree, built into a scratch root with every projection paired at
`bdf8c746`, gives **39/44**:

- `annotate armed pick`: **aborted** after 15 sub-checks, 4 failed.
  - "a click binds face 1 at the end's own direction" still asserts the v0
    shape (`"direction":"from"` plus the edge id).
  - "the pick disarms" fails too. Then `.an__sweep-back button` is never
    visible, so the suite times out. That does not look like only a stale
    assertion. Check whether the click now waits on a group offer.
  - This is also the witness the tactical re-pointed and left for the
    review ("not run").
- `annotate rail suggestion` 15/19:
  - the reject-then-bind of a different face;
  - "…the end reads bound to the face picked";
  - "Take writes one `bound` event … and the row reads bound · face N";
  - `[real]` "the topology-level rail shows a suggestion on every edge with
    an open proposal".
- `annotate rail holds still` 9/17: every `[real]` check after a Take. The
  DIAG line reads `no faces layer after the Take: {"slots":0}`, so the
  faces layer does not follow the partner end any more.
- `annotate bind form` 13/15:
  - "after one Bind the form shows that end as taken … the end it was written
    at is the one chosen". The tactical re-pointed this witness's anchor in
    round 2 and did not run it.
  - "picking the second face draws the leader …".
- `the model drawn alone and led` 21/23:
  - `[real]` Escape with a pick armed cancels the pick;
  - `[real]` a hovered gap edge overlays its bound face.

For each sub-check, decide whether the assertion is stale (it pins v0) or
the behaviour regressed. Update the stale ones so they still check the right
feature, and fix the regressions. Then run each suite with
`node scripts/run_viewer_browser_tests.mjs --only "<suite>"` against
projections built from the branch. That is the CLAUDE.md table's tactical
row, and it covers a suite whose behaviour changed, not only one whose file
did. Run the two re-pointed browser witnesses with `--only` as well.

### What passed on the merged tree (round 2)

- **Risky subset:** `test_identity_fold_is_paired`, `test_feature_bound_once`,
  `test_mutation_witnesses`, `test_annotate_js_suite` and
  `test_feature_identity`: **145 passed**.
  `node apps/annotate/run_tests.cjs`: **315/315**.
- **Projections** were built from the merged tree into
  `data/scratch/rv_fbo`. Feature-identity summary: `9 feature(s) bound, 0
  holding a set, 1 disagreement(s), 0 orphan(s); 78 old event(s) read
  through`, unchanged. The fit gives `9 fitted, 1 unresolved` (reason
  `disagreement`), matching the lesson. Kinematic studies: 1 of 1 built.
- **Viewer fast tier with `[real]`:**
  `node apps/viewer/run_tests.cjs --repo <scratch>` gives **691/691**, with
  every projection paired at `bdf8c746`.
- **Full pytest, post-merge, review worktree:**
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gives **1 failed, 1977 passed, 1 skipped** in 426 s (recorded, inside
  budget).
  - The failure is `test_viewer_js_suite`, the documented worktree red. Its
    tier is the 691/691 run above.
  - This repo's conftest prints no contention header lines.
  - `data/` in the main checkout is unchanged: the run wrote only to pytest
    tmp dirs and the scratch root.
- **Browser tier:** 1795 s, recorded by the runner itself, inside budget.
- **Witness `--changed-since` gate:** not run. It is owed by the landing
  round.

### Filed this round

`docs/issues/ISSUE_20261113_the_hub_locating_boss_has_two_bound_faces_and_needs_jeffs_keep.md`
(`needs: jeff`). It asks for the Keep the lesson names. It rides this branch
and reaches the board when the work lands.

## Re-run 2026-11-14 — round 3

Round 2 was REQUEST CHANGES with one blocker (B2: five annotate browser
suites red on the merged tree). This round reviews `1ab32420`, `c19cd947` and
`8aff1b82` on top of `be1ad041`. Integration had not moved (`46415114`), so
the merge into `review/…` (`bfc81e1b`) was clean.

### B2 — closed

The lesson sorts each red sub-check into "stale assertion", "behaviour,
correct" or "regression". I agree with each call:

- **Armed pick and rail suggestion.** The demo triangle's two coplanar faces
  do not touch, so the click now offers them as a group (round 1's design)
  and writes nothing until the offer is answered. That is why "the pick
  disarms" failed: it was not a regression. The suites now answer "Just this
  one" and assert the feature-keyed event: node `a` on `demo_triangle`, faces
  `[1]`, no `direction`. A new check pins the offer itself. Its witness is
  WITNESSED on the merged tree (below).
- **The rail chip counted leftover proposals (real regression, fixed).**
  - Since round 1 a proposal follows its feature. So a feature bound through
    one edge still lists proposals that other edges' ends read through to it,
    and bind mode's chip counted them.
  - `AA.proposalChip` now counts only proposals at an end nothing is bound
    at. That is the rule `ANNOTATION_SURFACE.md` already stated for the
    sweep rail; the doc is extended to bind mode.
  - The fix has a fast check, witnessed.
  - The `[real]` oracle derives its expected set through features
    independently. It re-implements the end-to-feature rule rather than
    calling `VA.endFeatureKey`, which is what an oracle should do.
- **Bind form (real regression in the mock, fixed).**
  - The mock's traced edge had no feature at either end, and the in-memory
    transport has no log, so a v1 write never reached an end.
  - Fixture nodes `a`/`b` now name the demo triangle.
  - `placeAtFeatureEnds` puts a no-log session's feature-keyed write on every
    end that reads the feature.
  - I checked the claim that production never reaches this path.
    `sessionIdentityProjection` refolds `state.identityEvents` whenever a log
    was read (`app.js:5276-5281`), and both real transports read one. Only
    `?mock=1` and the tiers fall through to it.
- **Rail holds still.** In `[real]` mode the test transport now reads the
  served log, as the FSA and HTTP transports do, so its `unaccept` reaches the
  pane by the production route.
- **Model drawn alone: Escape-with-pick armed (a real gap, fixed).**
  - The hub boss's disagreement body offered only Keep, so there was nothing
    to arm when neither face is right. It now also offers Pick a face (fast
    check, witnessed).
  - Round-3 shot 01 reads "2 faces disagree · face 3460 Keep · face 144 Keep
    · Pick a face".
- **Model drawn alone: gap hover (data, correct).**
  - The pilot gap's hub end is the disagreement, so nothing is bound there
    until Keep. The overlay is now required exactly when the projection says
    an end is bound.
  - The `catch { pilotBound = true; }` fallback errs strict: an unreadable
    projection demands the overlay.

### Merge tiers on the merged tree (`bfc81e1b`)

Scratch root `data/scratch/rv_fbo3`:
- Inputs: inbox, meshes and non-viewer projections copied from the main
  checkout; docs from the merged tree; `venv-win` and `node_modules`
  junctioned.
- All seven builders and `generate_js_vocabulary.py` ran from the merged tree
  with `--data-root`. The generator left no diff.

| Tier | Command | Result |
|---|---|---|
| feature-identity fold | `build_feature_identity_projection.py --data-root …` | `9 feature(s) bound, 0 holding a set, 1 disagreement(s), 0 orphan(s); 78 old event(s) read through`. Unchanged. |
| fits | `fit_bound_features.py --data-root …` | 1 unresolved (reason `disagreement`), as the lesson says |
| kinematic | `build_kinematic_projection.py --data-root …` | 1 of 1 built |
| annotate fast | `node apps/annotate/run_tests.cjs` | **316/316** |
| viewer fast with `[real]` | `node apps/viewer/run_tests.cjs --repo <scratch>` | **692/692** |
| default pytest | `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider` | **1 failed, 1977 passed, 1 skipped**, 459 s. The one failure is `test_viewer_js_suite_is_green` (line 123, the worktree's skipped node-fs tier), whose tier is the 692/692 above. |
| browser tier | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **44/44**, 1142 checks, 1712 s, slot wait 0 s. The runner records its own ledger row. |
| witness gate | `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration` | 61 selected, 50 reached in 30m38s, 11 left to the sweep (budget). **49/50 WITNESSED.** The one exception is explained below. |

**The one NOT WITNESSED is the known flake, re-checked with `--only` and
WITNESSED.**
- The entry: `browser__real-a-bound-feature-s-body-is-one-line-naming-its-face__a2a7fb36`.
  It is an integration spec this diff did not touch; the hunks in
  `views/nav.js` selected it.
- It read "the tier was red before the mutation".
- The red was one sub-check before the guard: "[real] ...and leaving it takes
  the light down". That is in the "3D pane follows the selection" suite, which
  `ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md`
  has tracked since 2026-11-05 for exactly this shape (red under the witness
  runner, green alone).
- Measured counts:
  - merged tree, witness shadow tree: 2 red then 1 green; the green run was
    **WITNESSED**;
  - merged tree, in the worktree: green 5 of 5 (the full tier and 4 `--only`
    runs);
  - integration's own tree (`git archive integration`, same scratch data):
    green 3 of 3 `--only`, and the witness green and WITNESSED 2 of 2.
- I also applied the spec's mutation by hand in the worktree and ran the suite
  `--only`. The guard and its two bind-mode neighbours went red, then I
  reverted.
- The counts went into a dated addendum on the issue. They are too small to
  say this diff widened the window. Its changes, the disagreement body and the
  write repaint, are not on that hover path.

### Nits (unfixed, non-blocking)

- **Design:** in round-3 shot 04 the armed pick's group offer covers the
  previous write's toast in the pane header ("Bound locating bo…"). Filed as
  `ISSUE_20261114_design_the_group_offer_bar_covers_the_write_toast_in_the_pane_header.md`
  (low).
- The `[real]` rail-suggestion oracle re-states the end-to-feature rule
  (`structural ? edge.part : first part of the node`). If that rule moves,
  this check needs the same edit. That is acceptable for an oracle, and it
  will fail loudly rather than agree with itself.

### Carried forward

- `ISSUE_20261113_the_hub_locating_boss_has_two_bound_faces_and_needs_jeffs_keep.md`
  (`needs: jeff`) lands with this branch.
- `ISSUE_20261113_no_rail_rebuilds_fits_json_…` was filed by the tactical in
  round 2.
- Round 1's design issue (disagreement rows name each face by number alone)
  stands.
- Every should-fix from rounds 1–2 is fixed. Nothing else is left without an
  owner.

**Verdict: APPROVE (round 3).** Landed on `integration` as a fast-forward.
Trunk was not touched.
