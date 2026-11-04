---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_coaxial_ends_share_one_3d_node.md
reviewer: agent
date: 2026-11-03
verdict: REQUEST CHANGES
blockers: 2
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
