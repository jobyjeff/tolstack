---
priority: med
depends_on: [the_checks_and_claims_the_folds_left_naming_what_they_removed]
model: opus
hitl: false
---

# HANDOFF 2026-10-27 — a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds: the fastener stacks' worksheets and joint blocks come back, on the study that carries each stack

Sequenced after `the_checks_and_claims_the_folds_left_naming_what_they_removed`: both edit `scripts/run_viewer_browser_tests.mjs` and `apps/viewer/tests.js`, and that one re-aims the fold's stale checks first.

Source: triage sweep 2026-10-27, from
`docs/issues/ISSUE_20261027_the_fastener_stacks_worksheets_have_no_page_since_the_fold.md`
(found by `the_fastener_stacks_join_the_model`). Baseline: `master` at
`1a006b63` plus `the_checks_and_claims_the_folds_left_naming_what_they_removed`.
Scope: `apps/viewer/` (topology page, `VA.worksheetSubject` in
`apps/viewer/topology.js` ~3483, `apps/viewer/topology_app.js` ~757, the
worksheet/joint rendering), `scripts/build_topology_projection.py` if the
projection must carry the mapping, their tests
(`apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` ~4527,
`tests/`), `apps/viewer/README.md` where it documents the worksheet subject.
Do NOT touch `docs/topologies/topology_vpa_pitch_linkage.json`'s edges or
studies (data, not page), `apps/annotate/`, or the nav's scene tree (staged
`the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed`).

## The problem

Until 2026-10-27 each of the four fastener topologies was its own page, and
the viewer reached a topology's worksheet through the stack it re-expresses
(`VA.worksheetSubject`: a topology's own sheet wins, otherwise a covered
stack's) and rendered that stack's `joint` block (assembly drawing, sheet,
view, zone). After the fold the product model declares its own worksheet
(the end-stop graft, `WORKSHEET_end_stop_graft.md`), so that sheet always
wins, and the model has no `joint` block. Three authored sheets —
`docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md`,
`WORKSHEET_rotor_fastener_length.md`, `WORKSHEET_vpa_output_to_pitch_plate.md`
— are offered by no page, and the four joint blocks live only in
`provenance.grip_stack_joints` of the model (~line 164). The `[real]` browser
check that pinned "the three converted stacks' sheets are reachable" now
asserts zero reached and cites the issue (`run_viewer_browser_tests.mjs`
~4527; `apps/viewer/tests.js` ~13844).

## The decision (made here; check it in review)

The subject of a worksheet becomes **the selected study**, not the page: when
a study whose chain is a folded grip stack is selected, the page offers that
stack's worksheet and renders its joint block; with no study selected (or a
study with no stack), the model's own sheet stands as today. The study→stack
link is resolved from data already in the model (the study's stack
re-expression / `provenance.grip_stack_joints`) — prefer a projection-time
resolution so the page reads one field, and say in the lesson which source
was used. Rejected alternative: a worksheet list on the model page showing
every folded stack's sheet at once — it loses which chain a sheet belongs to,
the thing the joint block exists to say. Follow the standing design rules
(progressive disclosure: the joint block is detail of the selection).

## Deliverables

1. The study→stack worksheet/joint mapping, carried where the page reads it,
   covered by a fast test over the committed model (all three sheets and four
   joint blocks resolve; a study with no stack resolves none).
2. Selecting each of the three studies shows its sheet and joint block; the
   fourth stack's joint block shows even though it has no sheet of its own
   (say so on the page the way the absent-feature rule says).
3. Flip the `[real]` check at ~4527 and the node check at ~13844 back to
   "the three converted stacks' sheets are reachable" (by study), each with a
   mutation spec.
4. Resolve the issue (`status: resolved`, pointing here).

## Definition of done

- `topology.html` on `vpa_pitch_linkage`, select each `pitch_link_*` /
  rotor-fastener / vpa-output study: its worksheet and joint block are on the
  page; screenshot each at 1600×1000 into
  `docs/sessions/shots_20261027_study_worksheets/`.
- `pytest -q`, node tier, and the browser tier's affected suites green on a
  projection built from the worktree.
- Lesson (`docs/sessions/lessons/LESSONS_20261027_a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds.md`):
  where the mapping lives and why, and anything on the page that still has no
  study to hang off.
