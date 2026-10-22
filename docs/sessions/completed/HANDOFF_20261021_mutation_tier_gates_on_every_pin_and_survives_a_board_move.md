---
priority: med
depends_on: [the_kinematic_study_checks_its_run_its_units_and_shows_its_limit]  # both edit CLAUDE.md's Environment bullets (inputs list vs must-run list); land that one first so the two edits do not cross
model: sonnet
---

# HANDOFF 2026-10-21 — mutation_tier_gates_on_every_pin_and_survives_a_board_move: the mutation-witness tier's exit code reads every census pin, and a spec's cited handoff survives the board move

Source: the 2026-10-21 triage sweep, from three `guard_cannot_fail` issues
about the mutation-witness tier itself:

- `docs/issues/ISSUE_20261020_a_mutation_spec_citing_an_active_handoff_reddens_pytest_when_that_handoff_completes.md`
- `docs/issues/ISSUE_20260930_the_mutation_witness_tier_gates_on_one_of_the_three_census_pins.md`
- `docs/issues/ISSUE_20260930_the_browser_guard_scan_is_the_one_never_paired_against_a_run.md`
- `docs/issues/ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md` (item 4)

Read all four first. Each one carries the exact code and the options.

Baseline: tolstack `master` at or after `9ce8262`. The sibling the census-pin
issue waited on (`projection_freshness_pairs_with_the_tree`) has landed.

Scope: `scripts/run_mutation_witness_tests.mjs`, `scripts/guard_enumeration.mjs`,
`tests/test_mutation_witnesses.py`, `scripts/mutation_witnesses/README.md`
(the spec-shape section), a new `tests/test_annotate_js_suite.py`,
`package.json`'s scripts, and the `CLAUDE.md` must-run list. Change the collection seam in
`scripts/run_viewer_browser_tests.mjs` only if item 3 needs it, and only that
seam. Do NOT touch the browser runner's test blocks, which the staged
`browser_tiers_name_their_failure_instead_of_aborting` owns. Do NOT touch any
kinematic file, which the staged
`the_kinematic_study_checks_its_run_its_units_and_shows_its_limit` owns. Do
not edit dispatch: option 1 of the first issue is dispatch-side, so it is out
of scope.

## Deliverables

1. **A cited handoff survives the board move.** Take option 2 of the first
   issue. `test_the_issue_each_mutation_cites_is_in_the_tree` resolves a
   cited `docs/sessions/{,active/,completed/}HANDOFF_*.md` by file name
   across the three board directories, because a handoff's directory is its
   status, not its identity. Add the README line for option 3 too: cite the
   lesson or an issue, never an `active/` path. Pin it with a test that
   plants a spec citing `active/<name>` while the file sits in `completed/`.
   That test must pass, and a name that is in none of the three directories
   must still fail.
2. **The tier's exit code reads all three pins.** In
   `run_mutation_witness_tests.mjs`, filter on `pinsMoved` (already exported
   from `guard_enumeration.mjs`, and what `censusHolds` is computed from)
   instead of `r.declared !== r.pinned`. Widen the message so it prints each
   moved pin's own sentence and the `pinLine` to paste back. Show the
   arrivals the issue names: a guard swapped for another in one change, and
   a second declaration of an existing name. Each should now make the tier
   exit non-zero. Run it with a planted swap against a scratch copy, never
   against the main checkout's tree.
3. **The browser guard scan is checked against a run, `ran ⊆ declared`.**
   Leave out the interpolated names, which the enumeration already flags
   `enrollable: false`. Every sub-check name a browser run prints must be in
   the scanner's `declared` set, or the run reports it as a scanner miss by
   name. Pick where the check lives (the browser runner's tail or the
   mutation tier) and say why in the lesson. The issue leans toward the
   browser runner because it already collects every name. Do not attempt
   equality: the issue explains why it is false there by construction.
4. **The annotator's node suite gets a gate.** This is
   `docs/issues/ISSUE_20260918_the_annotate_js_suite_is_run_by_no_gate.md`,
   folded in because it is the same question: which tier's exit code anybody
   reads. Nothing runs `apps/annotate/run_tests.cjs` (205/205 by hand at the
   2026-10-21 merge). Add `tests/test_annotate_js_suite.py`, modelled on
   `tests/test_viewer_js_suite.py`. It should fail when node is absent and
   fail on a reported SKIP, and its `[real]` checks must get the **same**
   answer the viewer wrapper gives for a worktree. Add `test:annotate` to
   `package.json`, and add the command to `CLAUDE.md`'s pre-merge must-run
   list next to `node apps/viewer/run_tests.cjs`.

## Definition of done

- The board move no longer reddens pytest, shown by the planted-spec test. A
  planted swap and a planted duplicate each make
  `node scripts/run_mutation_witness_tests.mjs` exit non-zero, with the moved
  pin named. A browser name planted outside the scan is reported.
- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`,
  `node scripts/run_viewer_browser_tests.mjs` and the full
  `node scripts/run_mutation_witness_tests.mjs` (not `--only`) are green in
  the main checkout. Quote the census lines from the full run in the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20261021_mutation_tier_gates_on_every_pin_and_survives_a_board_move.md`):
  where the subset check lives and why, the exact planted cases and their
  outputs, and the full-run wall time (it is the slowest tier, about two
  hours on 2026-10-21 with other suites sharing the machine).
