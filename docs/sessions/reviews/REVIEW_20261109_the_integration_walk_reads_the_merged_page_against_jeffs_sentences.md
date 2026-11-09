---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-11-09 — the_integration_walk_reads_the_merged_page_against_jeffs_sentences

**APPROVE, 0 blockers.** I made one inline fix, a stale comment.

## What the branch is

The branch has 2 commits (`7a68775e`, `86cbe48f`) and 68 files, all added (`A`; nothing overwritten):

- 7 issues;
- 1 lesson;
- 59 shots;
- `tests/debug_integration_walk_20261108.mjs`, a hand-run probe the handoff allows.

It changes no product code, test, projection builder, guard or witness spec. The branch was cut from `integration` `4abddff3` and is not already contained in `integration`. My merge was a clean fast-forward-shaped merge, and `integration` has not moved since.

## Verified

- **The DoD.**
  - The lesson has both tables, the served commit (`4abddff3`), the v1→v2 switch and a last line.
  - Every shot the lesson names is in the shots folder.
  - All 7 issues pass `dispatch.cli check-issue`.
  - Both sentence issues (S9; S10+S13) are `priority: high`, as the handoff asked.
  - Each issue carries `found_by:` and no `handoff:`.
- **The lesson's arithmetic, re-derived.**
  - The table's own verdicts give 11 `yes` (S1, S3–S8, S11, S12, S14, S15) and 4 `partly` (S2, S9, S10, S13), which is 15. The 7 issues match the 7 files.
  - The suite line `1 failed, 1890 passed, 1 skipped, 2 deselected` matches my post-merge run exactly.
- **Every issue the lesson calls "already filed" exists** on the merged tree. That is 7 cited files, each present once.
- **The shots, spot-checked against their claims.**
  - `s15_row_selected_1600`: leaders are drawn on the dark theme, dimmer than the rails. S15 being false holds.
  - `demo_4_sweep_playing`: leaders run across the seam, the "folder needed" chip is visible, the grid has shrunk to a gutter strip, and the Bodies list reads `base · 3 parts`.
  - `demo_8000_4_sweep_playing`: zebra bands under the DAG, grey/teal containers, no seam leaders. This confirms the 8000-serves-master issue.
- **The probe.**
  - It takes the browser slot (`takeTheBrowserSlot`) and launches through `scripts/browser_runner.mjs`.
  - It writes only shots.
  - `git grep "chromium.launch("` finds no launch outside the helper.
- **The `needs: jeff` issue (8000 serves master).** Its `ask:` is a batch merge, which only the operator does, and it is finished once he has done it. Both halves of the test hold.
- **Stack mandatory checks 1–7.** None apply: no stack, element, band, path term or ratio changed. The traced ratio is untouched.
- **Design check.** No user-facing surface changed. The walk's own findings about the surface are filed as issues.

## Tests

The tactical report recorded a full-suite run: worktree, 418 s, 1 failed (the deliberate worktree red) / 1890 passed, plus the viewer tier via `--repo` at 671/671. I gave it the benefit of the doubt.

- **Risky subset, pre-merge (docs-only diff + one `tests/*.mjs`).** I ran `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_architecture_inventory.py tests/test_mutation_witnesses.py tests/test_claims_registry.py`: **265 passed** in 106 s. I left out `tests/test_browser_runner.py`: it reads only `scripts/browser_runner.mjs` and its witness, never debug probes.
- **Full suite, post-merge, in the review worktree.** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` gave **1 failed, 1890 passed, 1 skipped, 2 deselected** in 417 s, recorded with `dispatch suite-time` (inside budget).
  - The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented worktree red.
  - tolstack's conftest prints no contention header lines, so there are none to quote.
- **Viewer tier against real data.** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave **671/671**.
- **Not run:**
  - the browser TRUTH tier;
  - `apps/annotate/run_tests.cjs`;
  - the mutation-witness `--changed-since`.

  The diff touches no code, guard or spec, so a hunk-based selection has nothing to reach.
- **Data pollution.** The main checkout's `git status` was clean and its `data/` held 37531 files both before and after the full suite.

## Findings

- **nit, fixed inline** (`tests/debug_integration_walk_20261108.mjs`, header). The usage line and phase list named `probe|walk|demo|models|all`. The lesson's reproduce line uses `pane3d` and `demo8000`, and both exist at the dispatch block. I added both to the header. The change is a comment only, and `node --check` passes. Commit `210ebea5`.

## Note for the next reader

The walk rebuilt the **main checkout's** projections from integration, as the handoff's step 1 ordered. So until the batch merge, port 8000 is master code over integration-built data, and a main-checkout `[real]` tier run on master may refuse those projections. The lesson and the 8000 issue both say so, and the batch merge resolves it. I added an overlay entry: a shot of "the merged page" from 8000 is trunk's page.
