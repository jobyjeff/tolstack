---
type: review
handoff: docs/sessions/active/HANDOFF_20261121_the_viewer_node_suite_runs_inside_its_default_tier_timeout.md
reviewer: agent
date: 2026-11-22
verdict: APPROVE
blockers: 0
---

# Review — the_viewer_node_suite_runs_inside_its_default_tier_timeout

**Verdict: APPROVE.** There are no blockers and no unfixed should-fix
findings. Nothing was fixed inline.

## What the work does

- **The cause.** `6f093680` turned `VA.mapLayout` into a search: a repair
  loop plus a corner search (`viaCorners`). v1 cannot be drawn clean, so it
  spends the whole budget, about 0.6 s per layout. `renderTopoPane` laid the
  map out again on every repaint, and four `[real]` checks repaint once per
  study (23 studies on v1).
- **Fix 1** (`apps/viewer/map.js`). `VA.mapLayout` remembers its result in a
  16-entry memo keyed by content: `JSON.stringify([model, doc.places, M])`.
- **Fix 2** (`apps/viewer/topology.js`). `VA.gatherParts` keeps one memo per
  projection in a `WeakMap`, instead of a single slot.
- **Visibility.** `run_tests.cjs` now prints its wall time, its CPU time and
  its eight slowest checks.
- **Guard.** One new fast guard with a two-mutation spec. The pin goes from
  623 to 624.

## What I verified

**Memo correctness.** The page reads the same layout from the memo every time.
- The layout reads only `doc.places`. Every other `doc.` read in `layOut` and
  `layoutOnce` goes through `doc.places`.
- Every `VA.*` value it reads is a constant or a pure estimator:
  `MAP_GLYPH`, `MAP_SYMBOLS` (frozen), `mapFitText`, `mapWrapText`,
  `mapOutlined`.
- No test or app code reassigns or stubs any of those.
- No caller writes into the shared `geo`. Its one exposure is
  `VA.lastMapLight.geometry`, and a grep for assignments into it and its
  members finds nothing.
- `JSON.stringify` failures fall back to no memo, so they cannot go wrong
  silently.

The `gatherParts` change keeps the old identity semantics and only adds slots.

**The guard fails when it should.** The witness gate ran both of the guard's
mutations, and both were `WITNESSED`.

**The lesson's numbers.**
- I re-derived 23 studies on `vpa_pitch_linkage` and 0 on v2 from the
  projection.
- The browser-tier ledger rows match the lesson: 1854 s at `89ad5d4e`, then
  2366 s at `6a3b983b` on 2026-11-20.
- The diff has no placeholder tokens.
- The lesson and issue files are status `A`, so they overwrite nothing.

**The page benefits too.** In my whole-tier run, topology http took 144.5 s.
That is 258 s before the fix and 143 s before `6f093680`, which matches the
lesson.

## Tests

All runs used the merged tree. The `[real]` tier was armed through the
scratch root `data/scratch/rv_nodesuite_1122`: a copy of the main checkout's
`data/` and of the merged `docs/`, with topologies and kinematic rebuilt from
`94f72834` via `--data-root`.

| tier | result |
|---|---|
| tactical record | The default tier ran in the worktree with the viewer tier junction-armed: 1 failed (the known export-runs red), 2586 passed. The armed fast tier ran 624/624 in 15.7 s. The browser `--only` runs covered the topology suites. I accept this record. |
| viewer fast, `--repo` scratch, armed | **624/624 in 21.6 s** (paired @ `94f72834`). After re-merging the moved `integration`: 624/624 in 12.8 s. The slowest `[real]` check took 5.7 s. |
| annotate fast | 333/333. After the re-merge: 334/334. |
| pytest subset (`test_js_python_vocabulary`, `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`, `test_topology_map`, `test_topology_projection`, `test_mutation_witnesses`) | 153 passed |
| pytest doc-scan subset, after my overlay edit | 222 passed |
| after the re-merge: `test_mutation_witnesses`, `test_contact_suggestions` | 67 passed |
| default tier, worktree, 468 s (recorded, inside budget) | 1 failed, 2590 passed, 1 skipped. The failure is `test_viewer_js_suite_is_green`, the designed worktree red (the `[real]` tier is skipped with no projection). Run through `--repo`, the same tier was 624/624. This repo's conftest prints no contention header lines. |
| witness gate `--changed-since integration --budget-min 10` | **10/10 witnessed, 10/11 reached, 10m38s, 1 left to the sweep** (`browser__real-v1-which-has-no-layout-file…`). Pass. |
| whole browser tier, `--repo` scratch | 47/49 suites, **3025 s** (ledger: over the 1800 s budget). The 1063 s pattern suite is most of the overage. I appended this measurement to the deferred `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`. |
| the two red suites, `--only`, merge vs `integration` `8ba9e509` export | The same sub-checks are red on both trees (3/5 and 8/11), so the diff did not cause them. Filed as `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md`. |

**Not exercised.** One browser `[real]` sub-check was skipped for lack of
data: "a bound pattern offers the whole pattern on the other part", because
the scratch root's served log lacks the binding it needs.

**Pollution check.** No file under the main checkout's `data/` outside
`scratch/` changed during the runs, and its `git status` is clean.

**Integration moved mid-review.** It went from `8ba9e509` to `354a5e0c`, which
brought in the lug-occurrence handoff (annotate and contact suggestions). I
merged it into the review branch without conflict and re-ran the fast tiers
and the anchor test (rows above).

## Findings

**Nits (no action needed):**
- The memo returns one shared geometry object, and only a code comment
  protects it. A future caller that writes into `geo` would corrupt every
  later repaint without any error. Nothing writes into it today. I added this
  to the overlay's checklist rather than filing an issue.
- The DoD asked for the three pytest files to be run "in the main checkout".
  The tactical agent ran them from the worktree with junctions instead. That
  was the right call, because the main checkout sits on trunk and would have
  tested the old code. Its one red is the known MAX_PATH issue.
- The follow-up issue the tactical agent filed (`ISSUE_20261122_v1s_computed_map…`) is `priority:
  low`, so it auto-defers. It is a 0.6 s cost on every page load plus a v1
  drawing that cannot be drawn clean, and `med` would arguably fit better.
  That is triage's call, so I left it alone.

## Overlay

I added two entries to "Recurring bugs to check":
- For any diff touching the layout or the map view: the render-path memo's
  key must cover every input, and no caller may write into its shared result.
- A super-linear render can hide in a tier that skips in worktrees. Read the
  runner's new slowest-checks block on every armed run.
