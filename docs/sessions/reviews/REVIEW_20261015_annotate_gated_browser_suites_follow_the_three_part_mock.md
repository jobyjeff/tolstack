---
type: review
handoff: docs/sessions/active/HANDOFF_20261015_annotate_gated_browser_suites_follow_the_three_part_mock.md
reviewer: agent (review/annotate_gated_browser_suites_follow_the_three_part_mock)
date: 2026-10-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-15 — annotate_gated_browser_suites_follow_the_three_part_mock

**APPROVE.** No blockers, no inline fixes. First review of this slug.

## What was checked

- Diff is confined to the handoff's scope: `scripts/run_viewer_browser_tests.mjs`,
  `scripts/mutation_witnesses/` (2 new specs, 1 retargeted), the pinned census in
  `scripts/guard_enumeration.mjs` (+2/+2), a lesson, and one filed issue. No
  touch of the fenced files (`sweep.js`, docs, the witness runner).
- The seven red sub-checks were stale counts, not app defects. The rewrites keep
  each claim (names unchanged), exclude the header row, and read expected
  totals from `FIXTURES.meshProvenance` rather than a hand-typed 3. The
  top-bar "alone" checks got stronger (`drawnAlone`).
- Placement rule ported into the gated rail suite (drawn placements == fixture's
  two `placement_world`s; real-raycast pick on occurrence 1 == origin pick).
- Good catch by the author: the handoff's own mutation (`placementsFor` -> null)
  does not witness the pick check (the first check throws first), so that spec
  uses a different mutation in `scene.js`. Also found that spec `148e0e1f`
  mutated a function with no caller (a silent no-op), retargeted it, and filed
  the dead function as an issue.

## Verification (merged tree, review worktree, `--repo C:/workspace/tolstack`; node_modules junctioned)

- `run_viewer_browser_tests.mjs`: 25/25 (annotate rail/top bar suites green).
- `apps/viewer/run_tests.cjs`: 522/522.
- `run_mutation_witness_tests.mjs`: 168/168 declared mutations witnessed.
- `pytest -q` (worktree, `--deselect tests/test_viewer_js_suite.py`, the designed
  worktree red): 1445 passed, 1 skipped.
- Not run: `rebuild_projections.ps1` (main-checkout only); the tiers read the main
  checkout's projection built at `c51cf49`, and no projection input changed here.

## Findings

None blocking. The unfixed observation (dead `listedMeshes()`) is already filed:
`docs/issues/ISSUE_20261015_listedmeshes_in_the_annotator_has_no_caller_since_the_context_filter_handoff.md`.
The sweep-mode placement pass and `contextViewPass` remain checked only by the
ungated `run_browser_check.mjs`; the lesson says so, and it was out of scope.
