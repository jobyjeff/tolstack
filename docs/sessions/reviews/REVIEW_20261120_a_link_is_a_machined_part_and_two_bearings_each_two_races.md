---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_a_link_is_a_machined_part_and_two_bearings_each_two_races.md
reviewer: agent
date: 2026-11-20
verdict: APPROVE
blockers: 0
---

# Review — a_link_is_a_machined_part_and_two_bearings_each_two_races

Branch `handoff/a_link_is_a_machined_part_and_two_bearings_each_two_races`
(tip `9f6c299b`, 12 commits on `integration` `1ba5132a`). `integration` had not
moved, so the merge (`602cc60c`) had no conflict. This is the first review of
this slug: the review branch had no earlier attempt. The lesson and the new
issue arrive as `A`; the two issues it changes arrive as `M` addenda, with
their earlier text kept.

## What was verified

**Provenance (checklist 1).** No edge carries a value: every new edge's note
says which datasheet or drawing would close it. So this is a model change, not
a stack, and the traced ratio does not move. The facts the parts state were
re-derived from the meshes rather than taken from the lesson:

- `asm217755_MS14101_3_815597cb`'s manifest has 26 faces on solid 0 and 10 on
  solid 1. `feature_geometry.fit_face` gives solid 0 the cylinders r 7.141 and
  the sphere r 5.198 (outer race), and solid 1 the sphere r 5.147 and the
  cylinder r 2.41 (inner race), as the part notes and alias rows say.
- The provenance has two instances, `…/213862-002.1/MS14101-3.1` at (83.00,
  -44.55, -22.70) and `.2` at (84.97, -17.14, 79.67). They match the two
  bearings' declared occurrences.
- The part numbers 213861-002 and 213863-004 are each mesh's product, and the
  instance-name mismatch is on the lesson's question list, as item 1 asked.

**DoD, item by item.**

- v2 loads. Each gap edge's two ends are in different parts. Each ball joint
  is one `spherical` edge between an inner race and an outer race in two
  bodies. Each link body is exactly its machined part and two outer races,
  asserted by name (`MODEL_V2_BODIES`,
  `test_children_and_the_tree_order_of_model_v2`,
  `test_the_mechanism_bodies_are_linkages_own`). The linkage pairing was
  extended with `LINKAGE_PARTS_IN_NO_BODY_BY_TOPOLOGY`, which checks that each
  listed part is in no body and has a member in the named body. That
  tightens the pairing rather than loosening it.
- **The bindings and fits (item 6).** I rebuilt every projection from the
  merged tree into a scratch root, against an exact copy of Jeff's log. I
  first moved the tactical agent's test event `0101` out of the scratch copy.
  The rebuilt `fits.json` `fits`, `unresolved` and `built_from_events` arrays
  are JSON-identical to the shared `fits.json`: 21 fitted, 1 unresolved, and
  all four sphere centres unchanged. The real log is 100 events (101 files
  with the README) before and after.
- `feature_identity_key` has no collisions: over every v2 `(part, node)` the
  only keys that change are the four moved centres. They map to v1's
  `pitch_link` and `tan_link_212956_005`, as the doc says. No two v2 features
  share a key.
- Shots: all named shots are present. The tactical agent ran the
  click-around; I did not repeat it.
- The lesson's v1-id table, its questions for Jeff, its account of how a
  binding follows a moved feature, and what link 5 inherits are all present.
  Questions 3 and 4 are carried by
  `ISSUE_20261120_the_inner_races_at_the_pitch_arm_and_the_mount_sit_on_a_stand_in_for_hardware_nobody_has_authored.md`
  (`audience: strategy`, which is right: each question is a decision whose
  answer an agent then acts on, not a task for Jeff). That issue also points
  at questions 1, 2, 5 and 6.

**Lesson arithmetic.** I re-derived 31 parts, 68 interfaces, 88 edges and 29
gap edges (21 + 12 − 4), as well as 21 fitted / 1 unresolved and 3/3
mutations from two specs. Its "20 nodes" is 16 new nodes plus 4 moved ones,
and I corrected it with a blockquote. `DAG_TOPOLOGY.md`'s inventory line
agrees.

**Guards.** Two new guards, each with a spec, and both `find` lines are
present in the tree. `DECLARED_GUARDS.fast` was raised 617 → 618 together with
its spec. The tactical agent ran the witness runner on both (3/3 witnessed),
and the review gate runs below.

## Tests

- **Pre-merge risky subset** (diff rows: topology data, `tolerance_stack/`,
  `apps/viewer/`, `apps/annotate/`, map, guards, prose):
  `pytest -q tests/test_topology.py tests/test_model_view.py
  tests/test_topology_map.py tests/test_topology_projection.py
  tests/test_feature_identity.py tests/test_kinematic.py
  tests/test_tolerance_stack.py tests/test_viewer_projection.py
  tests/test_part_mesh_aliases.py tests/test_architecture_inventory.py
  tests/test_mutation_witnesses.py tests/test_js_python_vocabulary.py
  tests/test_viewer_readme_doc_facts.py tests/test_claims_registry.py
  tests/test_provenance.py`: **794 passed** (193 s).
