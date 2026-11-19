# Lessons — the_filmstrip_boots_on_the_map_and_the_rails_residue_goes

## The scenarios kept (`scripts/filmstrip.mjs`)

`bootKinematic` waits for `#topopane svg.tv__map`. `bandProbe` became
`mapProbe`: the live (non-ghost) map's `g.map__world` box, the svg's frame
size, `data-zoom`, the world transform, the count of `--selected` marks and
`tweening`. `respine` and `respine-back` are deleted. Composites and probe JSON
are in `shots/the_filmstrip_boots_on_the_map_and_the_rails_residue_goes/`.

| scenario | trigger | what the probe shows |
|---|---|---|
| `pane-open` | `#study-3d` on the cotter-hole chain study | the frame narrows (737 -> 338 px) and the map's view refits (zoom 0.134 -> 0.062); this is the one that moves, by design |
| `row-click` | first `tr.tvrow--edge` in the grid | the world box is identical in all 8 frames, 3 marks lit at the end |
| `click` | first `g.map__connector` on the map | same: world box and zoom unchanged, 3 marks lit |

The first `click` run died at `div.kmverdict` (before the map wait) while
`row-click` ran on the same boot a minute earlier. The re-run was green. It
looks like load on the shared box, not the script; I did not chase it.

## Dead code

Removed: the two `.tv__rails` rules and four stranded comments in
`topology.css` (also `--leader-ink` and `--rail-even/odd/dim`, which no rule
read); `VA.blockColumns` with its `searchMemo`, `VA.kinematicPoseLengths`,
`VA.dimensionText`, `VA.rowElement`, `VA.transformText`,
`VA.topologyBuiltLine`. Each name had no caller in `apps/`, `scripts/` or
`tests/` (including `tests.js`), so there were no unit tests to delete.
`improveColumns` and `relabel`, which `blockColumns` used, have other callers
and stay. A dangling jog-zone comment above the "loose stacks" heading went
too. Comments fixed in `views/topology.js`, `topology.js`, `map.js`,
`tests.js:5901` and `tolerance_stack/topology.py` (both lines).

## Debug probes: the rule and the count

28 `tests/debug_*.mjs` match `tv__rails|dagDrawing`. **Rule: a probe stays if
any tracked file under `docs/` (lessons included), `scripts/` or `tests/*.py`
names it; it is deleted if nothing does.** Almost every probe is named by the
lesson of the handoff that wrote it, so the rule deletes few: **2 deleted
(`debug_filmstrip_map_selection_20261116.mjs`,
`debug_light_filmstrip_scenario_20261112.mjs`, both only self-referencing in
their usage comment), 26 kept as history.** The kept ones are still broken (they
wait on `svg.tv__rails`); nothing runs them.

## Remaining grep hits (`tv__rails|dagDrawing|leaderGeometry|respineX|rowPositions`, apps/scripts/tests)

- `apps/viewer/tests.js:6577`, `:12905`: assert `svg.tv__rails` count is 0.
- `scripts/run_viewer_browser_tests.mjs:1643, 3259, 3343, 3612, 3613, 3647`:
  the same absence assertions (3613 also asserts the `dagDrawing` key is not
  stored).
- `scripts/mutation_witnesses/browser__real-a-reload-draws-the-map-again-and-nothing-remembers__33e5022f.json`:
  its mutation writes the `dagDrawing` key, to prove that guard catches it.
- `scripts/guard_enumeration.mjs:289`: a history comment naming a renamed
  `rowPositions` guard.
- `tests/debug_*.mjs`: the 26 kept probes.

Wider shape (`rail__`, `railY`) leftovers are filed:
`docs/issues/ISSUE_20261118_rails_era_comments_and_assertions_remain_after_the_residue_sweep.md`.

## Verified

- `venv-win/Scripts/python.exe -m pytest -q`, run from this worktree with the
  main checkout's interpreter: **1 failed, 2116 passed, 1 skipped, 4
  deselected, 582 s (9m42s), inside the 10 min budget. The one
  failure is `test_viewer_js_suite_is_green`, red by design in a worktree (the
  viewer's node-fs tier has no `data/projections/` here).
- `node apps/viewer/run_tests.cjs`: 501/501, node-fs tier skipped (same
  reason). `node apps/annotate/run_tests.cjs`: 324/324.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 501/502; the
  one fail is the provenance gate, "projection built from `1f8c6381b735`, input
  `tolerance_stack/topology.py` differs in this tree", because I edited two
  comments in that file. Rebuild the projections
  (`scripts/rebuild_projections.ps1`) before the review's node runs, and the
  [real] tier will run.
- Not run: the browser tier (no browser suite file changed: only
  `scripts/filmstrip.mjs` and `tests/debug_*.mjs` among test-like files) and
  the witness runner (no spec added or changed; no spec names a deleted
  helper, grep).

## Decisions not in the handoff

- `mapProbe` filters the ghost drawing out, as `bandProbe` did.
- The cut of `--rail-even/odd/dim` and `--leader-ink` went beyond the issue's
  list, on the "whole class" rule: no reader anywhere in `apps/`, `scripts/`,
  `tests/`.
