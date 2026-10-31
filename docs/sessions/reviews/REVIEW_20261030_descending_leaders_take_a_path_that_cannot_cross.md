---
type: review
handoff: docs/sessions/active/HANDOFF_20261030_descending_leaders_take_a_path_that_cannot_cross.md
reviewer: agent
date: 2026-10-30
verdict: APPROVE
blockers: 0
---

# Review — descending_leaders_take_a_path_that_cannot_cross

Branch `handoff/descending_leaders_take_a_path_that_cannot_cross` (3 commits,
`18747d71`..`d27b0272`) was merged into `review/…` at `6a4686ea`. It was not
already contained in `integration`. The handoff worked is the `active/` one,
and every file in the diff is `A` or `M`. No earlier lesson or report was
overwritten.

## Not a tolerance stack

No stack, topology data or spec-library value changes, so mandatory checks
1–7 (provenance, signs, LMC/MMC, RSS, nominal-in-band, castellation, traced
ratio) **exit: nothing in the diff carries an element value.** The traced ratio
is unchanged because no stack file is touched. `data/inbox/specs/` and
drawing-checker are not touched.

## What I verified

- **The no-crossing argument, by hand.** `VA.leaderGeometry`'s comment rests
  on one premise: in walk order, `y1` strictly increases and `y2` never
  decreases. I checked each case against it:
  - Rising leaders in walk-order lanes: the usual channel-routing order.
  - Descending leaders in reversed lanes: a later leader's seam run starts
    left of an earlier leader's lane, and its first run stops short of it.
  - One rising and one descending leader: their vertical spans are disjoint
    under the premise, and each leader's horizontals lie at the ends of its
    own span.
  - Angled leaders: every slanted run spans `[zoneLeftK, widthK]`, with ends
    ordered by the premise.

  All four cases hold; at most two leaders touch at a shared seam. One caveat
  the comment leaves unstated: the angled case assumes `x1 ≤ zoneLeftK`. Where
  `turnX = x1 > zoneLeft`, the common-x argument would not hold. The dots sit
  in the rails, left of the zone, so this is not live.
