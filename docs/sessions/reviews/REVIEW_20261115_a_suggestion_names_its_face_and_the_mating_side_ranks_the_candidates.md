---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates.md
reviewer: agent
date: 2026-11-15
verdict: APPROVE (round 2)
blockers: 0
---

# Review — a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates

**Verdict: REQUEST CHANGES, one blocker.** The work is good. The ranking is
measured and pinned by value on Jeff's numbers, the suggestion line and its
Take work, and the lesson is honest and detailed. But the merge turns a whole
browser suite red that is green on `integration`. The cause is one line in
`VA.featureBodyPlan`: once a feature has ranked mates, its body stops drawing
the pane's candidate rows. That reaches features this handoff was not meant to
change. Not merged into `integration`. The review branch holds a merge of the
handoff and a sync of `integration` (`23e5f90f`), so the rework can start
from it or redo it.

## Blocker

**B1 — mates replace the pane's candidate rows instead of joining them.**
`apps/viewer/views/nav.js`, `VA.featureBodyPlan`:

```js
if (status === VA.FEATURE_STATUSES.suggested && rows && rows.length && !disagree && !mateLines.length) return null;
```

Before, a `suggested` feature with pane rows returned `null`, which means "draw
the pane's rows": the end's state line, the candidate rows with their kinds,
marks, indent and glyphs, and their Take. With `&& !mateLines.length` added, a
feature that also has mates gets the shell's own plan: the proposal's line and
up to 8 mate lines. That plan draws no pane rows at all. The proposals and
contact faces the pane listed are gone, along with their marks.

- **Observed:** `annotate rail holds still` (`scripts/run_viewer_browser_tests.mjs`)
  is **17/17 on a `git archive` of `integration` `23e5f90f` and 12/17 on the
  merge**. It was 12/17 twice: once in the whole tier, once with `--only`.
  The five reds:
  - "after a Take the faces layer follows the partner end … with the pane's row for it beneath"
  - "the faces layer's rows say what they are …"
  - "a candidate face steps in from its feature row by a full indent"
  - "the feature row and a candidate face each draw a glyph"
  - "a row the annotator marks for attention keeps its words in ink …"
- **Path:** the suite takes `gas_spring_piston_body_od` (face 166). The
  partner, `gas_spring_mount_bushing_bore`, now has a bound counterpart, so it
  gets mates. Its body becomes the plan, and the log's rail look reads
  `kinds ; ends ;` (no pane rows). Its titles are
  `["suggested · medium","face 113 …","face 129 …", … ,"face 1078 …"]`.
- **The visible cost:** on that feature the true mate is face 53, which the
  lesson ranks 13th because "bushings sit between". It is not among the 8 mate
  lines, and the pane's rows that would have carried the contact engine's
  faces are no longer drawn. A reader is shown eight wrong bushings and none of
  the candidates the page offered before.
- **Why the tactical's checks missed it:** the new suite and the fast tests
  check only features where the plan is the intended surface. The fast test
  even pins `featureBodyPlan(...).lines.length === 1` with no mates. No check
  covers a feature that has both pane rows and mates. `CLAUDE.md`'s table leaves
  the whole browser tier to the review, so this is the tier working as designed.
