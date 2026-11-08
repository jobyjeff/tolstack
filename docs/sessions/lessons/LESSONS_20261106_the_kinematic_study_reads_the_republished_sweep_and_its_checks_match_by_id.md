# Lessons — the kinematic study reads the republished sweep, and its checks match by id

## What changed
- Study `sweep.run_id` and its provenance sentence: `vpa-pitch-p2-20261016-235852` -> `vpa-pitch-p2-20261105-204957`.
- `tests/test_topology.py` `SWEPT_JOINT_EDGES`: `plate_slide` -> `pitch_plate_slide_bushings_to_piston_body`.
- Pins moved: `SWEEP_RAIL_RUN` and its mutation spec, `run_browser_check.mjs`, `run_tests.cjs` `P2_FILE`, `apps/viewer/tests.js` URL fixtures, `tests/test_kinematic.py`, `tests/debug_slide_joint_shots.mjs`. (The `linkage/data/runs/...20261016...` csv path comment in `tests.js` is a historical sheet and stays.)
- The two red browser checks read the edge name from the projection by id (`edgeName(id)`), not prose.
- `apps/annotate/run_tests.cjs`: the P2 joint-merge check also needed updating. On the new run the slide's own edge has solver features at both ends, so P2 has TWO merged joints (spindle pair stays, bushing/piston pair is new) and five measured edges, not four.

## The `cylindrical_slide` call
Linkage recommended dropping `cylindrical_slide` from `hub_to_pitch_plate_spindle_coaxiality`. **Not done: the tree depends on it.** `AXIS_INTERFACES = ("cylindrical_slide",)` in `tolerance_stack/interface_contact.py` makes that word the switch that judges an edge as axes; `tests/test_contact_suggestions.py::test_real_the_hub_and_pitch_plate_coaxiality_is_judged_as_axes` pins `axes is True` for it, and the browser/annotate suites drive that edge as the gap-edge example. Both edges therefore still carry the word. Making only one claim "slide" needs a separate interface word for an axis comparison (a design call, filed below).

## Gotchas
- A worktree cannot run the viewer node tier's `[real]` checks or the browser tier from its own stamped projections: `scripts/rebuild_projections.ps1` only runs from the main checkout and from main's tree. I ran each builder from the worktree with `--data-root C:/workspace/tolstack/data` **after committing** (a dirty-tree stamp makes the node-fs tier refuse), and made a temporary `node_modules` junction to the main checkout for the browser runner (removed). The main checkout's projections are now stamped with this branch; the next main-checkout rebuild restores master's.
- tolstack's pytest has no xdist (`-n` is rejected); the default tier is single-process, 395 s.
- Screenshot: `shots/the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id/rail.png` — the deep link boots the sweep pane on the 2026-11-05 20:50 run. The joint rows themselves sit below the fold and I did not capture them; the plate slide's ends are asserted by the annotate check above, not by the picture.

## Verification record
- Default tier, this worktree: `venv-win/Scripts/python.exe -m pytest -q` -> 1737 passed, 1 failed, 1 skipped, 395 s. The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` (worktree has no projections: the documented deliberate red); the same tiers it covers were run directly below.
- Viewer node tier `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 666/666. Annotate `node apps/annotate/run_tests.cjs --repo ...`: 295/295.
- Browser tier `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (from the worktree, projections rebuilt from the committed tree first): 43/43, 27m53s. The kinematic study page suite is 27/27.
- Witness gate `--changed-since master --repo C:/workspace/tolstack`: 10/10 witnessed, 15m17s, none left to the sweep.

## Follow-up
Filed: `docs/issues/ISSUE_20261107_one_edge_only_should_claim_the_plate_slide_interface.md`.
