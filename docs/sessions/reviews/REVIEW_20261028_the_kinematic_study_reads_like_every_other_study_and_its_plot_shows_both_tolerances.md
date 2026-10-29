---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review 2026-10-28: the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances

First run of this review (`git log HEAD -- docs/sessions/reviews/` showed no
earlier report on this branch). The handoff branch was not yet contained in
`integration` when this review started. Every new file in the diff is `A`, and
the lesson is new.

## What was verified

**Deliverable 1: one page shape.** `paint()` now renders a kinematic study's
results (`VA.renderKinematicResults`: name, verdict strip, driver line, chart,
per-stop readouts, provenance) at the top of `#detail`, with the selection
preview below it in `.detail__preview`. `.tv__main` keeps the DAG and the
contributor table (`VA.renderKinematic`). `flyout-replaces-detail` and
`syncSceneColumn` are both deleted (CSS, HTML comment and JS), so the scene
no longer hides `#detail`. A chain study's verdicts use the same component
(`VA.verdictStrip` fed by `VA.chainVerdictItems`), and its `#totals` stay at
the foot of the grid. The handoff says "stack pages" for this, and I read
that as chain-study pages, the same way the author did: the handoff's own
"what is true today" places a chain study's verdicts in `#totals`, and
`#totals` exists only on topology pages. The DAG is no longer bounded. The
author also made the pane sticky, which the handoff did not ask for. That
was a judgement call, the lesson discloses it, and without it the results
scroll away once the DAG is unbounded. I accept it.

**Deliverable 2: the band.** I re-derived `VA.kinematicTravelBands` against
the live projection:

- reach = |J|·h: 1.7279 × 0.82 = 1.41687, which equals the builder's
  `group.reach`.
- d = 1.707096 − 1.416872 = 0.290224.
- The corner |J|·h + d equals the stop's worst-case half.
- RSS: |J|·a = 0.97039, so b = sqrt(0.984961² − 0.97039²) = 0.1688, and the
  top of the ellipse is the stop's RSS half, 0.985.

The parallelogram's y-shadow is exactly the envelope's ±1.707 at the stop,
so the 2-D region and the 1-D envelope agree. The corner identity is not a
tautology: it holds only if the builder folded the group at exactly |J| times
the study's band. The live `[real]` test asserts it, and a mutation spec
witnesses it. Which stops get a band is read from the data:
`ref.parameter === sweep.driver.parameter`. The shared-band note is one line,
and it links only where `canReadWorksheets`.

**Deliverable 3: the axis note.** The note compares the travel study's
nominal with the swept span at display precision. The fast tier tests both
arms.

**Lesson audit.** I re-derived every number in the lesson and in the datum
issue against `kinematic_studies.json` and the chart constants. All of them
hold:

- 1.417 / 1.024 travel reach
- 0.315 direct at +72°, margin +0.185
- the rejected RSS parallelogram corner, 1.139
- band widths of about 11 px and 8 px (pw 456 at a ×1.013 render, on a
  66.1 mm axis)
- a scale of 0.75 at 420 px
- the pin deltas, +7 fast and +2 browser

**Issues filed by the author.** All four have frontmatter that follows the
contract. The datum question is `audience: strategy` with options and a
recommendation, not `needs: jeff`, which is correct for a question whose
answer an agent acts on.

**Tolerance-stack mandatory checks 1–7.** None of them apply. The diff
contains no stack, topology, spec or projection-input data, and
`tolerance_stack/kinematic.py` is untouched, as the handoff fenced. The chart
reads only the builder's numbers and folds nothing.

## Merge: three conflicts, resolved by the reviewer

`integration` had landed `the_active_study_is_a_compact_band_…` (bounded box
plus arrival Fit) while this branch removed the box. The lesson mapped the
conflicts correctly.

1. **`scripts/guard_enumeration.mjs`.** Both sides re-pinned. I re-measured
   on the merged tree: fast 614/614 (= 607 + 7) and browser 721/688
   (= 719/686 + 2). I kept both comments.
2. **`scripts/run_viewer_browser_tests.mjs`, the kinematic arrival check.**
   `integration` asserted "a bounded box that arrives with the study framed".
   The branch asserted "no box of its own". I kept the branch's check, with
   its name and its spec `68054cae` unchanged, and folded `integration`'s
   framing assertion into its condition, measured against the window: the
   lit bars must lie between the topbar and the window bottom. As a result,
   `integration`'s arrival Fit is still pinned on the merged tree.
