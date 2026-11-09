---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
blockers: 0
---

# Review: the_end_stop_model_names_its_datums_right_and_folds_its_riders

The work is on `handoff/…` at `08af7c39`. It was not already in `integration`
(containment checked). `integration` had not moved since the branch was cut
(`d9062b2d`), so the merge was a fast-forward with no conflicts.

## What I verified

**Deliverables against the data.**

1. **Riders folded.** `bodies[]` now reads `base, tan_link, pitch_plate,
   pitch_link, blade`, and no body has `rides_with`. The members are:
   - `base`: hub, tan-link mount, gas-spring mount, cover;
   - `pitch_plate`: plate, piston, lower head, upper head.

   The linkage pairing test's v2 declaration was extended exactly as the
   handoff asked. v1's rider test is now v1-only, and a new v2 test pins the
   fold.
2. **Body order and walk.** v2 declares a new topology field,
   `walk_order: "authored"`. The vocabulary is `WALK_ORDERS`, a module
   constant. It is paired against `DAG_TOPOLOGY.md` through
   `_DOC_VOCABULARIES` and refused when invalid. v1 is untouched, and the
   lesson's `--dump-v1` comparison shows it byte-identical. The design choice
   (a declared field rather than a changed default) is justified by
   measurement, and `test_the_authored_walk_is_not_the_product_models` pins
   that measurement. The handoff allowed a field where one was needed.
3. **Renames.** All seven are as specified, and no id changed. I diffed the
   JSON id sets: the only changes are the removed edge and the new
   nodes/edges. `test_no_name_on_model_v2_says_spindle` scans every
   name/title/description/note in v2.
4. **Phantom edge.** `hub_to_pitch_plate_spindle_coaxiality` is gone from v2,
   and both of its nodes remain. v1 is unchanged.
5. **Compound datum.**
   - Pilot bore node.
   - A `pin_in_bore` gap from `hub_spindle_bore_axis`.
   - The pilot-to-bore structural edge.
   - A clocking node on both parts, following v1's
     `pitch_arm_blade_root_clocking` precedent. The lesson correctly argues
     that no new interface word is needed: `interface` is gap-only.

   None of the new edges carries a dimension, and every edge's note says
   "What would close it". The gas-spring mount was left alone, as told.
6. **Docs.** The "Models" row, the "Bodies" ordering bullet and the rider
   sentence are all present. I recounted the graph numbers in
   `DAG_TOPOLOGY.md` from the loaded topology and they are exact: 15 parts,
   25 interfaces, 30 edges, 7 branch points, 8 gap edges, 6 loops
   (E − V + 1).

**Screenshots, looked at by me.** In `2_v2_dag_2560_full.png` the grid reads,
top to bottom:

1. the hub's rows;
2. the hub-boss-in-pilot gap row;
3. the tan-link mount (pilot→bore, seat→bore, fasteners→bore);
4. the gas-spring mount;
5. the cover;
6. the tangential link;
7. plate, piston, lower head, upper head;
8. the pitch link;
9. pitch arm, blade root;
10. the two closing edges.

Each body is one container, and no row says "spindle". The nav's stack
titles "Main spindle bearing seats" are a different artifact, and correctly
named.

**Guards observed failing** (scratch mutations, restored afterwards):

- Putting "spindle" into v2's base note turns `test_no_name_on_model_v2_says_spindle`
  red, naming the path.
- Swapping two `base.parts` entries turns `test_model_v2_reads_in_its_authored_body_and_part_order`
  red, naming `base`. This mutation also produced should-fix 1 below.

**Tolerance-stack mandatory checks 1–7.** These do not apply. The diff adds
no element values, bands, signs, LMC/MMC, RSS or hardware. Every v2 edge is
dimensionless and studyless, so the traced ratio is unchanged: 0 values on
v2. Titles: the v2 body names are noun phrases, and the ids did not move.

## Tests

The tactical record is complete. It shows a worktree full suite of 1891
passed / 1 skipped, the viewer tier at 672/672 against a scratch root built
from the tree, annotate at 303/303, and the browser tier at 42/43. The one
browser failure is red on the baseline too and was filed. The record is
consistent with the diff, so I extended the benefit of the doubt.

