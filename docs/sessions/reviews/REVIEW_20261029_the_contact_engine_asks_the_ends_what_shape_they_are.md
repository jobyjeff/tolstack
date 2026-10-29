---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review 2026-10-29 — the_contact_engine_asks_the_ends_what_shape_they_are

Branch `handoff/the_contact_engine_asks_the_ends_what_shape_they_are` @
`442687eb` (3 commits), merged into `review/…` @ `fb46ee33` on top of
`integration` @ `948ebba4`. Clean merge, no conflicts, no markers. Not
pre-merged (containment check negative). First run of this handoff; no prior
review commits on this branch.

## What I verified

- **The four rules, against the handoff's calls.** Pairing comes from both
  ends' `end_surface_class`, called exactly as `propose_bindings.py` calls it
  (`edge.name or edge.id`, `node.name or node.id`); `END_PAIRINGS` covers every
  sorted pair of `FITTED_SURFACE_CLASSES`, and every class the shape rule can
  return is in it. The interface word only fills a silent end. The rejected
  per-edge override table was not built. Cylindrical ball seats must be
  concave and are ranked by radius against the ball's; planar seats need the
  centre→flat ray to hit the ball's own facets. `cylindrical_slide` drops both
  reach gates (occurrence boxes and faces). `best_of` is
  `(relation, -own, score)` and `own` is carried per end on every candidate.
- **Each rule's test fails when the rule is removed** (scratch mutations,
  restored): convexity filter off → `test_a_balls_seat_is_a_bore_…` red; ray
  test off → `test_a_flat_where_a_truncated_ball_is_cut_away_…` red; old
  `best_of` order → `test_an_own_slot_is_preferred_…` red; radius term off →
  `test_a_balls_seat_is_a_bore_…` red; `axes` gate off on occurrences →
  `test_an_axis_relation_is_judged_…` red; builder back to
  `CONTACT_PAIRINGS[edge.interface]` → 3 red in `test_contact_suggestions.py`.
- **The DoD's projection, re-derived from the merged tree.** I built
  `contact_suggestions.json` from `fb46ee33` into
  `C:\workspace\tolstack\data\scratch\review_contact_engine_20261029\` (meshes
  read from the main checkout; shared projection not touched). Every figure the
  lesson's before→after tables quote for the after build matched: 17 gap edges,
  3 clear (`pitch_arm_link_joint`, `shank_out_pitch_link`, `shank_out_vpa_out`);
  shank-outs `across` at end_mm +0.0234 / −0.0109; plate joints rank r 4.26
  first; coaxiality `ok`, coaxial, 0.000 mm; pitch-link bearing edges
  `own: {from: true, to: false}`; `tan_link_plate_end_…` `no_contact`. With
  that build copied into the worktree's `data/` for the run (removed after),
  `tests/test_contact_suggestions.py` was **14 passed** — the four new `[real]`
  checks armed and green.
- **Issues.** All four resolved with a `resolution:` line; the coaxiality
  issue only for its engine half. Its data half and feature gap are refiled
  with frontmatter (`…gas_spring_sits_at_another_stroke…`,
  `…contact_suggestions_run_on_gap_edges_only…`), plus the new
  `…tangential_links_plate_end_has_no_sphere…`. The lesson's correction of
  the own-slot issue's premise (the U11D's `NAS6403U10D.3` slot is its own,
  `own: true`) is consistent with the build.
- **Vocabulary.** `PAIRING_KINDS` and `RELATIONS` grew; `vocab.gen.js` is
  regenerated (`test_js_vocabulary_is_generated` green), and the annotator's
  word tables carry both new words.
- **Tactical full-suite record**: present — 1666 passed, 1 failed (the
  by-design `test_viewer_js_suite` worktree red), 5 skipped, single-process,
  439 s, recorded with `suite-time record`; merge tier `--changed-since master`
  3/3 witnessed. Consistent with the diff; benefit of the doubt given.

## Tests run by this review

- **Pre-merge risky subset** (rows: Python under `tolerance_stack/`+`tests/`,
  `apps/annotate/`, prose in a tracked doc):
  `pytest -q tests/test_interface_contact.py tests/test_contact_suggestions.py
  tests/test_architecture_inventory.py tests/test_js_python_vocabulary.py
  tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py
  tests/test_part_mesh_aliases.py tests/test_tolerance_stack.py
  tests/test_provenance.py tests/test_thermal_exception_list.py
  tests/test_claims_registry.py tests/test_feature_geometry.py` →
  **410 passed, 4 skipped** (the four `[real]` ends checks, live projection
  predates `pairing_basis`; armed separately above). `node
  apps/annotate/run_tests.cjs` → **255/255**.
- **Post-merge full suite**, review worktree @ `fb46ee33` (the merged tree):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` →
  **1 failed, 1666 passed, 5 skipped, 2 deselected, 354 s**, single-process
  (this venv has no xdist), inside the default-tier budget (`suite-time
  record`). This repo's conftest prints no contention header lines. The one
  failure is the by-design worktree red `test_viewer_js_suite_is_green` (no
  viewer projection here). The skips are the four `[real]` ends checks, which
  I armed and ran separately against a merged-tree build (above), and the
  pitch-link re-extraction test. Same counts as the tactical record. Not
  exercised against the merged tree: the viewer node-fs `[real]` tier and the
  browser TRUTH tier. Both wait for the post-batch-merge rebuild.
