# Lessons -- the_viewer_real_tier_follows_the_slide_re_author (2026-11-04)

Reproduced all six reds on a projection built from this branch's tree (629/635).
Now 635/635.

## Per red: pin-stale vs product-wrong

| # | Red | Verdict | Evidence / moving commit |
|---|-----|---------|--------------------------|
| 1 | grouping: 63 !== 62 leaders | pin stale | `b4b641db` re-authored the slide (two nodes, an edge net, a longer walk). Leaders 62 -> 63 and groups 73 -> 74; run counts and gap groups did not move. Only the README's crossings were updated at the time. |
| 2 | bands: 64 !== 63 | pin stale | same commit; the band string re-measured row for row (ends at row 99). |
| 3 | README before-total 223 !== 219 | README stale | `b4b641db` updated only the `layout_crossings` claim; then the before-total, max jog, pane width, gridOffset and the rail/column counts each failed in turn (one number per run: the test stops at the first). |
| 4 | forks 25 !== 24 | pin stale | `b4b641db` re-pointed `gas_spring_installed_length` to the flange and dropped the mount-bushing-bore node from the gas spring's fork; the topology document's own graph note already said 24. |
| 5 | `pitch_plate_pilot_in_piston_id` declares a part no edge carries | **product wrong** (authoring) | Node was a 2-part mating surface; its only edge, `piston_body_id_datum_to_od`, is the piston's. Guard untouched. |
| 6 | fixture shape | fixture stale | builder gained node `face` and `hardware_ref` in `b4b641db`. |

Also moved, with their pins: 36 -> 37 of 77 -> 79 nodes answering differently hovered
and clicked (README and the comment in `views/topology.js`), membership count 28 -> 29.

## Decision on red 5 (the one that was not a number)

I first added a plate-carried structural edge `pitch_plate_boss_axis_to_pilot`. It kept
the node a mating surface, but it closed a loop: the product layout's close crossings
went 70 -> 89 and branch 16 -> 20 (five Python pins red, and the viewer pins moved
further), so I reverted it (`0bbfc1db` and `8cb62dbb` are the reverted attempt;
`c511273a` is the fix kept) and took the handoff's other option: the node declares the
piston alone, a datum feature with its face on the piston. The plate's side of the
pilot was already its own bound node (`pitch_plate_spindle_bore_axis`, a boss, face on
the plate), so no binding is lost; the unauthored plate-to-piston pilot clearance is
filed (`ISSUE_20261104_the_pitch_plates_side_of_its_pilot_in_the_piston_id_is_not_authored.md`).
One Python test pinned the old two-part form (`tests/test_topology.py`) and moved with it.

## Red 6 and the class

The fixture cannot be regenerated: its header says the demo documents are gone, so
hand-patching an honest null is the practice. I patched `face: null` /
`hardware_ref: null` on the six projected nodes and added a header entry. Can the
builder change that adds a key regenerate the fixture in the same change? Not as
things stand. A builder-side test that the fixture carries every key would move the
red into the default tier; filed
(`ISSUE_20261104_a_builder_key_added_to_the_topology_projection_does_not_regenerate_the_viewer_fixture.md`).

## Gotchas

- The README-pairing test stops at the first mismatch, so a stale README costs one
  `run_tests.cjs` run per number (about 22 s each).
- `python -` with no heredoc hangs the Bash tool; use a script file.
- A heredoc containing an unbalanced `'` inside a `sed` line in the same Bash call
  fails the whole call before anything runs.

## Verified

- Worktree, projections rebuilt from the committed tree (`dirty=False`):
  `node apps/viewer/run_tests.cjs --repo <worktree>` 635/635;
  `node apps/annotate/run_tests.cjs` 280/280.
- `venv-win/Scripts/python.exe -m pytest -q` (worktree, bridged inputs): 1724 passed, 1 skipped,
  2 deselected, 8m47s (inside the 10 min default budget; recorded). The bridged worktree
  let `tests/test_viewer_js_suite.py` run green.
- The browser TRUTH tier was not run (the diff touches `apps/viewer/tests.js`, README
  and one view comment; its two reds are the staged `the_browser_tier_reds_left_after_the_slide_re_author`).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  --changed-since integration`: 0 of 729 entries reached by the diff.
