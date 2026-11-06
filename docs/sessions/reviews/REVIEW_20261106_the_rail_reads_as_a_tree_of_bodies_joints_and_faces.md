---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
reviewer: agent
date: 2026-11-06
verdict: REQUEST CHANGES
blockers: 1
---

# Review — the_rail_reads_as_a_tree_of_bodies_joints_and_faces

Branch `handoff/the_rail_reads_as_a_tree_of_bodies_joints_and_faces` (tip
`c18b1227`, five commits), reviewed on `review/…` after merging it in
(`a5924d79`). Before the merge, `integration` did not contain the branch.
**Not landed on `integration`**: the verdict is REQUEST CHANGES.

## What I verified

- **Which run.** `docs/sessions/active/` holds this handoff, and the branch
  worked that file. Every lesson, issue, shot and spec arrives as `A`. Nothing
  overwrote an earlier record.
- **Merge conflict (mine to resolve).** Only `scripts/guard_enumeration.mjs`
  `DECLARED_GUARDS` conflicted. `integration` had `fast 644 / annotate 291`
  (from `the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`), and
  the handoff had `633 / 293`, measured on its older base. I kept both comments
  and pinned what `node scripts/guard_enumeration.mjs --json` measured on the
  merged tree: **fast 645 = 644 + 1, annotate 294 = 291 + 3**, each matching the
  handoff's stated delta, with name digests `144ddec63e5b` / `89587c9bb715`.
  No marker lines remain.
- **Tactical full-suite record.** Present: `1 failed, 1733 passed, 1 skipped`
  in the worktree. The one failure is the deliberate worktree red,
  `test_viewer_js_suite.py`. The record also covers both fast tiers, the
  annotate browser check (96/99, the three known deferred failures), the viewer
  TRUTH tier (39/42, then each red fixed and re-run `--only`), and the
  `--changed-since` witness gate. It is consistent with the diff, so I gave it
  the benefit of the doubt.
- **Risky subset, pre-landing, on the merged tree:**
  - `pytest -q` over `test_app_type_scale`, `test_rail_row_looks_are_paired`,
    `test_mutation_witnesses`, `test_js_python_vocabulary`,
    `test_js_vocabulary_is_generated`, `test_viewer_readme_doc_facts`,
    `test_viewer_deep_link_contract`, `test_architecture_inventory`,
    `test_claims_registry`, `test_tolerance_stack` and `test_provenance` gave
    **352 passed**.
  - `node apps/annotate/run_tests.cjs` gave **294/294**.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave
    **528/529**. The one red is `[real] the projection this tier reads was
    built from this tree`: the main checkout's projection is older than this
    merge, which is the freshness guard working. The node-fs tier was skipped.
  - The browser tiers were not re-run. The REQUEST CHANGES below does not
    depend on them.
- **The pure helpers are right.** `AA.railMark`, `AA.endDeclaresFace`,
  `AA.candidateMark` and `AA.railLegend` are pinned value by value, and their
  three annotate specs and the fast spec are well aimed. The four
  scene-colour tokens equal `scene.js`'s `MARK_COLORS`.
- **Stack mandatory checks 1–7 do not apply.** This is not a tolerance stack:
  it has no element values, citations, signs or ratio.
- **`data-kind` collision check.** The viewer's only other `data-kind` is
  `#group-kinds input[data-kind=bodies|chain|kinematic]`. None of those words
  is a rail kind, and every new rule also needs a `.navtree__scene*` child, so
  there is no collision today. The bare `[data-kind=…]` / `[data-mark]`
  selectors are unscoped, though: nit 3.

## Findings

### Blocker

**1. The deliverable reaches Jeff's page through wiring that no tier pins.
Each of the handoff's three visual deliverables can be reverted with every
gated tier green.**

- **Location:** `apps/annotate/app.js` `railRow` (the two `railLookInto(node,
  row)` calls) and `embedTree` (`legend:`); `apps/viewer/topology.css`
  `.navtree__scene*`.