- **Merge tier**: `node scripts/run_mutation_witness_tests.mjs --repo
  C:/workspace/tolstack --changed-since integration` → **3/3 witnessed, 3/3
  reached**, 0 left to the sweep, 105 s, recorded.
- No pollution: the main checkout's `git status --porcelain` is clean, and my
  scratch build under `data/scratch/` was removed afterwards.

## Findings

### Should-fix (filed, not fixed)

1. **The ball-seat radius term picks the companion bore.**
   `tolerance_stack/interface_contact.py::rank_score` (seat radius against the
   ball's). The DoD accepted "r 3.975 or 4.26 first", and both plate joints
   rank **r 4.26 (Ø8.520)** first. But the topology cites **Ø7.950** as the
   attach bore, with Ø8.520 positioned from it as datum F. The term has no
   physical basis: the ball sits in a bearing in a bushing in the lug, and
   4.26 wins only because it is nearer 5.147. Both rows are "not clear", so
   nothing acts on it today. This is the handoff's prescribed rule, not an
   author error, so it is a design question:
   `docs/issues/ISSUE_20261029_a_balls_seat_ranks_the_companion_bore_over_the_attach_bore_the_topology_cites.md`
   (`audience: strategy`).

### Nits

- The lesson's build time ("13 s to ~2 m 18 s") measured uncontended; my
  build of the same tree took 5 m 15 s wall on a busy box. Either way it is a
  rebuild-rail cost, not a pytest one; noted in the overlay entry.
- The lesson's "111 open meshed ends" and the 5→9 / 13→19 table are a
  reconstruction it labels as such; I did not re-derive them.
- `tan_link_mount_joint`'s rank 1 moved to r 4.5 with `centre_mm` 0.0501
  (half the 0.1 margin) and no drawing checked; the lesson already flags it
  for the next proposal pass.

## Not done here, and why

- **`scripts/rebuild_projections.ps1` in the main checkout** (the DoD's
  "after merge"): the main checkout sits on trunk, so a rebuild there runs
  trunk's engine and cannot produce the new projection. Until the batch merge,
  the four `[real]` checks skip in the main checkout with a reason naming the
  rebuild. The rebuild belongs to the operator's batch merge, which already
  runs it before the viewer/browser tiers.
- Browser TRUTH tier: not run. The only browser-visible change is two words
  and one `describeContact` branch, and the annotate fast tier pins both.

## Overlay

Added one Recurring-bugs entry: a contact rank term with no margin behind it
decides between two drawing callouts.
