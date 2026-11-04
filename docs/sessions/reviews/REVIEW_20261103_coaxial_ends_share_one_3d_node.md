---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_coaxial_ends_share_one_3d_node.md
reviewer: agent
date: 2026-11-03
verdict: APPROVE (round 3)
blockers: 0
---

# Review 2026-11-03 — coaxial_ends_share_one_3d_node

Branch under review: `handoff/coaxial_ends_share_one_3d_node` (7 commits,
`d768905c..6f4a338b`). Not already contained in `integration` (containment
check run). Merged into `review/coaxial_ends_share_one_3d_node` (clean, no
conflicts). **Not landed on `integration`**: the verdict is REQUEST CHANGES.

## What I verified

- **Joint merge (D1).** `AA.modelJointMeasure` / `AA.modelJointGroups` /
  `AA.modelJointWorldPoints` / `AA.modelDrawnGraph` in
  `apps/annotate/model_layer.js` read correctly: merges only across an edge,
  union-find never folds non-parallel axes, the joint id is the first member in
  topology order, lines leaving a joint become world lines. The two thresholds
  are named constants and the lesson records the measurements behind them
  (live: 4.7e-24 mm for the slide vs 61.45 mm for the nearest link; the
  proposals dump: 0.000–0.050 mm vs ≥ 61.45 mm). The mutation specs witness
  both thresholds from both sides on the live P2 run.
- **Unplaced nodes (D3).** No dot, no line, `null` in the anchors message, head
  line count with names in the hover. Lesson's "55 section, 4 joint and 15
  origin" sums to the topology's 74 nodes. The lesson's "55 proposals, 0
  accepted" was right when written; the inbox now holds 57, the two newer
  (`0056`/`0057`, 19:49) from the sibling slide-joint handoff.
- **Rule written (D4)** in both `docs/DAG_TOPOLOGY.md` and
  `docs/ANNOTATION_SURFACE.md`, with the new `annotate:hover` `members` row in
  the message table.
- **Routed issue** `ISSUE_20261027_design_the_model_layer_draws_a_star…` is
  `resolved` with `handoff:` and a resolution line. New issue
  `ISSUE_20261103_one_bearing_node_for_two_instances…` has valid frontmatter.
- **`views/topology.js` was touched** despite the handoff's "do not touch the
  2D DAG's layout": the change is `VA.lightTopoKeys` (hover state, not layout)
  and the lesson says so. Accepted.
- Tactical full-suite record: worktree, single-process, `1687 passed, 1
  failed, 1 skipped`, the one failure being the documented worktree-only
  `test_viewer_js_suite`. Benefit of the doubt given.

### Risky subset, pre-merge (on the merged review branch)

- `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py
  tests/test_feature_identity.py tests/test_part_mesh_aliases.py
  tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py
  tests/test_app_type_scale.py tests/test_mutation_witnesses.py
  tests/test_tolerance_stack.py tests/test_provenance.py
  tests/test_thermal_exception_list.py tests/test_claims_registry.py`:
  **410 passed** (94 s).
- `node apps/annotate/run_tests.cjs`: **274/274**, no SKIP lines; the `[real]`
  P2 joint check ran and printed the measured table.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **630/630**.
- Browser (`--only "annotate model in the scene"`, `--only "leaders across the
  seam"`) and `apps/annotate/run_browser_check.mjs`: see "Browser run" below.
- Mutation tier not re-run: the tactical run's 38/39 is recorded, and the
  verdict sends the branch back regardless.

## Findings

### Blocker