- **Post-merge default tier**, in this worktree,
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  **2 failed, 2488 passed, 1 skipped, 4 deselected**, 492 s, inside budget
  (ledger row recorded). This repo's conftest prints no contention header
  lines. The two reds are the same as the tactical agent's:
  `test_viewer_js_suite_is_green` (a worktree has no `data/`; the tier ran
  through `--repo` below) and
  `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`
  (pre-existing, filed as
  `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`).
- **Viewer fast tier with `[real]`**, `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack/data/scratch/lnk`, against projections rebuilt from
  `f7b119dd`: **618/618**. (The first try was refused, as designed: it was a
  projection stamped dirty before I committed my inline fix.)
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs`: **334/334**, with
  no SKIP lines. That runner takes no `--repo`, so its `[real]` checks read the
  main checkout's (trunk's) projection.
- **Browser tier, whole**, `node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack/data/scratch/lnk` on `f7b119dd` (a `node_modules`
  junction in this worktree): **48/49 suites**, 2413 s (ledger row written by
  the runner, OVER the 30-minute merge budget by 10m13s). The one red is `[real]
  resting on a body row in the nav lights that body in the scene` in `3D pane
  follows the selection`, on v1's kinematic study, which this diff does not
  touch. Its DIAG showed the light standing in every sample, beside two
  `locator.hover` timeouts. The same suite `--only` on the same tree passed
  **31/31**. It is a known flake: a sighting is appended to
  `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`.
  The budget measurement is appended to the open (deferred)
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`,
  with its slowest suites.
- **Witness gate**, `node scripts/run_mutation_witness_tests.mjs --repo
  C:/workspace/tolstack/data/scratch/lnk --changed-since integration
  --budget-min 10`: exit 0. It reached 14 entries: 1/1 witnessed, 13 left to
  the sweep (budget), because the first fast entry took 10m05s. The two new
  specs were among the 13, so I re-checked them with `--only` each: **3/3
  witnessed** (10m16s).

## Findings

No blockers. No should-fix.

### Nits

1. **Fixed inline** — `tests/test_topology.py`
   (`test_children_and_the_tree_order_of_model_v2`): the comment said the
   link body walks "the machined part then each outer race", but the assert
   (correctly) lists `[lower outer race, machined part, upper outer race]`.
   `tree_order` keeps the body's listed order for top-level parts, and these
   are top-level because their assemblies are in no body. Comment only
   (`f7b119dd`).
2. **Fixed inline** — the lesson's "20 nodes" (correction blockquote, above).
3. **Dead map places.** `map_vpa_end_stop_v2.json` still places `pitch_link`
   at `[4, 5]` and `tan_link_212956_005` at `[1, 4]`. Both are now outlined
   (no feature of their own), and `layoutOnce` skips an outlined part's place
   with no note. So the two entries draw nothing and share a cell with a race.
   This is harmless today. It went on the overlay as a recurring check rather
   than an issue.
4. **"bound · face 104 of outer race".** The four moved centres' bound line
   names the feature's part, while the faces are on the link-assembly mesh
   (the inner race's ball). The lesson notes this and question 6 asks Jeff
   whether to re-pick on the seat, which would make the line true. It is
   covered by the filed issue's pointer to question 6, so I filed nothing new.

### Notes for the next reviewer

- `feature_identity_key` makes a bind on v2's outer race centre write under
  v1's key. A future bind picked on the race's own mesh (`815597cb`, whose
  instances are both ends of the link) would be fitted at **both**
  occurrences. `fit_bound_features` takes placements from the mesh's own
  sidecar, which is correct, but linkage would then see two candidate centres
  for one feature. This matters only if Jeff answers question 6 with "re-pick
  on the seat". The handoff that acts on that answer should check it.
- The browser check "selecting the hub's locating boss … scrolls it into view"
  now accepts the boss row staying on screen when the two rows do not fit
  together. That is the page's documented `revealLitRows` rule, but the
  check's name still says "scrolls it into view".

## Inline fixes

`f7b119dd` (the test comment) and the lesson's correction blockquote. Neither
changes behaviour.

## Overlay

Two entries added under "Recurring bugs to check": a part that becomes an
outline leaves a dead map place, and a moved feature's `identity.part`
differs from `feature.part`.

## Landing

`integration` was fast-forwarded `1ba5132a` → `e0770018` with `git fetch .
review/a_link_is_a_machined_part_and_two_bearings_each_two_races:integration`,
and then again with this section. Both branches are still checked out in
their worktrees, so neither was deleted (dispatch removes them at Complete).
The `node_modules` junction I made in this worktree is removed, and the main
checkout's `node_modules` is intact. The scratch root `data/scratch/lnk` is
left in place (gitignored). Its log copy is Jeff's 100 events, with the
tactical agent's test event `0101` moved out to my session scratchpad.

## Blocked actions

- `git push origin integration` (to publish the landing), refused by the auto
  mode classifier `[Destructive or Unwanted Actions]`. It was not retried.
  Local `integration` holds the work, so the operator can push it at any time.
  It changes only `origin/integration`, which nothing else is waiting on.