- **Fix shape (the author's call, not mine):** the handoff's own design puts
  mates *in the pane's candidate list* ("after the proposals, before the
  contact engine's faces"). `app.js`'s `candidatesWithMates` already does that
  for joint ends and element rows. So a feature that has pane rows should most
  likely keep `return null` and get its mates through those rows. The plan's
  mate lines are then only for the case with no pane rows (item 3, "opens to
  its ranked list without being armed"). Add a fast check for the
  rows-and-mates case. Then re-run `--only "annotate rail holds still"` and
  this handoff's own suite.

The handoff asked for this list. It did not ask for it to replace the
candidate rows this pane already had (`a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there`).
That makes B1 a behaviour change, so it is outside the inline-fix boundary.

## Fixed inline (all three prongs)

- `apps/annotate/scene.js`: `frameFaces` had been inserted between
  `_assemblyBox` and its header comment ("One part's drawn occurrences, as one
  box in the assembly frame."). The comment ended up above the wrong method. I
  moved it back above `_assemblyBox`. Comment-only.

## Nits (no issue needed; for the rework)

- The `AA.MATE_TOLERANCES` comment says the nearest wrong plane is at
  "45 deg". The lesson's table has no 45° row; every flat row there is 0°. Say
  which face that was, or drop the figure.
- Scope: the handoff fenced off `scripts/` runners, and the diff touches
  `scripts/run_viewer_browser_tests.mjs` (the new suite) and
  `scripts/guard_enumeration.mjs` (the pins). Both are what the DoD's browser
  suite and spec enrolment need. I accept both; noted so the fence's wording
  can be loosened next time.
- Also in the fence: `apps/viewer/topology_app.js` was in scope and is
  untouched. The hover went through `nav.js`, which works.

## What I verified

- **The DoD's ranking claim, by value.** `AA.rankMatingFaces` on the fitted hub
  and blade records puts 2356/2358 at the head, then 2427. 2564 is absent at
  blade 1's occurrence and mates only when the blade is turned onto its axis.
  The fast tier pins both. Shot `03_…` shows the same list on the real page,
  with 2564 absent.
- **Thresholds sit between the measured populations** (axis 0.25° / 0.25 mm,
  between 0.0033° / 0.000 mm and 0.50° / 0.53 mm). A fast check pins them. The
  lesson is open that the flat rows rest on a *proposal* (134) rather than a
  binding, and that the blade side ranks 4038 above the true mate. Both honest.
- **Display only.** Nothing in the diff writes an event or a value from a
  placement (`rankMatesAt`, `refreshMates`, `paintArmedMates` only colour and
  list). `scripts/fit_bound_features.py` is untouched.
- **The real log.** The main checkout's `data/inbox/feature-identity/` held
  **83 events before and after my runs**. A manifest of `data/` (excluding
  `data/scratch/`, 528 files) matched byte for byte, by size and mtime, after
  the full pytest, the browser tier and the witness gate. The new suite writes
  to `__mockWrites` only.
- **The lesson's arithmetic**: the census bumps (fast 701→703, annotate
  316→321, browser 850→856 / 819→825) match the five annotate checks, the two
  fast checks and the suite's 5 checks plus its skip line. The counts 703/703
  and 321/321 reproduce.
- **Issues.** The new `ISSUE_20261115_a_bore_opposite_a_bound_ball_centre_…`
  has valid frontmatter. `ISSUE_20260921_cross_part_face_relations_…` was set
  `resolved` with a dated section. The capability it asked for exists now, so
  I accept it (its leftover `defer_until`/`class` are optional on `resolved`).
- Mandatory stack checks 1–7: **not applicable**. No stack, topology or spec
  data changed, and the diff adds no element value, sign, band or traced
  ratio.

## Tests

| when | what | where | result |
|---|---|---|---|
| pre-merge subset | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | 703/703 |
| pre-merge subset | `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` | review worktree | 321/321 |
| pre-merge subset | pytest: `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`, `test_feature_identity`, `test_part_mesh_aliases`, `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`, `test_app_type_scale`, `test_mutation_witnesses`, `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`, `test_claims_registry`, `test_architecture_inventory` | review worktree | 440 passed, 123 s |
| scene change | `node apps/annotate/run_browser_check.mjs` | merge, and a `git archive` of `integration` | **identical on both**: 65 PASS, the five filed reds, then a throw in `correctionPass`. Pre-existing and newly filed (below) |
| post-merge full | `PYTHONIOENCODING=utf-8 …/python.exe -m pytest -q -rs` | review worktree, merged with `integration` `23e5f90f` | 1 failed, 1991 passed, 1 skipped, 4 deselected, 418 s. The failure is the expected worktree red `test_viewer_js_suite_is_green`; the tier it wraps ran 703/703 through `--repo`, and after the sync too. The skip is `test_fit_bound_features.py:433`. Contention header lines: not captured (my `tail -25` cut them). Recorded with `suite-time record`: inside budget |
| post-merge browser tier | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | review worktree | 1663 s running, 1080 checks, 4 suites red. **Self-recorded `merge` row** |
| re-check of the reds | `--only` per suite, baseline vs merge | `integration` export vs worktree | `annotate rail holds still` 17/17 vs **12/17** (B1); `3D pane follows the selection` 31/31 vs 31/31 (the whole tier's 30/31 was a flake); `topology file://` 135/135 vs 135/135 (flake); `the model drawn alone and led` 21/23 is pre-existing (`ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration`) |
| witness gate | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration --budget-min 10` | review worktree | exit 0. **14/14 reached witnessed**, 14/40 reached in 9m13s, 26 left to the sweep, including all five of this suite's browser specs. The tactical's `--only` run witnessed all 12 new specs |

A first run of the post-merge chain was killed partway: `integration` moved
(`the_suite_stops_paying_for_the_same_tree_twice` landed) while it ran, so I
synced and re-ran everything above on the new tree. The merge with it was
clean.

## Filed

- `docs/issues/ISSUE_20261115_the_annotate_browser_checks_correction_pass_throws_and_the_passes_after_it_never_run.md`.
  Pre-existing on `integration`. The throw skips the proposal, reduced-motion
  and `--real` passes, while the exit looks like the five known reds.
- `docs/issues/ISSUE_20261115_design_a_ranked_mates_reason_is_clipped_before_the_part_that_ranks_it.md`.
  A design note, low: the clipped reason hides the diameter pair that orders
  the list, and the two lines give one size in two notations.

## Overlay

`docs/prompts/REVIEW_AGENT.md`, the `apps/annotate/` row: read
`run_browser_check.mjs` to its last line and compare it with an `integration`
export, because a throw hides behind the known reds.

## For the next round

Re-run `--only "annotate rail holds still"` and `--only "a suggestion names its
face"` on the rework, plus the fast tiers. The rest of this round's results
stand unless the rework moves more than `featureBodyPlan`.

## Re-run 2026-11-16

**Round 2: APPROVE, 0 blockers.** Round 1 was REQUEST CHANGES with one
blocker (B1). It is closed below.

**B1 is closed.** `a98573dd` deletes the `&& !mateLines.length` condition, so a
`suggested` feature that has pane rows draws them again. Its mates reach the
tree through those rows (`candidatesWithMates`, after the proposals and before
the contact faces). The tree draws mates as its own lines only for a feature
the pane lists no row for, which is item 3's case. Pinning:
- a fast assertion, inside the existing ranked-mates check (no census change);
- a second mutation in that check's spec that puts the condition back;
- an `ANNOTATION_SURFACE.md` row stating the rule.

The suite's step 1 now runs on the kinematic page, where the line *is* the
body. It also waits for the mount's mesh to open before hovering. Both changes
are needed, for the reasons the lesson gives. The 45° nit is fixed. I read the
lesson's rework section and found nothing in it that I could not reproduce.

Merged with `integration` again (`a7c707dd`, a master sync). The merge was
clean, and since round 1 that sync changed no app, script or test file.

| what | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 703/703 |
| `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` | 321/321 |
| pytest `test_mutation_witnesses`, `test_js_vocabulary_is_generated`, `test_viewer_readme_doc_facts`, `test_claims_registry`, `test_architecture_inventory` | 167 passed |
| browser `--only "annotate rail holds still"` | **17/17** (12/17 in round 1) |
| browser `--only "a suggestion names its face"` | 5/5. Face 134 is named and taken for proposal `proposal-0048-…`; the hub bore ranks `[2356,2358,2427,…]`, and 2564 is absent |
| witness `--changed-since 9caf662c --budget-min 10` | exit 0: **7/7 reached witnessed**, 1 left to the sweep (`…take-on-a-suggestion-line…`, which the tactical witnessed with `--only`), 450 s |

**Whole browser tier: not re-run, and why.** Round 1 ran it on a tree that
differs from this one only by the rework. Every red there was settled by a
baseline/merge pair (B1, two flakes, one already filed). Between the rounds,
the rework's only app change puts `featureBodyPlan`'s condition back to
`integration`'s own text, and both suites it reaches pass. The full pytest
from round 1 also stands: the rework touches no Python and no tracked document
the doc-scan guards read, other than one table row in `ANNOTATION_SURFACE.md`,
and the subset above covers that.

The real log: still 83 events.
