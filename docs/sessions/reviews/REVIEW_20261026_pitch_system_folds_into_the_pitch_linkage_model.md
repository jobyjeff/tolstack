---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
reviewer: agent
date: 2026-10-26
verdict: REQUEST CHANGES
blockers: 1
---

# Review — pitch_system_folds_into_the_pitch_linkage_model

Branch `handoff/pitch_system_folds_into_the_pitch_linkage_model` (tip
`b957450`, 12 commits), merged into `review/…` as `38b9599`. **Not landed on
`integration`.** It was not merged before this review: `merge-base
--is-ancestor` said no.

The modelling work is good and I checked it independently. One DoD tier is
reliably red because of this change, and the lesson calls that red a load
flake. That is the one blocker.

## What I verified (independently, not from the lesson)

- **The fold moves ids, never values.** I built every study from `integration`'s
  `docs/topologies/` (pre-fold) and from the merge, using the same code.
  `summarize()` intervals and every `check_study()` verdict and margin are
  identical. Only two things change. The four studies that cross the pitch link
  gain two terms and two open terms (10→12 / 8→10 and 8→10 / 6→8), from the
  zero-band joint placeholders. Seven studies change `topology:`. The kinematic
  study is identical to six decimals: margins 0.209776 at −7° and 0.184607 at
  +72°. Each contributor gains `body`.
- **Linkage's ids did not move.** All 60 `geometry.features[]` node ids in
  `data/inbox/linkage-sweeps/vpa-pitch-p2-20261016-235852.json` resolve in
  the merged topology. Only three pre-existing linkage edges changed:
  `pitch_link_length` (dimension, properties, note), the two joint gaps
  (dimension, note), plus the `revision` on `gas_spring_mount_213668_002`.
  Each change is the one the lesson's collision table describes. linkage's
  `vpa.py` reads `pitch_link_length` by id only (`JOINT_FEATURES`), so moving
  the length nominal into `properties` cannot reach it.
- **`bodies[]`** equals `linkage/vpa.py`'s `BODY_PARTS` + `LINK_PARTS`, except
  for the declared tan-link bearings. The "every part in exactly one body"
  rule makes that difference unavoidable, and both the doc and the test say so.
- **Lesson counts were re-derived from the file.** Parts 20, nodes 47, edges
  59, gap edges 13, branch points 19, cycle rank 13 (59 − 47 + 1), bodies 13,
  topologies 5, studies on the model 8 chain + 1 kinematic. The author's
  correction of the DoD's "nine chain studies" to eight is right (7 + 1).
  "Handoff said three exemptions; it was two" is right: `integration`'s pin
  lists two.
- **The joint placeholders and the four new `no_drawing_governs`
  exemptions** are honest. They are `assumed`/`untraced`, counted as open
  terms, and each note says why. The two "exemption made by the fold, not a
  finding" notes say exactly that, and the 10-22 issue carries the addendum.
- **Guard changes.** The one-nominal guard lost its corpus subject. It now
  rebuilds the 2026-09-30 pair in memory as its non-vacuity witness, and a
  second test checks that the corpus half reads `properties`. The per-document
  qualifier became a named SKIP, filed. The variation-only `[real]` check is
  now scoped to `provenance.pitch_system_ids` (24 edges). It does not hold
  the old uniform-height pin, and a mixed graph cannot satisfy that pin
  anyway. The kinematic pins were already stale before this branch: my
  pre-fold build of `integration` gives 0.210/0.185 against the old
  0.256/0.258 pins. The lesson's claim holds.
- **Issues filed** by the branch have frontmatter in grammar and `found_by:`
  pointing at the handoff.

## Merge conflict resolved (carve-out)

`scripts/guard_enumeration.mjs` `DECLARED_GUARDS`. `integration` had raised
annotate to 220 and browser to 605/572 (`the_rail_and_the_scene_point_at_each_other`).
The handoff had re-hashed fast and browser names at unchanged counts. Neither
side's numbers are right for the merge, so I re-derived them with
`node scripts/guard_enumeration.mjs --json`:

- fast: 551, digest `6a3b0abb5fff` (the handoff's)
- annotate: 220 / `eccbf1e1003a` (integration's)
- browser: 605/572 (integration's counts; the handoff's delta is 0), digest
  `f0775be1d6ab` (new)

`pytest tests/test_mutation_witnesses.py`: 28 passed. No conflict markers.

## Tests

The tactical run is recorded: worktree `pytest -q`, 1 failed
(`test_viewer_js_suite`, the documented worktree red), 1551 passed,
1 skipped, 558s. The benefit of the doubt applies.

**Pre-merge risky subset (worktree, merged tree):** `pytest -q` over
`test_topology`, `test_topology_projection`, `test_tolerance_stack`,
`test_kinematic`, `test_general_note_band`, `test_fit_bound_features`,
`test_topology_prose_for_a_reader`, `test_viewer_projection`,
`test_architecture_inventory`, `test_claims_registry`, `test_provenance`,
`test_thermal_exception_list`, `test_js_python_vocabulary`,
`test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`,
`test_part_mesh_aliases`, `test_feature_identity`: **957 passed, 1 skipped**,
70s.

**`[real]` tiers, armed against the merge.** All five projections were built
from `38b9599` into `C:\workspace\tolstack\data\scratch\rv_fold\root`
(inbox, meshes and non-viewer projections copied; `docs/` copied; `venv-win`
and `node_modules` junctioned). Meshes were confirmed installed.

- `node apps/viewer/run_tests.cjs --repo <root>`: **550/550**, plus one named
  SKIP (the per-document qualifier, filed by the author).
- `node apps/annotate/run_tests.cjs`: **220/220**. Its `[real]` checks fall
  back to the main checkout's projection, which was built from `master`.
- `node scripts/run_viewer_browser_tests.mjs --repo <root>`: **29/31**. The
  two failures are below.

Not run, because the verdict is REQUEST CHANGES and nothing landed: the
post-merge full `pytest -q` and the mutation tier `--full`.

## Findings

### Blocker 1 — `topology file:// respine` is reliably red on the folded graph

`scripts/run_viewer_browser_tests.mjs`, the respine suite's `catchFrame()`
checks. I ran the same suite against projections built from each tree, on a
box at 16% CPU:

| tree | runs | result |
| --- | --- | --- |
| `integration` @ `e4a42d1` | 2 (`--only`) | 40/40, 40/40 |
| merge @ `38b9599` | 1 full + 3 `--only` | 39/40, 39/40, 39/40, 37/40 |

The handoff tip and the merge do not differ in `apps/viewer/`,
`docs/topologies/`, `tolerance_stack/`, the topology builder or the respine
suite. The sibling only touched the annotate suite. So the fold caused this.
The author's own issue records full runs at 40/40, 39/40, 34/38 and 38/40.

The lesson ("two flake on frame timing under load: an `--only` re-run on the
same tree gave 40/40") and
`ISSUE_20261026_respine_and_refit_browser_checks_miss_their_frame_under_load.md`
("wall-clock races, not regressions") describe a red that is now the normal
outcome as an occasional one. The DoD asks for this tier green. Landing it
would make `integration`'s browser tier red for every later review, and the
mutation tier's respine witnesses cannot be witnessed against a red clean run.

**Suggested fix (inside the handoff's scope; no `apps/` edit):** the issue
suggests a duration knob, and it already exists. `VA.RESPINE` is a plain
object (`apps/viewer/topology.js:1490`, `{ duration: 260 }`), so the respine
suite can widen it from the runner before it clicks
(`page.evaluate(() => { ViewerApp.RESPINE.duration = 1500; })`). Then
`catchFrame()`'s 3s sampler has room for a 106-row frame. Measure it the way
this table did: same suite, both trees, several runs. Then correct the lesson
and the issue: either close the issue with the fix, or narrow it to what is
left (the `[mock]` re-fit check).

This is a send-back rather than an inline fix because it changes test
behaviour and needs repeated runs to trust. That fails the inline-fix
boundary's second prong.

### Not this handoff: the rail's gap-badge checks are red on `integration` too

`annotate rail and scene` is 20/22 on the merge and on `integration` alone.
Its two `[real] … gap badge opens a popup …` checks expect `tan_link_length`
and `pitch_plate_tan_link_attach_radius` to be gap rows.
`the_tangential_link_cites_its_drawing` banded both rows. Only the main
checkout's stale projection (built 2026-10-23) still has them as gaps. Filed:
`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`
(high, because the next batch merge rebuilds projections and will hit it).
This is not counted against this handoff.

### Nits (no action required to approve)

- `docs/DAG_TOPOLOGY.md` "Bodies" says `Body` and the `Topology` constructor
  "refuse anything else, naming the part". A body with no `name` instead
  fails in `Body.from_dict` with a bare `TypeError` that names neither the
  body nor the topology. Worth a line if the rework touches `topology.py`.
- `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` and
  `AUDIT_20260915_full_pass.md` still cite
  `docs/topologies/topology_pitch_system.json` by path. These are dated
  narrative, so it is acceptable, but the path is now a dead link. A
  one-clause "(folded 2026-10-26)" would help.

## For the rework

Fix blocker 1 and re-run the browser tier against a projection built from the
rework's tree. Record per-run counts and say which tree each count came from.
Expect `annotate rail and scene` 20/22 until the filed issue is fixed. Do not
treat that as yours. This review's scratch roots
(`data/scratch/rv_fold/`) are deleted. The author's
`data/scratch/pitch_merge/` is left for the rework.
