---
type: review
handoff: docs/sessions/active/HANDOFF_20261020_the_3d_pane_opens_in_the_mode_the_study_wants.md
reviewer: agent
date: 2026-10-20
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_3d_pane_opens_in_the_mode_the_study_wants

The branch has eight commits (`aba5bad`..`709a51b`), cut from `integration`
at `5253053`. When this review started, `integration` was still at that
commit, so the merged tree is the same as the handoff tree. This is a
first-round review. My review branch had no earlier attempt at this slug.
This is not a stack, so the overlay's mandatory stack checks 1–7 do not apply.

## What I verified

**The deliverables, against the code.**

1. **The flyout is now a pane.** It stays open because `followSelection()`
   runs after every `paint()`. Open/closed is stored under
   `VA.FLYOUT_OPEN_KEY`, with try/catch, beside the existing width key. The
   head's `#pane-toggle` is rendered only where the mount probe passed. The
   dialog still uses `show()`, and the `body.flyout-open` rules stay. The nav
   rail now stays visible while the pane is open. That reverses a ruling Jeff
   made earlier. The reversal is forced, because the DoD selects studies in
   the nav while the pane is open. The lesson records it, and the layout cost
   is filed as `ISSUE_20261020_with_the_3d_pane_open_a_chain_study_page_leaves_the_dag_a_narrow_strip.md`
   (`audience: strategy`).
2. **The pane follows the selection.** `VA.annotateParamsFor` is the one rule.
   Its output feeds the existing `annotateLink` / `annotateExecCommands` pair,
   so there is no second table. `goto` and `trace` call `leaveSweep()`
   first, and that call does nothing outside sweep mode. The model row still
   launches sweep mode on the newest run (`kinematic.js` ~134). The pairing
   test in `tests.js` runs both carriers over the same `annotateParamsFor`
   answers. That closes the hand-mirror shape that the overlay's "Two
   hand-mirrored carriers" entry warns about, for these params.
3. **Hover reaches the annotator.** One delegated `mouseover` listener matches
   `tr.kmrow[data-edge]` and `[data-row-kind="edge"][data-id]`. I checked
   that both attributes are actually emitted (`kinematic.js:627`,
   `topology.js:1482/1678`). Hover messages wait for the pointer to settle for
   150 ms, and the same target is never posted twice in a row.
   `AA.planHighlight` contains no DOM code. An unbound edge produces a
   console line, not a banner.
4. **The head line is the annotator's own reply.** `announced()` wraps `goto`, `trace` and `sweep`. The deep link also goes
   through `AA.exec`, so a cold open posts the state as well. The viewer
   prints `title` exactly as received. It accepts the message only from its
   own iframe and its own origin.

**The lesson's numbers, re-derived.** 18 new specs: 3 fast, 2 annotate and 13
browser. I counted them from `git diff --name-status`. The census pins match:
fast 541→544, annotate 195→197, browser 534→547. 1000/150 = 6.7 messages a
second. The lesson's claim about "the sixteen" in the commit subject is
correct. The hosted-bake claim (no new mount) is consistent with the diff:
every file it touches is under `apps/viewer/` or `apps/annotate/`.

**One guard I broke myself.** I commented out the `followSelection()` call in
`paint()` and reran the browser tier. The new suite went 9/12 and named
`selecting a chain study in the nav leaves sweep mode`, the bind-mode head
line, and the hover tint. The tier went 26/27 and exited 1. I then restored
the file; afterwards there was no content diff.

## Tests

The tactical record lists a full pytest run at `653ac7c`: 1 failed, 1508
passed, 1 skipped. Three later commits touched only the browser suite and the
lesson, and the author reran the affected modules. The record is consistent
with the diff, so it gets the benefit of the doubt.

