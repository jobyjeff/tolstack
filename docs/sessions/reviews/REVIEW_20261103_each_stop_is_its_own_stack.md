---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_each_stop_is_its_own_stack.md
reviewer: agent (review/each_stop_is_its_own_stack)
date: 2026-11-03
verdict: APPROVE
blockers: 0
---

# Review — each_stop_is_its_own_stack

**Verdict: APPROVE.** No blockers. The fold, loader, projection, chart and
readouts do what the handoff asks. The numbers re-derive by hand and from a
fresh build of the merged tree. The deviations from the handoff's model are
physically right and recorded in the lesson. One of them (where the piston
heads enter) was put to Jeff, who ruled on it in-session.

Branch state on arrival: `handoff/each_stop_is_its_own_stack` was not
contained in `integration`. There was no prior review commit on this branch,
and the lesson arrived as `A`, not `M`.

## What I verified

- **The model, against the handoff's items 1–7.**
  - `datum.stop` now only sets where the driver is 0, and the rigging
    sentence is in `datum.note` and in DAG_TOPOLOGY.
  - Every stop names an `axial_stack`. A bare stop is refused.
  - `applies_to`, and a driver `study_ref` among `contributors`, are refused
    with `STOP_STACK_HANDOFF` in the message.
  - `fold_at_stop` is `fold_at` at the stop plus the stack leaves at `|J|`
    times their ratio, through the one `fold()`. The reach checks (`bound`,
    `CHECK_BOUNDS`) and the RSS margin go through the same `fold()`. No
    second combiner was added.
  - The ±0.5 S461-607 checks are gone, and the issue was filed (`type: bug`,
    `audience: strategy`, `found_by:` this handoff).
  - The projection has no `x_interval`. The chart draws no wedge past the
    sweep.
- **Citations (mandatory check 1).** Each of the three new edges cites a
  drawing with its sha256 and run:
  - `piston_body_shoulder_to_top`: 5.00 ±0.05, `traced`.
  - `piston_body_flange_to_top`: 113.67 with the sheet's X.XX ±0.10 block,
    `inferred`, the same derivation as the existing general-tolerance rows.
  - `piston_head_lower_face_flatness`: ⏥0.05 read as ±w/2, `inferred`, per
    the SOP's "What a term cites when its drawing does not band it".

  The blade-root anchor stays a declared gap on both stops, and both reach
  checks stay `complete: false` with their excluded terms listed.
- **The lesson's arithmetic, re-derived by hand.** Every row matches:
  - **Feather stack:** 0.375 mm × 1.249 = 0.468°, RSS 0.182 mm → 0.227°.
  - **Low stack:** 1.195 mm × 1.728 = 2.065°. The travel's four terms are
    0.432, 0.086, 0.864 and 0.035.
  - **Stop totals:** 0.290 + 2.065 = 2.355 at −7°. 0.315 + 0.468 ≈ 0.784 at
    +72°, RSS √(0.169² + 0.227²) = 0.283.
  - **Margins:** −5 − (−6.992 + 2.355) = −0.363 (RSS +0.958). 72.001 − 0.784
    − 70 = +1.217 (RSS +1.718).
  - **Range residual:** 0.375 × (1.728 − 1.249) = 0.180, plus 0.134 from the
    linkage, gives ±0.313. Adding the travel's 1.417 gives ±1.730.
  - **J-variation table:** 4.0 % and 0.042° at −7°, 0.4 % and 0.0009° at +72°.

  The scratch build of the merged tree printed the same stop figures.
- **The value pins** are in `tests/test_kinematic.py`: the per-stop table at
  ~471–493, the range at ~595–604, and the `applies_to` refusal at ~1136.
- **Physics of the deviations.**
  - **Heads at the low stop.** The lower head's lower face is coplanar with
    the body's shoulder, so at the feather contact the head thicknesses are
    not between the mount and the plate.
  - **Low stack = feather study + travel study.** The plate at the low stop
    is the plate at the feather stop plus the travel. That is the same sum a
    separate low-stop chain would give, and in this graph that chain would
    loop back through `endstop_feather_contact`.
  - **`gas_spring_mount_position` left out of the chain.** It is a stub, and
    its own citation says the controlled feature is not establishable.
  - **Linkage terms counted as shared in the range.** They are the same
    parts of the same build.

  All four are sound and explained in the lesson.

## Merge resolution (reportable: it changes what the green proves)

`integration` had moved to include the slide re-author
(`the_slide_joint_is_the_mounts_bushings_against_the_piston_body`, `b4b641db`).
That change added 2 interfaces and 1 edge to the same topology, so five files
conflicted. Every conflict was a layout or graph-count pin that each side had
re-derived for its own edit:

- the topology's graph note and DAG_TOPOLOGY's graph sentence;
- the README `layout_crossings` claim;
- `test_the_product_models_crossings_and_width_are_pinned`;
- `tests.js` rows/columns.

The merged graph matches neither side, so **I took neither side**. I
re-derived each value from the merged topology:

| pin | merged value |
|---|---|
| graph sentence | 35 parts, 79 interfaces, 99 edges, 24 branch points, 25 grounded loops |
| crossings | 16/70/50 on 14 columns |
| layout rows | 178 |