- **The lesson's counts, re-derived** with a scratch copy of the test's loop
  over `data/projections/viewer/` (integration's `topology.js` against the
  branch's):

  | style | before | after |
  | --- | ---: | ---: |
  | jogged | 207 | 0 |
  | angled | 14 | 0 |

  Both use the whole walk, 61 leaders, `vpa_pitch_linkage`, comfortable,
  uniform. All four numbers match the lesson. So do 22 lit chain studies and
  0 crossings across every configuration. **The configuration count does
  not:** the lesson says 540, and today's projection gives **564**. See
  should-fix 1.
- **The angled-path regex was updated at every site.** `git grep ' L \[-'` hits
  tests.js:6487 and run_viewer_browser_tests.mjs:2526, 2577, 3368, all of them
  updated. Line 12502 is the seam-leader shape, which was already `H … L`.
- **The guards fire.** `node scripts/run_mutation_witness_tests.mjs --repo
  C:/workspace/tolstack --changed-since integration`: 3 of 667 entries were
  selected, and all 3 were **WITNESSED** (exit 0, 2m17s).
- **The sites.** The topology and kinematic pages both draw through
  `renderTopoPane` → `VA.leaderGeometry`. The seam leaders into the 3D scene
  are named as left alone. `apps/annotate/` is untouched, as the fence
  requires.
- **The source issue.** `ISSUE_20260914_leaders_cross_…` carries `handoff:`
  pointing at this handoff, so it resolves at Complete. The tactical agent's
  new issue (respine `[real]` red on integration) has correct frontmatter.

## Merge conflict (resolved by me, per the carve-out)

There was one conflict, in `scripts/guard_enumeration.mjs`'s `browser` pin.
- **Integration** had moved it to `793 / 760 / 270a3fe3d891`: +1 guard, from
  `a_point_exports_its_xyz_against_angle`.
- **The handoff** had moved it to `792 / 759 / 7256dfc25796`: two guards
  renamed, count unchanged.

The resolution keeps the handoff's comment and integration's counts
(793/760). The digest was recomputed from the merged tree with
`enumerateGuards` + `guardNameDigest`, giving `a2fd1dffc6ef`. The `fast` and
`annotate` pins were recomputed too, and match what each side wrote
(`23e2bb81be22`, `abccfde67f72`). There are no marker lines.

## Tests

**The benefit of the doubt is void:** the lesson records the mutation-witness
run and the browser run, but **no full `pytest` run**. So I ran the full suite
before landing, on the merged tree.

- **Full suite, review worktree, merged tree** (`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`):
  `1 failed, 1687 passed, 1 skipped, 2 deselected` in 410 s. This repo's
  conftest prints no contention header lines. The failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
  documented worktree-only red: there is no `data/projections/` in a
  worktree. That tier was run directly:
- **Viewer fast tier** (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`):
  **629/629**, including the new `[real] no two leaders cross on any committed
  topology…`. Its freshness line raised no stale-projection refusal.
- **Mutation witnesses** `--changed-since integration`: 3/3 WITNESSED.
- **Browser tier** (`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`,
  with `node_modules` junctioned into the worktree): it took 1280 s and
  exited 1, with 35 suites PASS and 3 FAIL. **Every leader suite is green:**
  `topology file://` 203/203, `topology http` 203/203, `topology height
  budget` 19/19, and `leaders across the seam` 22/22. The three red suites
  are outside this diff:
  - `topology file:// respine` 42/44: filed by the tactical agent as red on
    integration
    (`ISSUE_20261030_the_real_respine_suite_never_catches_a_frame_in_flight_on_integration.md`).
  - `3D pane follows the selection` 28/32, the four nav body checks: already
    filed twice on integration
    (`ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md`,
    `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`).
  - `annotate hosted posture` 14/15: deterministic, and red again when run
    alone with `--only`. This diff touches nothing under `apps/annotate/`, so
    I filed it new:
    `ISSUE_20261030_the_hosted_annotator_bind_press_no_longer_shows_the_read_only_notice.md`.

Suite time was recorded (default tier, 412 s, inside budget).

## Findings

### Should-fix (unfixed; filed)

1. **The coverage assertion does not prove that a kinematic view was drawn.**
   Location: `apps/viewer/tests.js`, the `[real] no two leaders cross…` test.
   - `ok(kinStudies.length > 0, …)` checks the kinematic projection's input
     list, but a view is pushed only `if (VA.kinematicLitSet(…))`.
   - `configurations === expected` compares two counters filled by the same
     loop, so it can fail only on a throw.

   The handoff asked for a coverage set that asserts its own size, and this
   one would stay green with the kinematic page silently dropped. The lesson's
   540 against the tree's 564 is exactly one kinematic study's 2 × 12
   configurations, so the author's run probably had no kinematic view in it.
   The lesson's sentence "that kinematic studies were included" overstates
   what the test asserts. Filed as
   `docs/issues/ISSUE_20261030_the_all_topology_leader_test_does_not_prove_a_kinematic_view_was_drawn.md`.
   This is not a blocker: the crossing-free property itself is proven
   in the code and witnessed, and the kinematic page draws through the same
   function.

### Nits

- The lesson's "540 configurations" does not reproduce (564 today). The
  issue above records the right number and why.
- The `VA.leaderGeometry` comment's angled argument leaves out its
  `x1 ≤ zoneLeft` assumption (see above).

### Design

The angled-style toggle's tooltip changed to "Leader lines run out of the
diagram, then straight to their seam in the grid…". It is one line, uses
everyday words, and breaks no named rule. Nothing to file.

## What I fixed inline

Nothing in the work under review. I resolved the merge conflict described
above.

## Overlay

Added a **Recurring bugs** entry: a coverage set that asserts its own size
against a counter from the same loop. This is the first sighting.
