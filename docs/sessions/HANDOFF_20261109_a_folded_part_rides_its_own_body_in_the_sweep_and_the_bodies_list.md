---
priority: code-red
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-09 — a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list: model v2's piston heads move with the pitch plate, and the 3D pane's Bodies list shows what the DAG shows

Source: three issues with one root cause. The 3D pane builds its sweep posing
and its Bodies list from the run's own subjects (linkage's part lists), not
from the topology's `bodies`:
- `docs/issues/ISSUE_20261108_the_sweep_leaves_model_v2s_folded_piston_heads_standing_still.md`
  (code-red). Read it first: it names the `riders` map in `apps/annotate/app.js`
  (~line 1778) and suggests the fix.
- `docs/issues/ISSUE_20261109_the_3d_panes_bodies_list_leaves_the_piston_cover_and_heads_out_of_their_bodies.md`
  (high; Jeff's 11-08 sentences S10 and S13).
- `docs/issues/ISSUE_20261109_the_end_stop_models_in_sweep_drawn_part_count_is_logged_not_asserted.md`
  (med). This is the missing assertion that let the regression through.

Baseline: tolstack trunk after the 2026-11-09 triage batch merge (`4f09207e`
or later). Jeff demos this page on 2026-11-09. Scope: `apps/annotate/` (sweep
anchoring, the pane's Bodies list) and its tests and witness specs. Do NOT touch:
- `apps/viewer/` layout, copy or line weights, which are the sibling
  `HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector`;
- the two red browser suites owned by
  `HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`.

The siblings run in parallel because they share no file: this one owns the
sweep and Bodies-list code in `app.js`, and the demo-path one owns
`storage/adapter.js` and the viewer.

## Deliverables

1. **A folded part rides its own body's subject.** In sweep mode on
   `vpa_end_stop_v2` with the P2 run (`vpa-pitch-p2-20261105-204957`), these
   two heads must move with the piston and the plate:
   - `piston_head_lower_214699_002`
   - `piston_head_upper_214698_002`

   The piston cover is on the ground body, so standing still is correct for it.
   The issue's suggested direction is to count a topology body's parts that the
   same-named run subject does not list. Treat that as a suggestion: prototype
   it, and say in the lesson if you chose otherwise. Keep the existing skips:
   link subjects, parts with no mesh, and parts already carried inside a claim.
   **Check v1 as well.** Its `base` and `pitch_plate` carry hardware that linkage
   does not list. Say whether v1's sweep changes, and why that is correct.
2. **The Bodies list reads the model's bodies.** `base` lists the piston cover.
   `pitch plate` lists both heads. The list order and counts match the 2D DAG
   two clicks away. Every site that reads the Bodies list (sweep mode and
   binding mode) gets the same answer. If one of them deliberately stays on the
   run's subjects, name it in the lesson.
   The pitch-link bearing's label currently prints the whole STEP filename
   (`MS14101-3 (extracted from 217755-001 A.1 PROPULSION ASSEMBLY…)`). Shorten
   it to the part's own name if that is a one-line change in the same code.
   Otherwise leave it and say so.
3. **Assert, don't log.** Make the in-sweep drawn-part count an assertion in
   the `[real]` check that the med issue names. It must fail on today's trunk,
   so prove that by running it before your fix. Add a mutation-witness spec if
   the repo's convention asks for one.

## Definition of done

- With the P2 run playing on v2, the heads visibly move with the plate. Show it
  with before and after shots at 1920×1200 in
  `docs/sessions/lessons/shots/<slug>/`, and look at them yourself.
- The Bodies list matches the DAG for v2, with the counts quoted in the lesson.
- The new assertion is red on the baseline and green after the fix.
- The default tier, the viewer and annotate node suites, and
  `node scripts/run_mutation_witness_tests.mjs --changed-since master` for the
  specs you touched are all green, per tolstack's `CLAUDE.md`.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md`):
  - the rule a folded part now follows;
  - what v1 did under it;
  - every site that reads the Bodies list.
