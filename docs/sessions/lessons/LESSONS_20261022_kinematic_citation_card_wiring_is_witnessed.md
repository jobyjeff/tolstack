# Lessons — kinematic_citation_card_wiring_is_witnessed (2026-10-22)

## What was asserted

Hover on the first `span.kmverdict__limit` of `?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
(live projection) must open `#croppop.hovercard--citation` whose text contains
`S461-607` and `closest available numeric acceptance criterion`. The phrase is
quoted exactly from the -7 deg stop's `source_ref.note` ("Adopted here as the
closest available numeric acceptance criterion for the accumulated tolerance…");
the +7 stop's note carries it too. No wording had changed.

## Decisions

- `hoverRailBar` returns `true` or a reason string; its three callers push a
  named FAIL and skip only what needs the open card. The short-window caller
  gained one new named guard ("the DAG-side card opens from its own rail bar…"),
  hence the browser pin 579 -> 581 (one for the kinematic sub-check, one for this).
- The `rail__barhit` rename must hit **both** sites (the element class and
  `base:`): `hotRegister` repaints the class from `base`, so renaming only the
  element changes nothing. Enrolled for two guards, same mutation.
- A worktree can run the browser tier and the mutation runner if `node_modules`
  is junctioned in (gitignored) and `--repo C:\workspace\tolstack` is passed.

## Plumbing in `topology_app.js` no tier witnesses (listed, not fixed, not verified one by one)

Candidates in the kinematic ctx: `onEdge`, `onAttach3d`, `annotateMount`; and the nav ctx's
`onKinematic` / `onKinematicModel`. The nav `onCardShow` (alert badge) and the
stack view's `onCardShow` (line ~1890 / ~1837) were not checked for a hover
witness either.

## Full-suite record

Worktree, with `--repo C:\workspace\tolstack`: browser tier 29/29; `apps/viewer/run_tests.cjs`
451/452 + the [real] tier reported SKIPPED (projection stamped from another tree);
annotate 213/213; `pytest -q` 1560 passed, 1 skipped, 1 failed — the expected
worktree-only `test_viewer_js_suite_is_green`. Not run: `run_mutation_witness_tests.mjs --full`
(branch mode `--only` for all three new specs: WITNESSED).
