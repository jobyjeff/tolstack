---
priority: code-red
depends_on: [the_end_stop_model_names_its_datums_right_and_folds_its_riders, the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows, the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader]
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_integration_walk_reads_the_merged_page_against_jeffs_sentences: open the merged tree in a browser, take one screenshot per sentence of Jeff's 2026-11-08 complaint, say in a table which sentences are now false, file an issue for each that is not, and leave a demo walkthrough — never a merge block

Source: strategy session 2026-11-08 evening; the review loop proposed in
`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_tolerance_analysis_over_the_kinematic_model.md`
("The review loop"), run here for the first time as a tolstack handoff
because the demo is tomorrow afternoon (2026-11-09). The dated outcomes it
stands on: 2026-10-29, 11-03, 11-05 — three UI batches whose every lesson
screenshotted its own branch and nobody opened the merged page (memory
`nobody-looks-at-the-merged-tree`). **This is a walk, not a gate**: it
writes no refusal, blocks no merge; its findings are issues and a lesson.
Baseline: `integration` with the three `depends_on` merged. Scope:
`docs/sessions/lessons/` and `docs/issues/` only — **you change no code and
no projection builder**; a defect you can fix in one obvious line is still
an issue, filed, so the record of what the merged tree looked like stays
honest. You may write a `tests/debug_integration_walk_20261108.mjs` shot
script (tracked, `debug_` prefix, never a tier) so the shots are
reproducible.

## The walk

1. Merge `integration` into your worktree. In the **main checkout**, rebuild
   the projections (`scripts/rebuild_projections.ps1`, then
   `build_feature_identity_projection.py`) **from this merged tree** and
   serve it: drawing-checker's mount at
   `http://127.0.0.1:8000/tolstack/viewer/topology.html?topology=vpa_end_stop_v2`
   if up, else `ops.toml`'s `serve` on 8843. Record the commit the page is
   serving (`Data source` strip) in the lesson.
2. At 1600 and 2560 wide, take **one screenshot per sentence** below, look
   at each, and fill the table: sentence · shot · now false? (yes / no /
   partly) · one line of what the shot shows. Where a sentence is not false,
   file `docs/issues/ISSUE_20261109_<slug>.md` (`status: open`,
   `found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md`,
   `priority: high`) with the shot path in it.

Jeff's sentences (2026-11-08, his walk of the merged M1 page), verbatim where
it matters:

- S1 "a couple of extra blades, one superimposed on the same one that is
  animated, the other is on the opposite side of the hub, also looks like
  all 5 pitch links still in there" — 3D pane on v2 at rest and mid-sweep.
- S2 "The leaders going from 2d to 3d dag are completely missing" — pane
  open, sweep loaded; count the leaders.
- S3 "the zebra stripes between leaders are still present in the 2d dag".
- S4 "the colors are still bleached out" — default view; and the
  Colour-blind palette.
- S5 "The comfortable/compact row layout still mostly just scales/zooms the
  entire dag uniformly" — both densities side by side; measure the column
  pitch and a dot radius in each.
- S6 "when you hide parts, only some of the parts get hidden in the 2d dag"
  — Groups: Parts off; Bodies off; both off.
- S7 "Rigid body groups (the brackets) in the grid view have no labels,
  parts don't have brackets around them" — the grid's left gutter.
- S8 "there's now only one layer of container brackets" — the tangential
  link and the pitch link, DAG and grid.
- S9 "Line weights are still very thin".
- S10 base order: "the hub, the tangential link mount, the gas spring mount,
  the piston cover, in that order"; "Currently the piston cover is in its own
  separate rigid body at the bottom".
- S11 "The propeller hub only mentions 'spindle axis' and 'spindle bore
  axis'" — no row of v2 says spindle; the hub's rows name the locating boss
  and the blade root bore.
- S12 "The tangential link mount only has one line in the grid view" — the
  mount's rows: seat, pilot, clocking, radial.
- S13 "The piston head components … are shown outside of the body"; "The
  sequence goes: pitch plate, piston, lower piston head, upper piston head".
- S14 "Pitch link … should be displayed as a rigid body" — a body container
  with the part inside it, DAG and grid.
- S15 "I said to make leaders dimmer, not delete them entirely" — the leaders'
  ink against the rails' at rest, and lit on selection.

3. **The demo walkthrough.** A second table for Jeff's meeting: the five
   clicks (open v2 · Colour by Body on · open the 3D pane · play the sweep ·
   select the tan-link length row) each with a shot at 1920×1200 and one
   sentence of what the audience sees. If a click does something Jeff would
   not want on a projector (a stale-data banner, a "folder needed" badge, a
   console error), it is a row in the table and an issue.
4. **Switch to v1 and back**: one shot each; v1 renders as its 11-08 shot
   (`docs/sessions/lessons/shots/model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models/3_v1_dag_1600_after.png`)
   or the difference is named.

## Definition of done

- Lesson `docs/sessions/lessons/LESSONS_20261109_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md`
  with both tables, every shot under
  `docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/`,
  the served commit, and a last line: how many of the fifteen are false now,
  how many issues filed.
- Every issue passes `C:\workspace\dispatch\.venv\Scripts\python.exe -m dispatch.cli check-issue <path>`.
- No code change; no test change; the suite is whatever `integration` is —
  record its result, do not fix it.