The values come from `_COUNTABLES` and from `B.layout_crossings(B.serialize_topology(...))`.

One pin conflicted semantically without a textual conflict: the browser
tier's dimmed-edge count, `run_viewer_browser_tests.mjs` ~11144/11222. It is
now 77 (99 edges less 22 lit), up from the handoff's 76. That is commit
`43cdbc66`. The lesson's layout section quotes its own branch's numbers,
which were right for that tree.

## Tests run

Every data tier ran against a scratch root at `%TEMP%\tsesis`. It has
read-only junctions to `data/inbox`, `data/meshes`, `venv-win`,
`node_modules` and four non-viewer projection dirs. Its `docs` is junctioned
to this worktree. Topology, viewer, crops and kinematic projections were
built there from the merged tree **before** the tiers. Shared `data/` was
not touched.

- **Pre-merge risky subset:** `pytest tests/test_kinematic.py
  tests/test_topology_projection.py tests/test_topology.py
  tests/test_claims_registry.py tests/test_js_vocabulary_is_generated.py`
  → **400 passed**. This ran on the merged tree right after resolution.
- **Viewer fast tier:** `node apps/viewer/run_tests.cjs --repo <scratch>`
  → **623/629**. All six failures are **inherited from `integration`**. A
  scratch build of `integration` alone (`d9eb2196`, archived into a
  throwaway git snapshot) fails the same six, also 623/629. The six are
  four layout pins the slide change never re-pinned, the
  `pitch_plate_pilot_in_piston_id` part-incidence error, and the
  topology-fixture `face` drift. They are filed as
  `docs/issues/ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`
  (high), with both trees' values. Not this handoff's (file-don't-fix). The
  handoff's own branch was 629/629 against its base.
- **Browser, kinematic only:** `node scripts/run_viewer_browser_tests.mjs
  --repo <scratch> --only kinematic` → 21/23, then **23/23** after the
  77-dimmed re-pin.
- **Annotate:** `node apps/annotate/run_tests.cjs` → **269/269**.
- **Mutation witnesses, post-merge:** `node
  scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since
  integration`, 574 s, exit 1. It reached **40/40** entries and **16
  witnessed**: all 8 `python__` and 8 of 9 `browser__`.
  - **23 `fast__` entries not witnessed.** Every one is `NOT WITNESSED (the
    tier was red before the mutation)`, because the fast tier carries the
    six inherited `integration` reds. The handoff's own new fast guards are
    among them. The tactical run on its own base witnessed them (38/42 with
    every miss explained). No review can re-witness them on `integration`
    until the inherited issue is fixed, which is why that issue is `high`.
  - **`fb0d661d` red before mutation.** Its nav-chip sub-check is red on
    `integration`'s own code, per the tactical record and the addendum on
    `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`.
- **Post-merge full suite (review worktree):** **2 failed, 1722 passed, 1
  skipped, 2 deselected, 340 s**.
  - `test_viewer_js_suite_is_green` fails as the deliberate worktree red. Its
    tier ran green through `--repo` above, apart from the inherited six.
  - `test_contact_suggestions::test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge`
    fails because it pairs this tree with the main checkout's projection.
    That is already filed as
    `ISSUE_20261103_the_contact_suggestions_real_test_pairs_this_tree_with_a_projection_built_from_another.md`.
  - The skip is `test_fit_bound_features.py:424`, a data-state skip.
  - This repo's conftest prints no `concurrent pytest processes` or
    `full-suite lock` header lines.
  - Nothing was written under the main checkout's `data/` (outside
    `data/scratch/`), and its `git status` is clean.

**Tactical record:** a full suite in the worktree, 1710 passed, 1 failed
(the deliberate worktree `test_viewer_js_suite` red), 1 skipped, 521 s. Its
counts include the diff's new tests. Benefit of the doubt given.

## Findings

**Blockers:** none.

**Should-fix:** none in the handoff's scope.

**Nits (not filed):**

- `range_between_stops` keys its weights on `child.sub.edge`. If one edge
  appeared in both a point group and a stack group at the same stop, the
  second write would overwrite the first, while `fold_at_stop` would count
  both. No live study triggers it today, because no non-driver `study_ref`
  shares an edge with a stack leaf. Summing, or refusing the collision,
  would make the range and the stop fold agree by construction.
- The low stop composes the feather study and the travel study, so the
  lower head's flatness term (±0.025 mm, 0.043° at −7°) enters the low stop
  too. At the low contact the mount is not touching that face. It is
  conservative and negligible, but worth a sentence if the low stack is ever
  authored as its own chain.

**Design (filed, non-blocking):**
`docs/issues/ISSUE_20261103_design_the_stop_error_bars_sit_on_the_plot_frame.md`
(low). Both stops are the sweep's end points, so their error bars sit on the
plot's frame lines, and the verdict rows wrap their stop labels at rest
width.

## Overlay

- Third sighting added to the "A builder field added with the `[real]` fast
  tier skipped" entry. It now includes the recipe for building
  `integration` alone to tell an inherited red from a merge's.
- New entry: a layout or graph-count pin in a merge conflict is re-derived
  from the merged topology, never taken from a side.
