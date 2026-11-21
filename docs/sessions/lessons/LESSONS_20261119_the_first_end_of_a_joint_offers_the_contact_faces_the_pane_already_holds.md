# Lessons — the first end of a joint offers the contact faces the pane already holds (2026-11-19)

## The cause

Not the edge choice, and not `contactSuggestions` in embed mode (it loads there:
the published tree carried the engine's rows once asked for). The shell's feature
body draws from two things: the pane's rows for the feature, and `tree.mates[fid]`.
`tree.mates` was built from `state.mates` alone (`treeMates`, `apps/annotate/app.js`),
and `refreshMates` only ranks a feature when a face is bound on the other side. So a
feature with both ends unbound had no `mates` entry, and the body fell through to
`not bound` + `Pick a face`. The contact rows exist only inside the pane's own
`featureRow` / element list, which the shell mirrors only for a feature the pane lists
a row for (`featureBodyPlan`: `suggested && rows.length`). Nothing carried the
engine's candidates to a plain unbound feature. `featureRow`'s one-edge-end lead was a
real limitation (a structural-dimension edge carries no candidates) but is not the
bug: the new path reads every gap-edge end of the feature.

## What changed

- `AA.endContactSets` (`sweep.js`): the engine's candidates at an end, one row per
  candidate, its faces together (six faces of a boss are one feature, so one Take).
  `candidateRowWords` says "6 faces · round · r 32.0000 mm".
- `treeMates` publishes those rows for every feature nothing ranks, each row naming
  its own `edgeId` / `direction`; `featureBodyPlan` reads the row's edge for its Take,
  so a feature that ends two gap edges binds at the right one. Ranked mates still win.
- **A latent defect the check found:** `take` with a set (`more` faces) keyed the
  extra faces off the *open* part and threw `face N is not on an open part` when
  nothing had opened it. A body Take on an unbound feature is exactly that case; the
  verb now opens the part first.

## Which ends offer what (model v2, real `contact_suggestions.json`)

- 21 gap edges; 20 have at least one candidate (`travel_between_end_stops` is
  `no_contact`); 40 of the 42 ends of gap edges are offered faces.
- The pane now publishes rows for 35 of v2's 67 features on the real log (printed by
  the browser check): the rest are bound, ends of no gap edge, or the engine has
  nothing for them.
- `blade_root@blade_root_pitch_arm_locating_boss`: one row, faces 1060, 1061, 6439,
  6440, 6666, 6667; Take writes one `bound` event over exactly those faces. Shots:
  `shots/the_first_end_of_a_joint_offers_the_contact_faces_the_pane_already_holds/`
  (`01_candidates_listed.png` before the Take, `02_after_take.png` after).

## Sites

Reached: the shell's feature body at rest and armed (the armed body takes the same
`mates` rows), the Take verb. Not reached, on purpose: the pane's own element list
keeps one row per face (same faces, same words, same Take, different grouping from the
shell's per-candidate row); `AA.endCandidates` is unchanged. A bound feature never
shows these (the bound plan returns first).

## Records

- Real `data/inbox/feature-identity/` file count: **101 before, 101 after.** The
  browser check runs against the real served log read-only with the pane's in-memory
  store (`__mockWrites`), so no scratch `--data-root` was needed.
- `pytest -q` in this worktree: 3 failed, 2373 passed, 1 skipped, 4 deselected
  (541 s). The three: `test_viewer_js_suite` (the node-fs tier skip, designed in a
  worktree); `test_export_runs_match_the_run_log` (run
  `20261119_132629_213668-002...` in the main checkout's log is not cited by the v1
  topology — same class as `ISSUE_20261022_two_213668_export_citations_list_one_of_five_runs_that_consumed_the_export`
  on integration; not this diff); and `test_every_anchor_resolves_to_exactly_one_place`,
  which was mine (a duplicated line, and a re-spelled Take line another spec anchors)
  and is fixed — that file, `test_mutation_witnesses.py` and the vocabulary and type
  tests re-ran green afterwards (49 + 74 passed). The full suite was not re-run after
  that fix.
- Fast tiers: viewer 507/507 (+1 tier skipped, worktree), annotate 334/334.
- Browser: `--only "the first end of a joint"` green (2/2); the existing
  `a suggestion names its face…` suite green (5/5) after the change (its "nothing
  bound opposite" check still holds: `piston_cover…end_stop_shoulder` has no
  candidate). The whole tier is the review's.
- Witnesses (one invocation, 4 specs, then 3 more after the anchor fix): 7/7
  WITNESSED. The suite's two `(skipped: …)` pushes are the literal `true` the
  census counts as declared-but-not-enrollable, as in the neighbouring suites; they
  print under the runner's SKIPPED section.

## Left

Nothing filed beyond this. If the per-candidate grouping should reach the pane's
element list too, that is a design call for strategy, not a fix.