1. **Hovering the joint's own internal edge row lights nothing in 3D — the
   DoD's "hovering a merged member's grid row lights the one 3D node" fails for
   the row that defines the joint, and no tier checks that direction.**
   *Location:* `apps/annotate/scene.js`, `_applyModelStyle` (the
   `emphasisNodes` loop over `model.lines`); `apps/annotate/app.js`,
   `cmdHighlight` → `state.model.emphasis`.
   *What's wrong:* a grid row's hover posts `highlight <topology> <edge>`
   (`topology_app.js`, `schedulePaneHover`), which sets `model.emphasis` to the
   edge id. The scene emphasises a node only as an end of a *drawn* line. The
   diff deliberately no longer draws `hub_to_pitch_plate_spindle_coaxiality`
   (its own browser check asserts it is not in `modelState().lines`), so that
   row now emphasises no line and no dot. Before this change, hovering that
   row lit the line and both end dots. The same applies to any edge touching
   an unplaced node. Rows for edges *leaving* the joint still work, because
   their line is renamed to the joint's id. The new browser checks test only
   the scene → shell direction (pointer on the 3D dot). Nothing tests shell
   row → 3D dot, though the DoD names that direction.
   *Suggested fix:* when `model.emphasis` names an edge internal to a joint
   (`built.hidden`), emphasise the joint's dot. One way is to pass the hidden
   edge's joint id in the style, or resolve `emphasis` through `dotOf` for the
   edge's ends. Add a browser check on P2 that hovers the coaxiality row and
   a row leaving the joint, and asserts the joint dot's emphasis scale/colour.
   Add a mutation spec for that check. This changes behaviour and needs a test,
   so it goes back to the author.

2. **The diff turns an existing mock-tier check red and does not update it.**
   *Location:* `apps/annotate/run_browser_check.mjs`, "the model layer
   anchors every node of the topology and draws a line for every edge".
   *What's wrong:* deliverable 3 (an unplaced node draws no line) contradicts
   the check's own claim. The mock topology has two `origin` nodes (`b`, `d`),
   so the layer now draws `lines: []`, and the check that passed on trunk
   fails on the merged tree. The tactical record does not mention this tier.
   The overlay's risky-subset row for `apps/annotate/` names it for any
   scene/placement change, because it is the only tier that sees `app.js`'s
   scene wiring.
   *Suggested fix:* re-word and re-derive the check the same way the
   browser-tier twin was changed (an edge is drawn unless an end is unplaced
   or both ends are one joint). Re-run the mock pass and record it. If the
   check's name changes, move its mutation spec to the new name.

### Should-fix

