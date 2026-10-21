---
priority: med
depends_on: [browser_tiers_name_their_failure_instead_of_aborting]  # both edit scripts/run_viewer_browser_tests.mjs, and that one fixes the red on trunk this handoff would otherwise inherit; land it first
model: opus
---

# HANDOFF 2026-10-21 — the_kinematic_study_checks_its_run_its_units_and_shows_its_limit: the blade-pitch study folds the right run, refuses a unit mismatch, and shows the limit it was judged against

Source: the 2026-10-21 triage sweep. This handoff takes the kinematic-study
issues filed since 2026-10-16 as one class: **the study, its sweep run, and
the surfaces that read it disagree, and nothing notices.** Issues:

- `docs/issues/ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`
- `docs/issues/ISSUE_20261021_the_sweep_rail_lists_a_kinematic_studys_contributors_on_a_run_the_study_did_not_fold.md`
- `docs/issues/ISSUE_20261016_a_kinematic_study_never_checks_a_bands_units_against_the_jacobian_column.md`
- `docs/issues/ISSUE_20261020_the_kinematic_page_shows_a_pass_against_a_limit_whose_citation_it_never_shows.md`
- `docs/issues/ISSUE_20261020_the_blade_pitch_kinematic_study_title_carries_a_genre_suffix_the_viewer_now_renders.md`
- `docs/issues/ISSUE_20261020_design_the_kinematic_page_3d_link_wraps_and_the_hover_tip_covers_the_limit_label.md`
- `docs/issues/ISSUE_20261021_the_kinematic_real_tier_reads_linkage_sweeps_which_the_candidate_inputs_never_declare.md`

Read each one before you start. They carry the exact lines, values and
suggested fixes, and this handoff does not repeat all of them.

Baseline: tolstack `master` at or after `9ce8262` (the 2026-10-21 batch merge,
which carries `the_viewer_shows_a_kinematic_study`,
`the_3d_pane_opens_in_the_mode_the_study_wants` and
`the_sweep_rail_shows_the_mechanism`).

