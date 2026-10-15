# Lessons — annotate_gated_browser_suites_follow_the_three_part_mock (2026-10-15)

## Cause, per red sub-check: all seven were stale checks, none an app defect

Dumped `#parts-panel li.part-row` at each failing step before touching anything.
The panel is now a header row (`part-row--head`) + the model's rows + a folded
"Other parts" `<details>` whose rows are *nested inside* `#parts-panel`, so the
old `#parts-panel li.part-row` counted header + model + others. Real values
(mock, three installed meshes): unfiltered/element-scoped = head + 1 in model +
2 others; meshless element = 0 in model, no header, 3 others. The app is doing
what `a_context_filter_and_a_view_filter` designed; the claims still hold.

Re-expressed, claims kept (names unchanged, so mutation specs keep their keys):
- rail: `parts()` = every listed mesh, header excluded, expected total read from
  `FIXTURES.meshProvenance` (no hand-typed 3); `modelParts()` = the "in this
  model" group. Meshless element: model group 0, no header, every mesh listed
  as other, and the "why" note.
- top bar: "that element's part alone" now means model group 1 **and the drawn set
  is exactly that part** (`drawnAlone`) — stronger than before, since the list
  count no longer separates the part from the rest.

Before/after: rail 29/32 -> 34/34 (32 + 2 placement checks); top bar 26/30 ->
30/30; full browser tier 23/25 -> 25/25.

## A mutation spec was a silent no-op

`148e0e1f` mutated `listedMeshes()`, which nothing has called since the context
handoff. Re-greening the suite alone would have left it "NOT WITNESSED". Retargeted
to `contextBaseShas` (`return null;` before the plan). Dead function filed:
`docs/issues/ISSUE_20261015_listedmeshes_in_the_annotator_has_no_caller_since_the_context_filter_handoff.md`.

## Placement rule ported into the gated tier

Two new sub-checks in the rail suite (`pickSameFaceBothWays` copied from
`apps/annotate/run_browser_check.mjs`): drawn placements equal the fixture's two
`placement_world`s; a real-raycast pick on occurrence 1 names the same
(sha, face) as at the part's origin. Specs (both witnessed):
- every-occurrence check: `placementsFor` returns `null` (the handoff's mutation).
- pick check: **that mutation does not witness it** — the first check throws
  before the pick check runs, so the tier goes red on the wrong guard. Its spec
  instead gives repeat occurrences a wrong `sha256` in `scene.js` `_setRepeats`.
`guard_enumeration.mjs` browser pin: 521/490 -> 523/492 (+2 enrolled).

## Notes

- Remaining annotate claims checked only by `run_browser_check.mjs` (no gate):
  the sweep-mode placement pass and the context/view pass there (`contextViewPass`)
  — not ported; only the placement rule was in scope.
- `--only` on the witness runner matches spec entry names, not suite names.
- Worktree needs a `node_modules` junction to the main checkout to run the
  browser tier (gitignored, not committed).
- Did not run `scripts/rebuild_projections.ps1`: it is a main-checkout script and
  this branch is not there; tiers ran against the main checkout's projection
  built at `c51cf49` by triage today (no projection input changed on this branch).

## Verification record (worktree, against the main checkout's projection via `--repo C:/workspace/tolstack`)

- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`: 25/25 (was 23/25).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 522/522.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`: 168/168 witnessed (was 159/166; +2 new specs; the seven misses cleared).
- `venv-win/Scripts/python.exe -m pytest -q` (worktree): 1 failed, 1445 passed, 1 skipped, 2m13s. The one failure is `test_viewer_js_suite_is_green`, the designed worktree red (no projection here).
- Not run: the pytest suite in the main checkout, and `rebuild_projections.ps1` (main-checkout only).
