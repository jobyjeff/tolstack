---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-15 — the_scene_suite_opens_its_own_pane: "annotate model in the scene" passes run alone, so the witness gate can prove its entries

Source: the 2026-11-15 triage sweep, from
`docs/issues/ISSUE_20261112_the_annotate_model_in_the_scene_suite_is_red_run_alone_and_green_in_the_full_tier.md`
(high). Baseline: tolstack `master` at `f43d02ae`, after the 2026-11-15 batch
merge. Scope: `scripts/run_viewer_browser_tests.mjs` (the suite's setup) and,
only if a page-side seam is genuinely needed, the flyout's open/close in
`apps/viewer/`. This is **not** a viewer feature handoff: it changes no
behaviour Jeff sees, so it does not take the chain's one viewer slot. Do NOT
touch the DAG, grid or tree code. The staged
`the_hub_is_one_part_in_the_grid_and_the_dag` owns those.

## Why it is high

The witness gate runs each browser entry's suite with `--only`. Run alone,
`testAnnotateModelInTheScene` (`scripts/run_viewer_browser_tests.mjs:7265`)
fails all nine `[real]` sub-checks, so every witness entry enrolled in it
reports `NOT WITNESSED (the tier was red before the mutation)`. That was 7 of
the 37 entries one review's gate reached. In the whole tier the same suite is
22/22. Measured 2026-11-12; the table is in the issue.

The red is identical every time:
- the log reads `joints: ; hidden inside them: -; unplaced: 0`;
- one page error: `TypeError: Cannot read properties of null (reading 'getBoundingClientRect')`
  from `document.querySelector("#annotate-flyout iframe")`.

The suite opens the pane with `page.locator("#pane-handle").click()` inside a
`.catch(() => {})`. The page remembers open/closed in storage
(`VA.writeStoredFlyoutOpen`). The issue's unconfirmed hypothesis is that the
click toggles from whatever an earlier suite left stored, so run alone it may
close the pane instead of opening it.

## Deliverables

1. **Confirm the cause, then make the suite state its own precondition.**
   - Reproduce with `--only "annotate model in the scene (anchors, lines, the sweep, the anchors message)"`.
   - Suggested direction: seed the stored flyout state explicitly before
     loading, or open the pane by an idempotent route, then **assert the
     iframe exists** before the sub-checks run.
   - Replace the swallowing `.catch(() => {})` with that assertion, so a pane
     that fails to open is a named failure and not nine downstream reds.
2. **Every other suite that opens the pane the same way.** Grep for
   `#pane-handle` clicks inside a swallowed catch. Convert the same way, or
   list each one and why it is safe.

## Definition of done

- The suite passes run alone (`--only …`) **and** in the whole tier,
  `node scripts/run_viewer_browser_tests.mjs`. Quote both results in the
  lesson. Record the whole tier's wall time with
  `suite-time record --tier merge`.
- The witness gate, `node scripts/run_mutation_witness_tests.mjs --changed-since master`,
  reaches this suite's entries and reports them witnessed, not "red before the
  mutation".
- Default tier green, with the absolute interpreter path from a worktree:
  `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`.
- The issue set to `status: resolved` with a one-line `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_scene_suite_opens_its_own_pane.md`):
  the confirmed cause, and which other suites shared it.