- **What's wrong:** In a scratch copy of the merged tree (`%TEMP%\tsrev`) I
  made these mutations together:
  - deleted both `railLookInto` calls, so no mirrored row carries a kind or a
    mark;
  - sent `legend: []`;
  - set `--tree-step: 20px` to `8px`;
  - re-added `.navtree__scenerow[data-attention="true"] { color:
    var(--inferred) }`, the "turned orange" rule the lesson says is gone.

  Results:
  - the viewer fast tier stayed **528/528**;
  - the annotate fast tier lost only five `[real]` checks, all ENOENT on my
    scratch copy's missing `docs/` and unrelated to the mutations;
  - `test_rail_row_looks_are_paired.py` and `test_app_type_scale.py` stayed
    **12/12**.

  The browser tier cannot see any of this either.
  `git grep 'data-kind\|data-mark\|scenelegend\|scenemark\|rail-kind'` finds no
  scene-tree hit in `scripts/run_viewer_browser_tests.mjs` or
  `apps/annotate/run_browser_check.mjs`. Of the 40 `navtree__scene` references
  in the runner, none reads a computed style or a box. The new fast test builds
  its rows by hand, so it proves `renderSceneTree` draws a `kind` it is
  *given*, not that the annotator sends one. The pytest pairs vocabulary *sets*
  against selector *sets*, so it pins words, not rule bodies or wiring. The
  `:not([data-kind="part"])` scoping that fixes the "floating checkboxes" is
  unpinned the same way. This is the overlay's "whole deliverable is one line
  from being silently reverted" entry, for the third time. The second
  sighting, one day earlier, was also REQUEST CHANGES.
- **Suggested fix:** Add one `[real]` shell check in the browser runner. Put it
  in the suite that already opens `?kinematic=` with `#pane-handle`
  (`testAnnotateRailHoldsStill`), so it drives the surface Jeff reads. It
  should assert:
  - rows of each kind the live study has (`body`, `part`, `joint`, `end`,
    `candidate`) carry `data-kind`, and every `end` row carries a `data-mark`
    from the vocabulary;
  - `.navtree__scenelegenditem` count = the number of marks;
  - a nested list's rows sit at least one `--tree-step` right of their parent,
    using `getBoundingClientRect`;
  - a `body` row's `.navtree__scenemark::before` computes a non-`none` content,
    or a non-zero width;
  - a row with `data-attention="true"` has a name whose computed `color` is
    the ink, not `--inferred`;
  - a part row whose Isolate is pressed keeps its checkbox on its name's line.

  Give each assertion a mutation spec aimed at the wiring line, not the helper.
  Run the suite `--only` for the browser half.

### Should-fix, for the rework (no issue filed, because the handoff still owns them)

2. **The lesson's indent arithmetic is wrong, and so is the CSS comment it came
   from.** Lesson, "The indent step": *"At level 3 a candidate face sits 60px
   in from its joint."* The same claim is at `topology.css`, the
   `.navtree__scene` comment: *"a clear 60px in from the body or joint it
   hangs under"*. Group headings are flat items (`sceneItem` returns before
   any `rows`), so joints are top-level. Joint → end → candidate is **two**
   nested lists, so a candidate is **40px** in from its joint
   (`--tree-step` × 2). The shots agree: in `04_two_ends_bound_nav.png` the
   joint's ring and a candidate's diamond are about 40px apart. Correct both.
3. **Nit: unscoped attribute selectors.** `[data-mark] { --mark: … }` and
   `[data-kind="…"] > .navtree__scenemark` match anywhere on the page. Scope
   them under `.navtree__scene`, so a later `data-kind` elsewhere cannot pick
   up a rail look. That is the overlay's "CSS rule keyed on a vocabulary token
   alone" class.
4. **Nit: the grid side-by-side shot.** It is honestly declared undelivered,
   and the grid's brace inset really is on an unlanded branch, so the
   comparison is filed for strategy. A wider viewport would still have shown
   the rail beside a usable grid. If the rework re-shoots, try 2560 wide.

### Fixed inline

- `docs/issues/ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`:
  `priority: low` became `priority: med`. The canonical suite-budget contract
  files `class: suite_over_budget` as `med`. No twin is open for this tier:
  the 2026-11-05 issues are default-tier, and the 2026-11-06 witness-gate
  issue is a different runner.

## Design read (non-blocking)

The shots read well. The three levels are distinct by glyph and weight, the
checkboxes form one column, the state line is grey, and the "picked now"
orange matches the scene's. I am filing nothing on design.

## Note for the rework / next reviewer

- The merged review branch already carries the `DECLARED_GUARDS` resolution
  at 645 / 294. The rework's new browser guards add to the **browser** pin
  (836 / 803 on integration now) and need specs.
- The overlay entry "The whole deliverable is one line…" gained this third
  sighting and its grep tell.
