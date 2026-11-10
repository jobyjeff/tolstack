---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-09 — the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection: the rail-holds-still and model-drawn-alone browser suites, red on trunk, are diagnosed and turned green without weakening either

Source: the 2026-11-09 triage sweep's batch merge
(`dispatch/docs/sessions/lessons/LESSONS_20261109_triage_sweep.md`). Two open
issues name these reds, and neither has an owner:
`docs/issues/ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`
and
`docs/issues/ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_against_integration_built_projections.md`.
Baseline: trunk `31c9118c`. The batch merge fast-forwarded master from
`5e868bc3` to there, and it carries the end-stop model v2, the nested
coloured bodies, the model-drawn-alone scene and the bindings fold. Scope:
`scripts/run_viewer_browser_tests.mjs`, `apps/annotate/`, `apps/viewer/`
(seam leaders only), `tolerance_stack/` where a binding or anchor needs it,
the two issues above, and the related
`docs/issues/ISSUE_20261109_two_of_the_end_stop_models_joint_nodes_have_no_leader_in_the_sweep.md`.
Do NOT touch the witness registry beyond re-anchoring specs your edits move,
and do NOT touch the strategy's demo-batch handoffs if any are staged beside
this one.

## Observed (main checkout, master `31c9118c`, projections rebuilt by `scripts/rebuild_projections.ps1` with every stamp at `sha12=31c9118cd352 dirty=False`)

`node scripts/run_viewer_browser_tests.mjs` gave `42/44 browser checks passed`
in 1985 s:

- `annotate rail holds still (bodies under Bodies, joint words, framing, the second face)`: 11/17. These six fail:
  - `[real] a Take keeps the nav's scroll, and the joint row stays where it was on screen`
  - `[real] after one end is taken the other end's candidate list is open and selected, still suggested, and no edge-feature row is listed`
  - `[real] the scene tree's rows say what they are: body, part, joint, end and candidate rows each carry their kind, and every joint end carries a mark from the annotator's vocabulary`
  - `[real] the end taken this session wears the picked-now mark, filled in the scene's pick orange, and its partner does not`
  - `[real] each level of the tree steps in by a full indent: an end from its joint, a candidate face from its end`
  - `[real] a body, a part, a joint, an end and a candidate face each draw a glyph`
- `the model drawn alone and led (the end-stop model's parts only, a leader per placed node)`: 1/2. This one fails:
  - `[real] with the P2 run loaded and no study, every joint node the scene drew has its leader across the seam`.
    The log says: `P2 with no study: 19 leaders; joint nodes the scene drew 4 (pitch_link_lower_sphere_centre, pitch_link_upper_sphere_centre, tan_link_lower_sphere_centre, tan_link_upper_sphere_centre); no anchor: hub_blade1_root_bearing_bore, hub_spindle_bore_axis; 15 meshes drawn`

Both issues measured the same reds on integration before this merge, so they
are pre-existing. The merge did not introduce them.

## Deliverables

1. **Rail holds still: find out why the six sub-checks fail, then fix the right side.**
   All six follow from the first `Take`. The check takes the pitch link upper
   end's suggested face (`scripts/run_viewer_browser_tests.mjs`, near the
   `UPPER` regex). The issue's suggestion, which you should test rather than
   assume, is that the live end no longer has a `Take`-able `face=` candidate
   row. That could be because the bindings projection now folds Jeff's
   accepted events and the end is already bound, or because v2 is the default
   model the rail opens on. If the product is right and the check picks a
   stale target, re-point the check at an end the live projection leaves
   unbound. Choose that end from the projection at run time; don't hard-code
   a second name. If the product is wrong, fix the product. Record which case
   it was in the lesson.
2. **Model drawn alone: make the log say which leader it skipped, then decide.**
   Print `lastSeamDraw.skipped` in full (`offDag`, `offScene`, `noAnchor`) in
   the sub-check's log line. Then decide whether the missing leader is a
   product defect or an off-screen DAG dot. The check's own comment says it
   means "on screen", so an off-screen dot is one it should exclude. Never
   reinstate the raw skeleton point for an axis joint. The reverted `c75d8fe3`
   shows why, and the related leader issue records it.
3. **Don't weaken either check.** Narrowing a check to what it was always
   meant to assert is fine. Dropping a sub-check, or loosening one until a
   real regression would pass, is not. Each changed sub-check needs a
   mutation-witness spec, or a re-anchor of its existing one, that is
   witnessed on your branch.

## Definition of done

- In the main checkout, after `scripts/rebuild_projections.ps1`, both suites
  pass with `node scripts/run_viewer_browser_tests.mjs --only "rail holds still"`
  and `--only "the model drawn alone and led"`. The full browser tier reports
  no failures beyond any known flake you name. Also run
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  and get green.
- The pane-seek witness
  `browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046`
  has to come back WITNESSED. It is hosted in `annotate rail holds still`,
  and the batch merge's `--changed-since 5e868bc3` gate skipped it as "tier
  already red with NO mutation applied", so this red is also blinding that
  witness. Check it with `node scripts/run_mutation_witness_tests.mjs --only <that id>`.
- Default tier green: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`.
- Both issues resolved with a verified `resolution:`, plus an addendum on
  the related leader issue if deliverable 2 changes what it says.
- Lesson (`docs/sessions/lessons/LESSONS_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md`):
  for each suite, product or check and the evidence for it, plus the full
  `skipped` breakdown deliverable 2 printed.
