---
type: review
handoff: docs/sessions/active/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# Review: the two red browser suites on trunk go green against a fresh projection

**Verdict: APPROVE.** Both diagnoses hold. In both suites the check was
wrong and the product was right. Each fix narrows its check to what it was
meant to assert, and neither drops an assertion. One red is left on the
merged tree. It comes from a different handoff already on integration, and it
is filed as a high-priority issue (below).

Branch reviewed: `handoff/…` at `88e1f95d`, 4 commits, all `M` on the issues
and the runner, plus an `A` lesson. Nothing was overwritten. The handoff was
not already on integration, so the merge was real.

## Not a tolerance stack

The diff touches test harness code and docs only. The seven mandatory stack
checks (source refs, signs, LMC/MMC, RSS, nominal in band, quantised
constraints, traced ratio) have nothing to check: no element value, band or
`confidence` changed.

## What I verified

**Deliverable 1, rail holds still: the check, not the product.**

- Confirmed in `data/projections/feature-identity/bindings.json`:
  `pitch_link_length` is `bound`, both ends ratify `proposal-0001`/`-0002`,
  and `proposals: []`. A bound end with nothing open lists no candidate, so it
  has no `Take`.
- The rewind (`acceptedOnlyProposals` plus the `unaccept` option) serves the
  raw proposal events. They have the same shape as an open record's
  `proposals[]` in the projection (checked against `bolt_length_11`'s
  `proposal-0042`). The filter is strict: the record must be accept-only,
  with no rejection, no supersede and every proposal event on disk. If no
  record qualifies, the result is `take target {"joint":null}` and the Take
  check goes red. That is a loud failure, not a skip.
- `takeTarget` reads the pane's own rows and needs both ends of one edge open
  and listed. The live run picked `plate_slide`, matching the lesson. No
  second name is hard-coded.
- The edge-feature exclusion is still asserted against the chosen edge, with
  a boundary on the regex so it doesn't match a longer id.

**Deliverable 2, the model drawn alone: an off-screen dot.**

- On the merged tree the log prints the full `skipped` breakdown. It matches
  the lesson's table exactly: `noAnchor` hub ×2, `offDag` ×4, `offScene` none,
  no dot none, unled dots at (843, 1615) and (843, 1563) in a 1500px window.
- The new predicate requires every joint node on screen to be led. It then
  scrolls to each off-screen node and requires it led there too. All four
  joint nodes are still asserted. A node with no position fails, and a redraw
  that never comes throws. The raw skeleton point was not reinstated.
- The `drawnSettled` change (no mesh load in flight, then wait for the whole
  model) reads `__scene._loading`, which exists (`apps/annotate/scene.js:211`,
  a Map). The exact `===` count is unchanged.

**The lesson's numbers.** I re-derived them: the three served edges, the
take target, the skip lists and coordinates, and the 3d04f5cd provenance
stamp (`bindings.json`'s `head_sha`). All agree.

**Issues.** Both reds are `status: resolved` with a `resolution:` line. The
related leader issue went back to `open` with `handoff:` removed, which is
right, since this work did not fix it, and it has an addendum. The
over-budget measurement was appended to the open browser-tier budget issue,
not filed as a twin.

## The merge, and its conflict

`integration` had moved (`a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list`,
`6e0058ca`). It conflicted with this branch in one hunk, at the end of
`testModelDrawnAloneAndLed`:

- **Integration's side:** the old leader predicate
  (`led.joint.every(...)`), followed by two new sub-checks: "the end-stop
  model still draws as many parts as it has, and no context" and "every part
  of the end-stop model's bodies is posed with its own body".
- **The handoff's side:** the new leader predicate (on-screen plus
  scrolled-to).
- **Resolution:** I kept the handoff's predicate and both of integration's
  new pushes, and dropped only the old predicate. There are no marker lines,
  and `node --check` is clean. The suite now has 4 sub-checks, not 2.

## Tests