3. **The as-modelled frame still shows a fan of lines out of the assembly
   origin** (`docs/sessions/shots_20261103_coaxial_ends/after/5_as_modelled.png`
   vs `before/5_as_modelled.png`). The red star and the 15 unplaced fans are
   gone. But the spindle joint now sits at (0, 0, 0) at the as-modelled frame,
   and its eight world lines radiate from there. To a reader the after picture
   looks almost the same as the before. The DoD says "no star at the origin".
   The lesson is honest about this and names the next lever (draw the joint
   at its axis point nearest the +X side of its members' sections), but it
   leaves the call to Jeff by eye. In the rework, either take the lever or
   file it as an `audience: strategy` issue with the two shots, so the call
   has an owner. A paragraph in a lesson is not an owner.

### Nits

4. `apps/annotate/run_tests.cjs`, the `[real]` P2 check: the measured-edge
   assertion compares `Object.keys(rows)` against a list *filtered by
   `rows[e]`*. That proves no extra edge was measured, but not that the listed
   ones were. The `rows.pitch_link_length.merge` dereference below it covers
   two of them by throwing.
5. `VA.lastTopoHot` is a module-global back-reference that each render sets.
   A scene hover arriving after the pane has re-rendered into another view
   lights detached elements. That is harmless today. Worth a comment if the
   pane ever renders twice.

## Browser run

- `run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate
  model in the scene"`: **21/21**. `--only "leaders across the seam"`:
  **24/24**. These match the tactical record.
- `node apps/annotate/run_browser_check.mjs` (the mock pass, which the overlay
  requires for a scene change), on the merged tree: **94/99**. The same run
  in the main checkout on trunk `388fc436`, which does not have this diff:
  **96/99**.

  | check | trunk | merged |
  | --- | --- | --- |
  | the model layer anchors every node of the topology and draws a line for every edge | pass | **FAIL** |
  | the mock's bound face moves its node onto the face's fitted point… | FAIL | FAIL |
  | the anchors message is computed for a drawn frame… | FAIL | FAIL |
  | the speed control changes reduced-motion playback's rate | FAIL | FAIL |
  | reduced-motion playback covers (nearly) the same distance… | pass | FAIL |

  The two anchor reds are already filed
  (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`).
  The two reduced-motion reds look like timing under contention: the speed
  check is red on trunk too, and nothing in the diff touches playback. I
  attribute neither to this diff. The first row **is** this diff's (blocker
  2).

## Note for the rework / next reviewer

The fix for finding 1 is a channel the diff did not re-map. The diff carefully
re-mapped selection, focus, the lit set and the anchors message to the joint's
dot (`dotOf`, `members`), and missed `emphasis`. Before you call the rework
done, ask the same question of every inbound channel. That question is now an
entry on this repo's overlay ("A diff that MERGES or DROPS scene elements…").

## Re-run 2026-11-04 (round 2)

Round 1 was REQUEST CHANGES, 2 blockers. Both are **fixed** by `b814590a`:

- **Blocker 1 (emphasis).** `AA.modelEmphasisNodes` sends the emphasised
  edge's two ends to the scene, which resolves each through `dotOf`. The fast
  check, the P2 browser check and both mutation specs are in. On the merged
  tree the real pointer on the `hub_to_pitch_plate_spindle_coaxiality` row
  gives the joint dot scale 1.8. The annotate-tier spec is **WITNESSED** (45 s).
- **Blocker 2 (mock tier).** The every-edge check is re-derived the way its
  browser twin is. The mock pass is now 97/99 on the merged tree; the two
  reds are trunk's anchor checks, already filed
  (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`).
- **Should-fix 3** has an owner:
  `ISSUE_20261103_the_spindle_joint_draws_its_fan_from_the_assembly_origin_at_the_as_modelled_frame.md`
  (`audience: strategy`). Nits 4 and 5 are addressed.

### Merging `integration` (at `125d480c`)

There were textual conflicts in `docs/DAG_TOPOLOGY.md`, two issue addenda,
`docs/prompts/REVIEW_AGENT.md` and `scripts/guard_enumeration.mjs`. Each
side had appended a section, a dated addendum or a checklist entry, so the
docs resolution keeps both sides. The guard pins I re-measured on the merged
tree with `enumerateGuards`: fast 633 (integration 632 + 1), annotate 280
(274 + 6), browser 815/782 (809/776 + 6). Merge commit `211f2235`.

### Tests on the merged tree

The `[real]` tiers were armed with projections built from the merged tree
into `data/scratch/review_coaxial_ends/` (`--data-root`), because the main
checkout's projection predates the slide-joint re-author.

| run | result |
| --- | --- |
| `node apps/annotate/run_tests.cjs` | 280/280 |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | 627/633. All six reds are integration's slide re-author, filed as `ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md` |
| pytest subset (8 files) | 521 passed |
| full `pytest -q`, review worktree, single-process | `2 failed, 1722 passed, 1 skipped`, 381 s (inside budget, recorded). The two reds are the worktree-only `test_viewer_js_suite` and `test_contact_suggestions`' `[real]` red, which reads the main checkout's projection after the slide re-author. This repo's conftest prints no contention header lines |
| browser `--only "annotate model in the scene"` | 21/21 |
| browser `--only "leaders across the seam"` | **21/25** |
| same suite, `integration` tree alone (detached scratch worktree, same projection) | 23/23 |
| `run_browser_check.mjs` (mock) | 97/99 (trunk's two) |
| witness `model: a grid row's emphasis…` | WITNESSED |
| witness `[real] the pointer on the grid row…` | NOT WITNESSED: the tier was red before the mutation |

### Blocker (round 2)

1. **Merged onto current `integration`, the leaders suite loses four
   sub-checks, and `integration` alone keeps all of them.** The cause is
   `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`, which
   landed after this branch was cut. It re-authored the topology and the
   kinematic study.
   - `[real] on P2 every lit member of the spindle joint has a leader…`: only
     `pitch_plate_spindle_bore_axis` has a leader now, so `fanEnds.length >= 2`
     fails. The re-authored study no longer lights the hub's end.
   - `[real] the pointer on the grid row of an edge inside the joint, or of
     one leaving it…`: the internal row passes (scale 1.8). The leaving row
     the rework measured, `gas_spring_bushing_coaxiality`, **no longer exists**:
     it was renamed `pitch_plate_slide_bushings_to_piston_body` and re-ended. No
     other leaving row is reachable, so the result is "no such row".
   - Two pre-existing checks from `a_leader_starts_at_the_mark_it_names_on_every_tier`:
     `[real] at 1600x1000, both screenshot rows' leaders…` and `[real] a re-lay
     of the DAG with a row selected…`. Their rows are now
     `pitch_plate_flange_to_link_hole` and `gas_spring_mount_flange_to_end_stop`,
     and each has an **unplaced** end (`piston_rod_end_bore`,
     `piston_cover_mount_flange_seat`: "no anchor in the scene"). Under this
     diff's deliverable 3 such an end has no 3D leg. On `integration` alone it
     still sits at the origin, so the check finds an anchor there.
   *Fix:* merge `integration`'s tip into the handoff branch. Re-derive the
   fan-in and leaving-row checks from the re-authored study (or select
   their subjects by rule, not by a name that a data change can retire). Then
   decide what a leader to an unplaced end should do. Deliverable 3 implies it
   stops at the seam. Teach the two older checks that rule, so they stop
   expecting an anchor at the origin. This redesigns tests and needs new
   witnesses, so it goes back to the author.
   The merge conflict itself was mine to resolve. This is not a textual
   conflict: it is a semantic one in the tests.

The scratch root `data/scratch/review_coaxial_ends/` (projections built from
`211f2235`) is left in place for the next round. Rebuild it after merging
`integration` again, because `integration` has moved since (`0816cccf`).

## Re-run 2026-11-04 (round 3) — APPROVE

Rework: `ca8b98d1` (the joint's leader checks pick their subjects by rule) and
`52ce3df5` (lesson and issue addenda), on top of the author's own merge of
`integration` `0816cccf` (`1453a13b`). I merged the branch into the review
branch as `03cc7e60`. The one conflict, the guard pins, I resolved to the
branch's side, which already carries `0816cccf`. Re-measured on the merged
tree: fast `633/633 9e395966ce0f`, annotate `280/280 33e447c665d1`, browser
`821/788 077f198fedb9`, equal to the declared pins. `integration` has not
moved since (`0816cccf` is in `HEAD`). I grepped for conflict markers: none.
I rebuilt the projections from the merged tree into the scratch root
`data/scratch/review_coaxial_ends/`.

### Round-2 blocker: resolved

- **Fan-in.** It is now two claims. First, every member of the joint is
  posted at the joint's one point, lit or not. Second, every member the study
  lights has a leader that ends there. On P2 both members were posted at the
  dot, to 0.0 px, and the lit member (`pitch_plate_spindle_bore_axis`) has a
  leader that ends on it. Narrowing the leader half to the lit set is correct,
  not a weakening: `VA.seamDots` draws leaders for the lit set only, by
  Jeff's rule, and the posted half still covers the merge for every member.
- **Inside and leaving.** The joint is the run's first merged group. Its own
  edge is any hidden edge with both ends in the joint, and a leaving edge is
  any drawn edge with exactly one end in it. No names are used.
  `hub_to_pitch_plate_spindle_coaxiality` has no grid row on this study, so
  the pointer was on its DAG bar, which the check accepts and logs. That gave
  scale 1.8. `pitch_plate_attach_height` was reached through its grid row (1
  of 7 leaving edges), which the check requires for a leaving edge. That also
  gave scale 1.8. The author's finding stands: the round-1 "row" hover had
  landed on the DAG glyph, because `[data-row-kind="edge"]` matches the bar,
  the glyph and the row.
- **The two older trace checks** pass with only a comment added. Each hovered
  or selected row shows two grid leaders and one 3D leg, the placed end's:
  `pitch_plate_flange_to_link_hole` gives `3D pitch_plate_link_attach_bore`
  and leaves `piston_rod_end_bore` at the seam;
  `gas_spring_mount_flange_to_end_stop` gives `3D endstop_feather_contact`.
  The re-lay gives "grid 2, 3D 1; back: grid 2, 3D 1". The rule "a leader to
  an unplaced end stops at the seam" is what `with3d` already encodes, and
  the new comment states it. My round-2 red on these two checks was measured
  against an older `integration` tip, and I did not isolate it further.
  Against `0816cccf` they are green.

### Results (merged tree `03cc7e60`, scratch projections)

| run | result |
| --- | --- |
| `apps/annotate/run_tests.cjs` | 280/280 |
| `apps/viewer/run_tests.cjs --repo <scratch>` | 627/633: the same six reds `integration` has (`ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`) |
| full `pytest -q` | 1722 passed, 2 failed (the known worktree-only `test_viewer_js_suite` and `test_contact_suggestions` `[real]`), 500 s under browser contention |
| browser `leaders across the seam` | 26/26 on the re-run. The first run was 25/26 on the flake below |
| witness gate `--changed-since integration` | 30 WITNESSED, 29 left to the sweep (budget). Of the 5 NOT WITNESSED, 3 are fast-tier entries blinded by the six reds (as the author reported) and 1 is `nothing above produced an uncaught error` (the nav-chip red, as in rounds 1 and 2). The fifth is `a synthetic binding moves exactly one node…` ("another check reddened"), which was WITNESSED on its `--only` re-run |
| witness `--only` `[real] the pointer on an edge inside the joint…` (#1, #2) | WITNESSED, WITNESSED |
| witness `--only` `[real] on P2 every member of the joint is posted…` | WITNESSED on the third try. The first two clean runs were red on flakes elsewhere in the suite: the scene-tree pick check, then `...and at 1920x1080, after the window grew under them` |

### A flake that predates this branch (filed)

`a row the scene marks selected (a pick there) selects its element here…` was
red in 2 of 5 runs on the merged tree, and in **1 of 4 runs on `integration`
alone** (a detached `0816cccf` worktree, same scratch projections). So this
branch did not cause it. I filed
`ISSUE_20261104_the_scene_tree_pick_leaders_check_is_flaky.md` with the likely
race. `drawnAfter` resolves on any draw after the post, not on a draw that
carries the selection. This branch's added `scheduleSeamDraw()` on every scene
hover message may raise the rate without causing the red.

A doc-scan subset I re-ran before committing turned up one more
`integration` red, which I filed as
`ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
`test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`
failed when a copied path ran to 263 characters. The path comes from two
lesson screenshots that `4c0b7c62` put on `integration`, plus pytest's temp
directory. It passed in the full run earlier the same day.

### Nits (not blocking)

- `joint` is "the first group with two or more members". That is right while
  P2 has one merged group. A second merged group would make the choice depend
  on order. When one appears, pick the group by rule, for example one that has
  a hidden edge and a drawn leaving edge.

### Landing

The inline-fix boundary was not needed: there are no reviewer edits to the
diff. The only edits are this report, the overlay entry and the filed issue.
Landed into `integration` by fast-forward from this review branch, and pushed.