3. **The "at least six leaders" spec.** Both sides renamed the guard to the
   same name and re-aimed it at different mutations: `integration` drops the
   zoom from the dots, and the branch drops the clip on the bottom edge of
   the dots. I kept **both** mutations in the spec. This also matters to
   `integration`'s
   `ISSUE_20261028_the_seam_dot_clip_lost_both_its_witnesses_…`, because the
   branch's mutation targets that clip line again.

There were no merge-marker lines (I checked with `git diff HEAD | grep`).

## Tests

**Tactical record.** The tactical session recorded a full suite (1594 passed,
1 skipped, 1 failed: the deliberate worktree failure) and all four tiers
against a scratch root. It did not repeat the full browser tier after its
last test edits; instead it re-ran the three touched suites with `--only`.
That record is consistent with the diff, so the benefit of the doubt stands.

**Pre-merge risky subset** (viewer, guard, kinematic and architecture rows):
`pytest -q tests/test_mutation_witnesses.py tests/test_kinematic.py
tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py
tests/test_architecture_inventory.py` gave **143 passed**. I ran it on the
merged tree, because these are the tests the conflict resolution touches.

**Post-merge.** All runs below are against the merged tree at `ad93af9e`.
The tiers that need data ran against a scratch root,
`data/scratch/rv_kinband`. I built every projection there from this
worktree's committed tree, copied `data/inbox`, `data/meshes` and `docs`
into it, and added junctions for `venv-win` and `node_modules`.

| tier | result |
|---|---|
| `pytest -q` (review worktree, single process) | 1594 passed, 1 skipped, 1 failed in 520 s (budget: inside). The one failure is `test_viewer_js_suite_is_green`, the deliberate worktree failure (no projection under the worktree), covered by the next row. This repo's conftest prints no `concurrent pytest processes` / `full-suite lock` header lines. |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | 613/613, no SKIP lines, "[real] the projection this tier reads was built from this tree" PASS |
| `node apps/annotate/run_tests.cjs --repo <scratch>` | 246/246 |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | 35/35 suites, 334 s. Includes "the DAG zoom, Fit and the grid header" 26/26 (with the resolved check), "kinematic study page" 21/21 and "leaders across the seam" 17/17. |
| `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since master` | capped run: 84 of 173 selected entries reached, 83 of those 84 witnessed, in 29m04s, with 89 left to the sweep (budget). The one miss is `d42adbc7`, a decay that predates this work and is already filed on integration (`ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`). The cap stopped before the three entries the conflict resolution touched, so I ran `--only` on them: `fce3b8e5#1` and `fce3b8e5#2` (both leaders mutations) and `68054cae` (the arrival check with the framing assertion folded in) were all **WITNESSED**. |

**Recorded tier times:** default 520 s (inside budget); browser 334 s (inside budget); witness 2050 s, which the recorder marks **over budget by 4m10s**. That 2050 s is shell wall time and includes the wait for the browser slot, which another review held; the runner's own clock is 29m04s, inside its cap. I filed this as `ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`.

**Data the suite could not reach from the worktree:** only the viewer
`[real]` tier through pytest's wrapper, which the `--repo` row covers. The
main checkout's `git status` was clean after the runs, and its shared
`data/projections/viewer/kinematic/` still has its 00:41 mtime, so the runs
wrote nothing to production data.

## Findings

**Blockers: none.**

**Should-fix: none that is unowned.** The open points the author found are
already filed with frontmatter:
- the datum question and the 64.44 vs 64.466 mismatch
- the dead bounded-pane code
- the chart text dropping below the type scale in a narrow pane
- the travel band being only a few pixels wide

**Nits (not filed):**
- `docsHref` hard-codes `"../../"` instead of using the HTTP adapter's
  `textDir`. It is correct today, because the link is offered only where
  `canReadWorksheets` is true, and the only HTTP layout that reaches `docs/`
  is the repo-root one.
- `sharedBandNote` says "travel band" even though the band logic is generic
  over any study that moves the driver. There is only one such study today.

**Design:** I read the changed surface against the visual-hierarchy rules
and the prose budget and found no violation. The band note is one line; the
readouts are a right-aligned data table; the bands use the existing fills at
lower alpha, as the handoff asked. The narrow-pane text scaling is the one
design issue, and the author already filed it.

## Overlay

I added one **Recurring bugs** entry: two branches renaming the same guard to
the same new name, which merges as add/add plus rename/delete, with each side
re-aimed at a different mutation.
