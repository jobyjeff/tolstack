---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — the_contact_engine_asks_the_ends_what_shape_they_are: pairing from the ends' surface class, seat radius in the rank, own-slot occurrences, and axis relations judged as axes

Source: four issues filed 2026-10-29 by the first agent proposal pass
(`docs/sessions/completed/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md`).
Staged by that day's triage sweep as one class-scoped handoff, because all four
are defects in one engine and they compound:
- `docs/issues/ISSUE_20261029_contact_engine_pairs_by_the_interface_word_against_what_both_ends_name.md` (med)
- `docs/issues/ISSUE_20261029_contact_engine_ranks_a_balls_seat_without_its_radius_and_the_drawing_refutes_its_plate_bores.md` (med)
- `docs/issues/ISSUE_20261029_contact_exists_and_the_engine_finds_none.md` (med; the coaxiality half only, see below)
- `docs/issues/ISSUE_20261029_contact_occurrences_borrow_another_part_numbers_slot.md` (low)

Baseline: tolstack trunk at `c9a9687c` or later. Scope:
`scripts/build_contact_suggestions.py`, `interface_contact` (the
`CONTACT_PAIRINGS` table, `edge_candidates`, `rank_score`), the projection it
writes (`data/projections/feature-identity/contact_suggestions.json`, rebuilt
in the main checkout by `scripts/rebuild_projections.ps1`), and their tests.

Do NOT touch:
- `scripts/propose_bindings.py`'s shape rule (`feature_geometry.end_surface_class`).
  It is the annotator's own rule and the reference this fix agrees with.
- the proposals under `data/inbox/feature-identity/`.
- `docs/sessions/HANDOFF_20261029_a_guard_whose_name_depends_on_live_data_pairs_with_the_scan.md`'s
  files.

## Deliverables

1. **Pair from the ends, not only from the interface word.** Today the pairing
   is `CONTACT_PAIRINGS[edge.interface]` alone (`clearance`, `pin_in_bore` →
   `cylinder_in_cylinder`). As a result, all 4 of the projection's
   `single_clear_top` pairs are refused by `propose_bindings.py`'s shape rule.
   On `tan_link_mount_end_centre_is_this_bearing` and
   `tan_link_plate_end_centre_is_this_bearing`, both ends are spherical. On
   `shank_out_pitch_link` and `shank_out_vpa_out`, the ends are planar far
   faces, but the engine picked bores.

   **The call, recorded so review can check it:** derive the pairing from both
   ends' surface class, with the same rule `end_surface_class` uses. Keep the
   interface word only as a tiebreak when the ends name no class. **Rejected
   alternative:** a per-edge override table. It would hide the same mismatch on
   the next linkage.
2. **Put the seat's radius into `ball_in_seat` ranking, and drop planar
   grazers.** Today every cylinder whose axis passes through the ball ranks, so
   `pitch_arm_link_joint` ties within 6e-6 between r 2.413 and r 6.35.

   Drawing 215735 rev A sheet 2, Section A-A, dimensions the lug holes as
   ⌀7.950 and ⌀8.520 (r 3.975 and r 4.26). The engine's rank 1 on
   `pitch_plate_link_joint` and `tan_link_plate_joint` is r 5.5499, which the
   drawing refutes. Planar seats at `seat_gap_mm` -0.0186 (mount faces 810 and
   1594) are a face grazing the sphere and must not rank as seats.

   Score radius against the ball's own radius, or the bearing bore's where the
   part carries one. Then re-measure all four joints and quote the new ranks.
3. **Judge axis relations as axes.** `hub_to_pitch_plate_spindle_coaxiality`
   (`cylindrical_slide`) reports `no_contact` at a nearest distance of 1.04 mm
   against a `reach_mm` of 1.0. A coaxiality edge should compare axes (angle
   and offset), not a surface distance.

   The issue's other two items are data, not engine, and stay out of scope:
   the gas spring sits 51.54 mm off at another stroke, and
   `gas_spring_mount_213668_002` has no assembly placement. Name them in the
   lesson.
4. **Prefer own-slot occurrences, and say when a slot was borrowed.** Carry
   `own: false` (the builder already computes it) into each candidate's
   evidence, and prefer own-slot pairs when both exist. The measured case is
   the U11D bolt placed at a `NAS6403U10D.3` slot.

## Definition of done

- Rebuild the projection: `rebuild_projections.ps1`, main checkout, after merge.
  For your own run use your worktree, with the inputs read from
  `C:\workspace\tolstack\data\` by absolute path.
- In the rebuilt projection:
  - none of the 4 `single_clear_top` pairs is refused by `end_surface_class`;
  - the two plate joints rank a drawing-consistent bore (r 3.975 or 4.26)
    first;
  - the hub/spindle coaxiality edge reports a relation, not `no_contact`;
  - borrowed slots carry `own: false`.

  Quote each, before and after, in the lesson.
- Value-level tests for each of the four rules.
- Run tolstack's default tier as its `CLAUDE.md` spells it, plus its
  merge-tier rule for changed specs (`--changed-since master`). Record the
  times with `suite-time record`.
- All four issues are resolved, with the commit. The coaxiality issue is
  resolved only for its engine half; refile its data half if nothing tracks it.
- Lesson (`docs/sessions/lessons/LESSONS_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md`):
  - how many of the 90 open meshed ends from the 10-29 pass now carry a usable
    top pair (`ISSUE_20261029_first_proposal_pass_left_ninety_meshed_ends_open.md`
    is the list), so the next proposal pass knows what changed.