- **Pre-landing risky subset**, on the merged tree, in the review worktree:
  `pytest -q tests/test_topology.py tests/test_topology_projection.py tests/test_viewer_projection.py tests/test_tolerance_stack.py tests/test_architecture_inventory.py tests/test_claims_registry.py tests/test_provenance.py tests/test_js_vocabulary_is_generated.py tests/test_mutation_witnesses.py`
  gave **620 passed**.
- **Viewer `[real]` tier**: `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/review_end_stop`
  gave **672/672**. The scratch root copies the tactical's projections, which
  were built from `48274f9f`. That commit has the same inputs as the merged
  tip, because the later commits are only README/comment figures, issues and
  the lesson. The scratch root also copies `inbox`, `meshes` and `docs`.
- **Mutation witnesses**: `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  reported **0 of 847 reachable**, which matches the tactical. One
  `build_topology_projection.py` entry is more than 30 lines from every hunk;
  it covers the studies code, not `serialize_topology`. That entry is left to
  the sweep.
- **Post-merge full suite**, in the review worktree:
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave **1 failed, 1890 passed, 1 skipped, 2 deselected** in 404 s
  (recorded: inside budget). The one failure is `test_viewer_js_suite.py`,
  which is red in a worktree by design. The tier it stands for is green
  above. This repo's conftest prints no contention header lines. The main
  checkout's `git status` and `data/` were unchanged afterwards.
- **Not re-run by me**:
  - The browser TRUTH tier, because the `apps/` diff is figures in a README
    and a comment. The tactical's 42/43 run's one red is pre-existing (filed).
  - `apps/annotate/run_tests.cjs`.
  - **The main checkout's shared projections have NOT been rebuilt.** That is
    the post-merge `scripts/rebuild_projections.ps1` in the main checkout,
    which is the batch merge's step, or the next session's.

## Findings

### Should-fix

1. **`walk_order: "authored"` only breaks ties, so re-ordering `parts` does
   not always re-order the page.**
   - Location: `scripts/build_topology_projection.py::serialize_topology`.
     The overstated sentence is in `docs/DAG_TOPOLOGY.md`, "Bodies on the
     DAG": "so the author re-orders the page by re-ordering `bodies[]` and
     `parts`".
   - Measurement: swapping the gas-spring mount ahead of the tan-link mount
     draws hub → gas-spring mount → cover → tan-link mount, because the
     depth-first walk continues into the cover.
   - Impact: today's order renders correctly, so the demo is unaffected. The
     handoff's "Jeff can re-order by editing it" holds only for orders that
     fit the walk.
   - Filed as
     `docs/issues/ISSUE_20261108_the_authored_walk_order_is_a_tie_break_so_reordering_parts_does_not_reorder_the_page.md`
     (med, `audience: strategy`, with options).

2. **The 3D pane: the piston heads stand still in the P2 sweep on v2.** This
   DoD bullet was not met, and the lesson says so plainly. The cause is in
   `apps/annotate/`, which this handoff fenced out. It is filed code-red as
   `ISSUE_20261108_the_sweep_leaves_model_v2s_folded_piston_heads_standing_still.md`,
   with a concrete fix and a v1 caveat. The staged
   `the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
   depends on this handoff and owns `apps/annotate/`. Its DoD looks at "both
   heads" at rest and mid-sweep, so it will meet this. Until it lands,
   integration's v2 sweep shows the heads static. That is the "correct but
   incomplete" trade the handoff named.

### Nits

- `found_by:` on the three new issues names the staged path
  (`docs/sessions/HANDOFF_…`); the handoff now lives in `active/`. That is
  the conventional form and was left as is.
- `apps/` was touched despite the fence, for figures only: README counts and
  a comment in `views/topology.js`. The lesson discloses it and the `[real]`
  tier requires it. There is a mild merge-conflict risk with the viewer
  sibling, nothing more.

### Inline fixes

None.

## Lesson audit

I re-derived the lesson's graph counts, the rename table (against the JSON)
and the new-edge table, and all of them hold. Its v1 byte-identity claim is
backed by `test_the_authored_walk_is_not_the_product_models` and the
serializer pins. I did not re-measure its crossing figures
(28/24/23, 3 → 11–12). The `[real]` tier pairs the README's copies of those
figures, and that tier is green.

## Overlay

I added one Recurring-bugs entry: "a claim that authored order drives the
layout, when the order only breaks ties", with the permute-the-list check.

## Verdict

**APPROVE.** The work lands on `integration` by fast-forward.