**Arming.** I reused the author's scratch root
`C:\workspace\tolstack\data\scratch\three_d_pane\`, with projections built
from `f9ba494`. That is the same projection input as the merged tree, and the
freshness line paired all four files with the tree. I added junctions there
for `docs` (to this worktree) and `venv-win`, and a `node_modules` junction
in this worktree.

**Pre-merge risky subset.** This is the merged tree before commit; it is
identical to the handoff tree.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **544/544**. No SKIP
  lines.
- `node apps/annotate/run_tests.cjs`: **197/197**.
- `node apps/annotate/run_browser_check.mjs` (mock pass): **67/67**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **27/27
  suites**. That includes `3D pane follows the selection` 12/12 and
  `annotate flyout` 45/45.
- `pytest -q` on `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
  `test_viewer_deep_link_contract`, `test_js_vocabulary_is_generated`,
  `test_feature_identity`, `test_part_mesh_aliases`, `test_app_type_scale`,
  `test_mutation_witnesses` and `test_architecture_inventory`: **148 passed**.

**Post-merge full suite** (review worktree, at `d2d4f77`):
`1 failed, 1508 passed, 1 skipped in 320.87s`. The one failure is the
documented worktree-only red, `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
(there is no projection in the worktree). The fast tier passed 544/544
through `--repo` above. tolstack's conftest prints no
`concurrent pytest processes` or `full-suite lock` header lines, so I have
none to quote. The main checkout's `git status` stayed clean, and nothing
new appeared under `data/` outside `data/scratch/`.

**Mutation-witness registry**, all of it, on the merged tree (`d2d4f77`,
`--repo <scratch>`): **236/237 declared mutations witnessed, exit 1.**
Enrollment: fast 74/544, annotate 52/197, browser 76/516 enrollable (547
declared). The author ran `--only` on the 18 new specs and the 2 it
re-pointed, but not on the whole registry (lesson, "Verification").

## Findings

### Blocker

**B1. This change kills the witness for an existing guard:
`scripts/mutation_witnesses/browser__and-it-sits-to-the-panel-s-right-which-is-what-beside-me__237dba65.json`
is NOT WITNESSED.**

- **Before:** the nav rail stood down while the panel was open. The spec's
  mutation, `calc(var(--flyout-width, 0) - 300px)`, shifts the page 300px
  short, which is the rail's own width. That left the DAG drawing under the
  panel, and the declared check failed on it.
- **Now:** this handoff keeps the rail open, in the page's normal layout,
  between the panel and the DAG. The same 300px shortfall now puts the
  *rail* under the panel. The DAG drawing still starts at the panel's right
  edge.
- **Result:** the declared check, `...and it sits to the panel's RIGHT,
  which is what 'beside' means`, stays green. Only the new check fails:
  `the nav rail stays beside the open panel, to its right, so a selection
  made in it can follow into the pane`.

The two sibling specs on the same declaration (`c85739df`, `8ce9bd17`) were
re-pointed in this diff. This one was missed, and the tier exits non-zero on
it. So `integration` would carry a red mutation tier into the batch merge.
That is exactly the decay that CLAUDE.md puts this tier on the merge list to
catch.

**Suggested fix (tested):** change the replace to
`calc(var(--flyout-width, 0) - 600px)`. That is the rail's width plus the
original 300px near miss. Update the spec's `note` to say why it is 600px
now. I applied that edit temporarily and ran
`run_mutation_witness_tests.mjs --only browser__and-it-sits-to-the-panel-s-right-which-is-what-beside-me__237dba65 --repo <scratch>`:
**WITNESSED, 1/1**. Then I reverted it, because writing the fix is the
author's job. Whether 600px is still the "near miss that looks correct", as
the note describes, is for the author to decide. Rerun the full registry
afterwards, not only `--only`.

No should-fix findings.

**Nits** (recorded, not filed):
- N1. `topology_app.js` `schedulePaneHover`: when the iframe has not loaded
  yet, `postToPane` drops the command, but `paneHovered` is still updated. So
  if the pointer rests on the same row until the load finishes, that row does
  not re-post until the pointer moves off it. This only happens during the
  first boot.
- N2. Commit `3632ef0`'s subject says "sixteen new guards" where there are
  eighteen. The lesson already corrects it.

**Design check:** the head's `3D` control is a ghost button. The head line
shows an ellipsis when clipped, with the full text in `title`, which meets
the truncated-text rule. Nothing new needs filing. The narrow-DAG cost is
already filed by the author.

## Overlay

I added two Recurring-bugs entries.

- An annotator verb that changes the mode or the subject must be registered
  through `announced(...)`, otherwise the pane's head line goes stale and
  nothing fails.
- A layout change that moves a column can decay an *untouched* spec whose
  mutation offset is that column's width. That is B1. Running `--only` on the
  specs a diff touched cannot see it.

## Not merged

This is REQUEST CHANGES, so `integration` is unchanged. The handoff branch
and both worktrees stay where they are. My review branch carries the
handoff's merge commit (`d2d4f77`), this report and the overlay edit. The
round-2 reviewer can merge the reworked `handoff/` branch on top of it.

## For the next reviewer / the sweep-rail handoff

Read the lesson's "What the sweep-rail handoff needs". `select-edge` stays in
sweep mode and `goto` leaves it. The TRUTH suite binds
`__sweep.openedBySweep[0]`. I have left the author's scratch root at `data/scratch/three_d_pane/` in place
for the rework and round 2: its projections pair with this tree. I removed
the `docs` and `venv-win` junctions I added there and my `node_modules`
junction. Delete the scratch root once round 2 lands.

## Re-run 2026-10-20

Round 1 was REQUEST CHANGES, with 1 blocker (B1). This round closes it.

**What changed.** One commit, `f23ff44`, merged into the review branch as
`e03a832`. `integration` was still at `5253053`.
- **B1:** the witness's replace is now `calc(var(--flyout-width, 0) - 600px)`,
  which is the fix I suggested and tested in round 1. Its `note` now says why
  the offset grew: the kept nav rail is one column further in.
- **N1:** the author fixed this as well, though it was only recorded as a nit.
  `postToPane` now returns whether the command reached a loaded frame.
  `schedulePaneHover` remembers a target as posted only if it did. That is
  four lines and changes only the dedupe key. The browser tier's hover checks
  still pass on it.

**Tests on the round-2 merged tree** (same scratch root and freshness pairing
as round 1, all four projections at `f9ba494`, which is unchanged as a
projection input):
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **544/544**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **27/27
  suites**, including `3D pane follows the selection` 12/12 and
  `annotate flyout` 45/45.
- `pytest -q` on `test_mutation_witnesses`, `test_js_python_vocabulary`,
  `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract` and
  `test_architecture_inventory`: **50 passed**.
- **Full mutation-witness registry: 237/237.** The first full run read
  216/237. All 21 misses were `python__` specs that reported "the tier's
  process could not be started" (`spawn …\three_d_pane\venv-win\Scripts\python.exe
  ENOENT`). The tactical agent's own cleanup had removed the shared scratch
  root's `venv-win` and `docs` junctions at 22:14, while my run was in
  progress. Every browser, fast and annotate spec in that run was witnessed,
  B1's spec `…237dba65` included. I re-created the junctions and re-ran
  `--only python__`: **21/21 witnessed, exit 0**. 216 + 21 = 237.
- I did not rerun the full pytest suite this round. The round-1 post-merge
  full run (`1 failed, 1508 passed, 1 skipped`, where the one failure is the
  documented worktree-only `test_viewer_js_suite` red) covers every Python
  file. Round 2 changes one JS file, which the fast and browser tiers cover,
  and one witness JSON, which `test_mutation_witnesses` and the registry
  cover.

**Lesson to the overlay:** two sessions sharing one scratch root can take a
tier out of each other's runs. The symptom is the "process could not be
started" class in the witness runner, which says nothing about the guards.
A miss of that class is a reason to re-run, never to issue a verdict. I added
this as a clause on the round-1 overlay entry.

**Verdict: APPROVE (round 2).** No blockers. No should-fix findings are left
unfixed, so there is no issue to file. I am merging into `integration` by
fast-forward from this branch.
