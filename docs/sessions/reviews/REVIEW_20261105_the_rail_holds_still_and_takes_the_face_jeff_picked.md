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
- **Post-merge full suite** (review worktree, merged `62cc51ef`, `node_modules`
  junctioned in): `1 failed, 1729 passed, 1 skipped, 2 deselected in 4209.57s`.
  The failure is the worktree's deliberate `test_viewer_js_suite` red. About
  55 min of that was test 24 (`test_browser_runner.py`'s Chrome test) waiting
  for the browser slot. No contention header lines: this repo's conftest prints
  none. Recorded as `OVER BUDGET by 60m10s` and appended to the open
  `ISSUE_20261105_the_default_test_tier_ran_18_minutes_on_a_worktree.md`.
  Not exercised in the worktree: the viewer node-fs `[real]` tier (above).
- **Browser tier, `--only "annotate"`** (13 suites, post-merge): 13/13 PASS,
  285/285 sub-checks, the new "annotate rail holds still" 7/7. I ran the
  annotate suites rather than the whole tier: the tactical ran the whole tier,
  and the diff's viewer change (`sceneRevealPending`) is driven by these
  suites through the shell.
- **Mutation witnesses, `--changed-since integration --repo C:/workspace/tolstack`**
  (post-merge): `31/31 witnessed, 31/36 reached in 30m13s; 5 left to the sweep`,
  exit 0. Wall 1863 s, recorded `OVER BUDGET by 1m03s` and appended to the open
  (deferred) `ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`.

## Landing merge: integration had moved

`integration` moved under the review: `everything_in_3d_is_transparent_until_an_action_needs_a_face`
landed (`df73c50d`), along with board moves. Merging it into the review branch
gave three conflicts. My resolutions:

- `scripts/guard_enumeration.mjs`: **both sides raised the same pins.**
  Integration had annotate 287 (285 +2) and browser 826/793 (823 +3); this
  branch had 288 and 830/797. I kept both comments and **re-measured** the
  merged tree: annotate 290/290 `e787e59dc768`, browser 833/800
  `479f8091f792`. Those are exactly the two sums, so neither side's guards
  were lost.
- `docs/prompts/REVIEW_AGENT.md` and the 10-29 witness-gate budget issue: each
  side appended a new entry at the same spot. I kept both.

After the merge: all 14 witness specs this diff adds or re-anchors still match
their anchor exactly once (integration's look changes moved code in
`app.js`). Annotate fast tier 290/290. pytest subset (the eight files above
plus `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`
and `test_claims_registry`, for the prose and overlay edits): 414 passed.
Browser, `--only "annotate rail"`, on the merged tree: 4/4 suites, 80/80
sub-checks, "holds still" 7/7.

Universal checks: no file under the main checkout's `data/` changed after my
first run started (`find data -newermt`), and the main checkout's `git status`
is clean. No new operator-facing refusal. The new guards were seen failing:
the witness gate reached and witnessed all nine new specs and the five
re-anchored ones in the tactical run, and 31/31 reached entries in mine.

## Findings

**Blockers:** none.

**Should-fix:** none left unfixed without an owner. The two deliverables the
work stopped short of each have an issue the author filed, and I checked both
have frontmatter:

- Deliverable 5, viewer half (grid row and DAG hover words):
  `ISSUE_20261105_the_dag_joint_hover_and_grid_joint_row_do_not_name_their_two_parts.md`
  (feature/med, `audience: strategy`). The handoff fenced the grid, so this is
  the right owner.
- Deliverable 6, the study still folds the old P2 run:
  `ISSUE_20261105_the_kinematic_study_still_folds_the_p2_run_whose_slide_joins_the_hub.md`
  (chore/med). Until it lands, Jeff opens the study and still sees "the hub"
  on the plate slide. The fixed row shows only on
  `?sweep=vpa-pitch-p2-20261105-204957`.

**Nits:**

1. *Fixed inline.* The lesson says the shared projections were not
   overwritten. In fact `data/projections/viewer/kinematic/` was rebuilt
   from this branch (`head_sha` `ee7ccf3c`, built 05:51Z). Its content is
   benign: same study, status `ok`. I added a dated correction blockquote; the
   next main-checkout rebuild puts it back on a trunk-built tree.
2. *Fixed inline.* `ISSUE_20261105_the_annotate_speed_control_check_…`'s
   `found_by:` named the staged path (`docs/sessions/HANDOFF_…`). It now names
   the `active/` path, like the other four.
3. `renderSweepRail`'s `.an__rail` `scrollTop` restore (`app.js`, around the
   `root.closest(".an__rail")` line) has no check and no witness. Deleting it
   is green in every tier. It has no human exposure: embedded, the
   annotator hides that rail, and the jump Jeff saw was the shell's, which
   *is* pinned. Not filed.
4. "A newly expanded joint is in view after the expand" (deliverable 1) is
   pinned only indirectly: the scroll does not move, so the row you clicked
   stays where it was. The lesson measured `scrollTop` 759 across both
   expands. Nothing separate checks it.

Design pass: the joint row reads `<part number> <joint word> <part number>`
with no everyday part name. That would break the "everyday name beside the
number" rule, but it is the format Jeff asked for in deliverable 5, so I did
not file it.

Lesson audit: the six-sentence table's causes match the code. I checked the
`render()` → `renderNav()` → `renderSceneSlot()` chain and
`QUIET_BINDING_STATES` on `integration`. "`scrollTop` 836 in every frame"
re-reads from `rail_walk.json` (8/8). The 1494 s merge-tier figure is the
author's own arithmetic from 3144 s minus about 27 min of queue, and the
lesson says so.

## Overlay

Added one Recurring-bugs entry: a sweep-rail fix made only in
`apps/annotate/`, when Jeff reads the rail in the shell's nav.

## Verdict

**APPROVE.** All six deliverables were worked: four built and pinned by
browser checks with witnesses, and two partly built with what remains
filed. The suite is green except the worktree's deliberate red, and the
witness gate passes.