Scope: `tolerance_stack/kinematic.py`, `scripts/build_kinematic_projection.py`,
`scripts/rebuild_projections.ps1` (only its kinematic step's reporting),
`docs/topologies/kinematic_study_*.json`, `docs/DAG_TOPOLOGY.md` (one
sentence), `apps/viewer/views/kinematic.js`, `apps/viewer/topology.css` (the
kinematic page's rules only), `apps/annotate/app.js` (`cmdSweep` and the
contributor group), `tests/test_kinematic.py`, the kinematic fast-tier and
`[real]` checks in `apps/viewer/tests.js` and `apps/annotate/run_tests.cjs`,
`.dispatch.toml`'s `[tests]` table and the matching `CLAUDE.md` bullet, and
any mutation-witness spec your changed guards need. In
`scripts/run_viewer_browser_tests.mjs`, touch **only** the boot URL of
`testAnnotateSweepRail` and checks that are new to this handoff.

Do NOT touch: `scripts/run_mutation_witness_tests.mjs`,
`scripts/guard_enumeration.mjs` or `tests/test_mutation_witnesses.py`, which
belong to the staged `mutation_tier_gates_on_every_pin_and_survives_a_board_move`.
Do not touch any existing block of `run_viewer_browser_tests.mjs` beyond the
boot URL above: the staged `browser_tiers_name_their_failure_instead_of_aborting`
owns those and lands before this one. Leave the linkage repo alone too. The
`geometry.units[]` idea in the units issue is linkage's to publish, and you
only note it.

**Where the sweeps are.** `data/inbox/linkage-sweeps/` is gitignored. It
exists only at `C:\workspace\tolstack\data\inbox\linkage-sweeps\` (seven
runs; the two P2 runs are `vpa-pitch-p2-20261015-013931.json` and
`vpa-pitch-p2-20261016-235852.json`). Build and test against that path. Never
write into it.

## Deliverables

1. **Declare the sweep inbox as a candidate input.** Add
   `"data/inbox/linkage-sweeps"` to `.dispatch.toml`'s
   `[tests] candidate_inputs`. Then rewrite the `CLAUDE.md` bullet that lists
   the declared set (it still calls the declaration "inert") so it matches
   what `dispatch bridge-test-inputs` actually printed on 2026-10-21: four
   paths `linked`, `data/inbox/feature-identity` `present` (it holds only its
   tracked README). Also update the `.dispatch.toml` comment that says every
   path reports `present`. Measured at that merge: without this path, a
   candidate is `5 failed, 1509 passed`, all five failures coming from the
   kinematic study building as `error`. With it bridged, the result is
   `1514 passed, 1 skipped`.
2. **The study folds the run that names its features.** Re-point
   `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`'s
   `sweep.run_id` at `vpa-pitch-p2-20261016-235852`, rebuild, and re-pin
   `tests/test_kinematic.py`'s `REAL` table and `REAL_RUN` from the rebuilt
   output (1015 pinned margins 0.256 / 0.258, and 1016 may move in the third
   decimal). Confirm the projection now reads
   `sweep.features_in_artifact: true`, and that every authored feature join
   reconciles against `geometry.features[]`. Any that does not is a finding:
   report it, do not hand-edit it to pass. In the same edit, retitle the study
   to `Blade pitch at the end stops` and keep the `id`, which is a deep link.
   First check `tests/test_title_style.py` and every fixture or check that
   quotes the old title.
3. **A run/study mismatch is refused where it is received.** In
   `apps/annotate/app.js::cmdSweep`, when `study.sweep.run_id` is not the run
   being loaded, do not show the study's contributor rows under the other
   run's animation. Decision, made here so review can check it: **leave the
   contributor group out and say why in the console/banner line.** That
   follows the "absent means the group is absent" rule the sweep-rail
   handoff set. The rejected alternative was a muted head that names the
   other run: it shows numbers that are not about what is on screen. Pin it
   with a fast-tier check that plants a mismatched pair. Then point
   `testAnnotateSweepRail`'s boot URL at the study's own run, so the TRUTH
   tier stops depending on the mismatch. After item 2 that is the 1016 run
   it already boots, so check that the URL and the study agree.
4. **A band's units are checked against what it scales.** In
   `tolerance_stack/kinematic.py`, give each parameter label kind
   (length-like coordinate, direction-cosine component, driver) the unit it
   carries. Refuse at load, naming the contributor, when a contributor's
   `band_units` does not fit its label's kind. A unitless direction component
   scaled by an mm band is the case the issue names. Add a negative-control
   test for each refusal. Then correct the `docs/DAG_TOPOLOGY.md` sentence
   that says bushing tipping "waits only for a cited clearance band". It also
   needs a cited bushing length to turn the clearance into a tilt. Suggestion
   only: if linkage ever publishes `geometry.units[]`, prefer it to the label
   vocabulary. Record that in the lesson rather than building for it.
5. **The verdict shows the limit's citation and adoption note.** On
   `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`, each
   stop's verdict must lead to the limit's `source_ref` (document, cell,
   callout) and its adoption note, which says S461-607 is a proxy borrowed
   because S461-241 gives only the stop angles. Show the stop's `context_ref`
   the same way. Everything is already in the projection. Follow the design
   rules: the citation goes behind hover or in the "Where these numbers come
   from" fold, with a link to the source, not a transcription. Pin it with a
   fast-tier check over the inline fixture and a `[real]` check that names
   S461-607.
6. **Two layout faults on that page.** At a 1100 px viewport, `td.kmrow__3d`'s
   `3D ↗` must stay on one line. The plot's hover tip must not cover the
   `limit ±0.500 deg` label: anchor the tip below the line, or move the label
   to an end the stop labels do not use. Your choice, and say which in the
   lesson. Check both at 1100 px and 1600 px.
7. **A study that fails to build is loud.** On 2026-10-21, with the sweep
   absent, `build_kinematic_projection.py` wrote the study as `error`,
   `rebuild_projections.ps1` exited 0, and the provenance line read
   `dirty=False behind_trunk=0`. That looks the same as a good build. Make the
   failure visible on the rebuild's own output: a final line naming each
   study that did not build, and its reason. Decide whether it should also
   exit non-zero, and record why. A worktree without the inbox is a normal
   case, so a non-zero exit would redden every worktree rebuild. This is
   tolstack's share of
   `dispatch/docs/issues/ISSUE_20260930_actuator_rebuilds_over_absent_inputs_stamp_clean_provenance.md`.

## Definition of done

- `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`,
  served from the main checkout, shows the retitled study. Each stop's PASS
  leads to S461-607 and its adoption note. The `3D ↗` links sit on one line
  at 1100 px, and hovering mid-plot leaves the limit label readable. Put
  screenshots at both widths in the lesson.
- `?sweep=vpa-pitch-p2-20261015-013931&kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  in the annotator shows no contributor group and says why. The study's own
  run shows the group.
- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` is green
  in the main checkout after a rebuild. So are
  `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs` and
  `node scripts/run_mutation_witness_tests.mjs`. Every new guard is enrolled
  or carries a stated reason it cannot be.
- Model note: `opus` because the work spans a refusal in the engine's
  semantics (item 4) and a design-sensitive verdict surface (items 5 and 6).
  A wrong first attempt at either would ship subtly wrong judgement, not
  fail a test.
- Lesson (`docs/sessions/lessons/LESSONS_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md`):
  the 1015 → 1016 margin deltas, every feature join that did or did not
  reconcile, the unit vocabulary you chose and the refusal wording, the
  exit-code decision in item 7 and why, and the layout choice in item 6.
