---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-10 — the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned: two one-line holes in the annotate sweep rail

Source: two high issues filed by the 2026-11-09 sessions, both in the same file:
- `docs/issues/ISSUE_20261109_a_body_part_with_no_mesh_has_no_row_kind_in_the_sweep_rail.md`
- `docs/issues/ISSUE_20261109_the_sweep_bodies_list_reading_the_models_bodies_is_one_unpinned_line_in_app_js.md`

Baseline: tolstack master at `0b50d833` or later. The 2026-11-10 batch merge ran the
browser TRUTH tier at 44/44 on trunk. Scope: `apps/annotate/app.js`
(`missingPartRow` ~3266, `treePartRows`, the `cmdSweep` line ~1467),
`apps/annotate/*.js` where `AA.RAIL_ROW_KINDS` lives, `scripts/run_viewer_browser_tests.mjs`
(the "annotate rail holds still" suite ~8983 and "the model drawn alone and led"), and
the mutation-witness registry for the one spec below. Do NOT touch `apps/viewer/`.
The strategy thread is sequencing the viewer's selection/hover/layout rework (F1b,
F1c) there, one handoff at a time.

## Deliverables

1. **A missing-part row carries a kind.** `missingPartRow` builds the
   `part-row--missing` `<li>` and never calls `railLook`, so it has no `data-kind`,
   no glyph and no type-filter chip. `buildPartRow` does call
   `railLook(li, AA.RAIL_ROW_KINDS.part)`. The rows it affects:
   - `#sweep-tree/body=base/fastener family`
   - `#sweep-tree/body=pitch_plate/flanged bushing nas77a3 015a`
   - `#sweep-tree/body=pitch_plate/flanged bushing tan link`
   - `#sweep-tree/body=pitch_plate/flanged bushing unidentified`

   **Triage's call:** give it the `part` kind. It is a part with no mesh, and its
   `— no 3D model installed` title already says so. Rejected: a new kind of its own,
   which would add a chip to the type filter for a state, not a type. Do not loosen
   the `[real]` "rows say what they are" check.

   **First, explain the green.** "annotate rail holds still" passed on trunk today,
   while the issue measured that sub-check red on `36c0cda3`. Find out whether the
   check skips, reads a different body set, or was changed, and say so in the lesson.
   If it no longer reaches these rows, make it reach them. That is the point of
   this item.
2. **Pin the call that makes the Bodies list read the model.**
   `state.sweep.tree = AA.sweepModelTree(state.sweep.tree, sweepTopology());` in
   `cmdSweep` is pinned by nothing. Deleting it left every tier green (measured
   2026-11-09). Add a `[real]` sub-check to "the model drawn alone and led": with
   the P2 run on `vpa_end_stop_v2`, read the rail's `#sweep-tree/body=` rows and
   assert two things:
   - each body's part count and the body order equal the projection topology's
     `bodies[]`, derived and not literals;
   - `pitch_plate` lists both piston heads.

   Enroll a mutation-witness spec that deletes that line, and show it witnessed.

## Definition of done

- Run `node scripts/run_viewer_browser_tests.mjs --only "rail holds still"` and
  `--only "the model drawn alone and led"` in the main checkout. Both pass, and the
  lesson shows the four rows above now carry `data-kind="part"`.
- The new witness spec is witnessed (`node scripts/run_mutation_witness_tests.mjs --changed-since master`
  over your spec).
- The default tier (`venv-win/Scripts/python.exe -m pytest -q`) passes, and so do
  `node apps/annotate/run_tests.cjs` and `node apps/viewer/run_tests.cjs`.
- Lesson (`docs/sessions/lessons/LESSONS_20261110_the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned.md`),
  including the answer to "why was the suite green".