| Run | Where | Result |
| --- | --- | --- |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the model drawn alone and led"` | merged tree, main-checkout projections (3d04f5cd) | **4/4** PASS |
| `… --only "rail holds still"` | merged tree | **16/17**: the `rows say what they are` sub-check, from integration (see the finding) |
| same, with a scratch one-line probe in `missingPartRow` (reverted) | merged tree | **17/17** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | merged tree | 2/4 WITNESSED, 402 s. Both model-suite entries (`2d0a465e`, `fdb6eaa8`) were WITNESSED. The rail entries `d97c0520` and `0037f3b0` were skipped as "tier already red with NO mutation applied", for the same integration reason |
| full `pytest -q` | review worktree, post-merge | see "Post-merge full suite" below |

I gave the tactical agent's recorded runs the benefit of the doubt: 17/17,
2/2, full tier 44/44 in 1822 s, the witness gate 4/4, and the six rail
witnesses plus `f697d046` all WITNESSED on its branch. The record is
consistent with the diff. I did not re-run the full browser tier.

## Findings

**should-fix, outside this diff: a body's part with no mesh has no row kind
in the sweep rail.**
Filed as `docs/issues/ISSUE_20261109_a_body_part_with_no_mesh_has_no_row_kind_in_the_sweep_rail.md`
(`priority: high`).

- `missingPartRow` (`apps/annotate/app.js:3254`) never calls `railLook`.
- Since `6e0058ca` the Bodies list reads the model's bodies, so
  `fastener family` and three `flanged bushing …` rows reach it.
- That defect was introduced while this suite was already red, and it was
  hidden there.
- It keeps the rail suite at 16/17. It also blinds that suite's witnesses,
  including the DoD's `f697d046`, on integration until it is fixed.
- It is not this handoff's defect, and fixing it is a product change, so I
  did not fix it inline.

**nit: the rail's `[real]` names no longer say the data is part-rewound.**
The Take sub-checks now run on a projection with three accept-only records
served as they stood before the accept. The rewind is documented in a
comment and logged (`served unanswered: …`), but the sub-check names still
read as plain `[real]`. No action needed.

## Inline fixes

None. The only edit to the work under review is the conflict resolution
above.

## Overlay

Added a **Recurring bugs** entry: "A suite that is already red hides the next
defect landing in it". It says to compare the list of failing sub-check
names before and after a merge, and to re-run a fixed suite on the merged
tree.

## Post-merge full suite

| Run | Where | Result |
| --- | --- | --- |
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider` | review worktree, merged tree, single process | **1 failed, 1890 passed, 1 skipped, 2 deselected** in 414 s, inside the 10-minute default budget (recorded) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | merged tree, main-checkout data | **671/671** |
| `node apps/annotate/run_tests.cjs` | merged tree | **306/306** |
| prose subset: `tests/test_tolerance_stack.py`, `test_provenance.py`, `test_thermal_exception_list.py` and `test_claims_registry.py` (for the overlay edit) | review worktree | **222 passed** |

- **The one pytest failure** is the deliberate worktree red,
  `tests/test_viewer_js_suite.py`. It reports no projection under the
  worktree's `data/`. The tier it guards ran 671/671 through `--repo` (the
  row above).
- **Contention header lines:** this repo's conftest prints neither
  `concurrent pytest processes at start` nor `full-suite lock`. The grep came
  back empty.
- **The witness gate's 402 s** was recorded as the merge tier, inside budget.
- **Left unexercised:** the full browser tier (44 suites) was not re-run here.
  The tactical record is 44/44 in 1822 s. Only the two changed suites were
  re-run on the merged tree.
- **Data pollution:** the main checkout's `git status` was clean after every
  run. The `node_modules` junction was removed after the last tier run.

## Landing note

The review branch had been cut at `43333bdf`, while `integration` was at
`e3795300`. The commits in between were four board and issue commits (the
folded-part handoff's `active -> completed` move, its issues marked
resolved, and two master syncs), with no code. Every merged-tree run above
was on `36c0cda3`, which already carries the folded-part *code*. After
`git merge integration`, the prose guards were re-run (201 passed), and the
branch fast-forwarded `integration` `e3795300 -> d5f0520e`.
