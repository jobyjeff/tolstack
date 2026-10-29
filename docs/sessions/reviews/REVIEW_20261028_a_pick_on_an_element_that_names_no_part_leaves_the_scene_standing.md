---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing.md
reviewer: agent
date: 2026-10-28
verdict: REQUEST CHANGES (round 2)
blockers: 3
---

# Review — a pick that names no part leaves the scene standing

Branch `handoff/a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing` (1 commit, 8fc01bb3).
Merged into the review branch for testing, then **reset out again** — nothing was merged to `integration`.

## Blocker 1 — the new browser spec for the gap edge is red on the real tier

`[real] Pick on a gap edge that names no part leaves sweep mode ...` (`scripts/run_viewer_browser_tests.mjs`,
in `testAnnotateSweepRail`) **FAILS** against the real kinematic page
(`--repo C:/workspace/tolstack`, merged tree). The tactical agent could not run the tier and said so.

Cause, measured with a temporary diagnostic: the Pick button on the gap-edge row is `isVisible() === false` because
the joint's `<details>` is collapsed, and the click is wrapped in `.catch(() => {})`, so nothing is pressed and the
check fails vacuously (`afterGap.note === ""`, state unchanged). With the row's `<details>` opened first, the same
check **passes**, and the whole `sweep rail` suite goes 19/19 — so the **implementation is correct**; the spec does
not drive it. Fix is test code (open the ancestors of the row before clicking, and do not swallow the click's
failure) — this fails inline prong 2 (the fixed spec is the deliverable's proof), so it goes back.

Also worth fixing in the same pass: the swallowed `.catch(() => {})` on the click turns "could not press" into a
red check that reads as a product bug; assert the button was pressed.

## What passed

- `node apps/annotate/run_tests.cjs` 239/239; `node apps/viewer/run_tests.cjs` 485/485 (node-fs tier skipped in a worktree, as documented).
- Real tier (merged, `--repo` main checkout): `the return control shows after a re-pick and restores sweep mode ...` **PASS**.
- Design matches the handoff: the refusal is decided before `leaveSweep`; the return control is mirrored; "Show all" reloads parts; `followSelection` forced re-drive.
- Touching `apps/viewer/topology_app.js` contradicts the handoff's "do not touch `apps/viewer/`" but deliverable 3 requires it (`followSelection` lives there); acceptable, and the diff is small.

## Not attributable to this branch (not re-measured on the baseline)

The same run also reported `3D pane follows the selection` (4 body-disclosure/checkbox sub-checks) and `crop lightbox`
launcher-focus as FAIL. Neither touches code this diff changed; the tactical agent should confirm they fail the same on
`integration` before the rerun, so the next review is not left guessing.

## Other

- The agent's filed issue (node-feature Pick on a gap edge refuses with end-node links that refuse identically) is a real
  dead end: the row note links to rows that refuse the same way. Left as filed (`audience: strategy`); not a blocker here.
- Mutation-witness specs for the two new browser guards were added but unmeasured; run
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration` once the spec is green.
- The tactical agent's lesson file is present and lists the stranding gestures as asked.

## Re-run 2026-10-28 — round 2: REQUEST CHANGES

Merged `d8cc0e07`, ran the real tier from the worktree with a `node_modules` junction and `--repo C:/workspace/tolstack`
(that is how the tier runs outside the main checkout — the author's "could not run it" was avoidable, and the
`--repo` flag is the documented escape hatch). The merge was reset out again; nothing reached `integration`.

**Round-1 blocker, still red.** `d8cc0e07` opens the joint but the Pick button is also **hover-only**: it needs
`await gapRow.hover({ timeout: 5000 }).catch(() => {});` before the press (I confirmed with it: sweep rail 19/19,
and `3D pane` 32/32 twice — the one 3D-pane failure in the full run was load flake). Please add that line.
(I did not fix it inline: I had already used the inline allowance for a test edit this review, and the witness
failures below need your hand anyway.)

**Blocker 2 — two new witness specs enrolled against the wrong suite.** `browser__real-pick-on-a-gap-edge…e24364c6`
and `browser__real-the-return-control…3ccadc21` both declare `"suite": "annotate rail and scene (…)"`; both checks live
in `annotate sweep rail (the mechanism, contributors, re-pick, bind snapshot)`. The mutated run executed the wrong
suite, so the tier stayed green: "NOT WITNESSED — the witness cannot see the difference". Correct the suite, then
re-run `node scripts/run_mutation_witness_tests.mjs --only <guard>` for each.

**Blocker 3 — a decayed existing witness.** `browser__real-selecting-a-chain-study-in-the-nav-leaves-sweep-mod__9a4a093f#2`
("An open pane follows the selection after every paint") is NOT WITNESSED: with its mutation applied the tier
reddens *other* checks (`resting on a bound contributor row tints its face…`, `clicking a contributor row with the
pane open keeps the page on the study…`) and not the declared one. That mutation is in the code this branch changed
(`followSelection`, the forced re-drive), so the new `forcePaneFollow` path most likely now masks it. Re-point or
re-anchor the mutation so it reddens its declared check, or say why it no longer describes a defect.

Other results: 15/18 witnesses WITNESSED (the three above are the rest); annotate 239/239; viewer 485/485; `pytest -q`
(excluding the worktree-only viewer-suite file) 1590 passed, 1 skipped.
