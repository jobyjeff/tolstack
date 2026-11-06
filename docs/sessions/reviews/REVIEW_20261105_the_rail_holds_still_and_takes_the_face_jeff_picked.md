---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE
blockers: 0
---

# Review 2026-11-05 — the_rail_holds_still_and_takes_the_face_jeff_picked

Branch `handoff/the_rail_holds_still_and_takes_the_face_jeff_picked` (6 commits,
`63a0906c`..`512bbada`), merged into `review/…` as `62cc51ef` with no conflict.
Containment checked first: the branch was **not** already in `integration`.
This is the first run of this handoff (no prior report or review commit on
this branch; the lesson arrives as `A`).

## The seven mandatory stack checks

Not applicable, all seven: the diff touches no stack, topology, hardware entry,
spec or material. It is annotator/viewer UI code, browser checks, witnesses,
docs and issues. No element value, sign, band, `confidence` or `source_ref`
moved, so there is no traced ratio to re-derive for this change.

## What I verified, deliverable by deliverable

1. **The rail holds still.** Two causes, both fixed. In the shell (the only
   place Jeff sees the rail), `renderSceneSlot` revealed the study row whenever
   the slot was empty before the render, and every `render()` → `renderNav()`
   rebuilds an empty slot; I confirmed both call sites on `integration`
   (`topology_app.js` `render()` → `renderNav()` → `renderSceneSlot()`). The
   fix reveals once per tree arrival (`sceneRevealPending`). The annotator's
   own `renderSweepRail` now restores `.an__rail`'s `scrollTop`. The browser
   check pins nav scroll and the joint row's on-screen top across a Take, and
   its witness (`a5140c2b`) mutates exactly the reveal line.
2. **The camera frames the posed instance.** `anchoredOccurrences` now looks a
   part up through `AA.sweepTreeSubjects` (links included). Browser check
   measures the posed occurrence as nearest the controls target; witness
   `d97c0520` reverts the lookup.
3. **The second face stays a face pick.** `AA.sweepJointRowFeatures` drops an
   edge feature whose two ends are both the joint's rows; `answeredAtEnd` opens
   the partner end's list via `nextEndToPick`; the armed click now goes through
   `answeredAtEnd` too (still sweep-only, as before, so `sweepTopology()` is
   non-null there). The 10-29 issue's contributor half is re-filed.
4. **Bodies live under Bodies.** Links are subject rows; the joint no longer
   appends `treePartRows`, and the checkbox moved with it. A part picked on a
   link opens the link's body row (the bodies loop's `selectedPart.subject`
   test). Browser check: 213862-002 appears once, under the link's body row.
5. **Joint rows name their parts.** `AA.sweepJointRowWords(joint, endWords)`
   with `AA.sweepJointEndParts`. Fast-tier checks cover own-part, across-edge
   and null. The viewer half (grid row, DAG hover) is filed as a strategy
   feature: the handoff both asked for it and fenced the grid, and the DAG's
   joints are topology edges with no part-number source. Reasonable call.
6. **The plate slide reads bushings against the piston body.** Shown on
   `?sweep=vpa-pitch-p2-20261105-204957` (shot `p2_20261105/`); the study is
   not re-pointed, which is filed (`…kinematic_study_still_folds_the_p2_run…`,
   chore/med). I confirmed the 11-05 runs are in the main checkout's
   `data/inbox/linkage-sweeps/`.

"Turned orange": `AA.sweepFeatureState` returned `unbound` for an end whose
partner was bound, and `unbound` is outside `AA.QUIET_BINDING_STATES`
(`binding_state.js:55`), so the shell set `data-attention`. Now `proposed` when
the end has its own open proposal; fast-tier and browser checks both cover it.

DoD: filmstrip committed (`rail_walk.png`, probe reads `scrollTop` 836 in all
eight frames, which I re-read from `rail_walk.json`); the three named browser
checks exist; the declared-face handoff's annotate checks are untouched by the
diff (the only edited fast-tier assertions are the joint-word ones this handoff
changes on purpose) and green.

Guards: 3 annotate + 7 browser declared, pins raised with a comment naming
this handoff; 9 new specs plus 5 re-anchored, each re-anchor's `note` saying
why. The browser skip row has no spec, like every other suite's.

## Tests

- **Tactical record:** full `pytest -q` in its worktree, 1727 passed / 1 skipped
  / 1 failed (the worktree's deliberate `test_viewer_js_suite` red), 517 s;
  annotate 288/288; browser tier 40/42 then the two re-pointed suites green
  alone; mutation `--changed-since integration` 34/34 witnessed (two by
  `--only` re-runs). Consistent with the diff, so the benefit of the doubt holds.
- **Pre-merge risky subset** (rows: `apps/annotate/`, `apps/viewer/`, a guard,
  prose; run on the merged review branch before landing on `integration`):
  `node apps/annotate/run_tests.cjs` 288/288, 0 SKIP lines;
  `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py
  tests/test_feature_identity.py tests/test_part_mesh_aliases.py
  tests/test_mutation_witnesses.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py tests/test_architecture_inventory.py`
  193 passed.
- **Viewer fast tier through `--repo C:/workspace/tolstack`:** 515/516, the node-fs
  `[real]` tier refused: `results.json`/`topologies.json`/`crops.json` were
  built from master `eb3059ff` and `integration` has since changed eight stack
  files and the topology (the `stack_wording` handoff), none of them in this
  diff. Not armed here; it is the batch merge's rebuild to make.
