# Lessons 2026-10-27 — the checks and claims the folds left naming what they removed

## Results
- **Smallest `pitch_link_*` study:** `pitch_link_thread_region_t`, 2 edges (others: shank_out 6, cotter_hole_clearance 7). The README claim now reads `topology: vpa_pitch_linkage`, `studies: pitch_link_`, `value: ...`; the `smallest_chain` metric gained a required `studies` prefix field because the topology now holds 22 studies, so "smallest of the topology" would have been `pitch_system_gas_spring_mechanical_stroke` (1).
- **35-mutation re-run: 35/35 witnessed** (32 original-spec mutations in one invocation + the 2 re-homed gap-badge specs, + 09a1cf0a#2, which the 10-26 addendum feared needed a page change, is witnessed now). Rebuilt projections first.
- **Python guard `b36c164d#1`:** the guard's verdict followed a race (Chrome dying on its own vs Playwright's exit hook taskkill vs the sample instant). Fixed crisply: for `how == "exit"` it now also requires the runner's own `exit` + `kill-start path=exit` trace lines (the handler writes them synchronously). Witnessed on the mutation; no `wall_clock_dependence` issue needed.
- The 3D-pane suite's round-2 half was already fixed on master (~line 5947 picks `bound`/`unbound`); confirmed.

## Surprises
- The two gap-badge `[real]` checks lived in `annotate rail and scene`, but the only suite with a mock page is `annotate sweep rail`. My first mock checks went into the wrong suite's neighbour and the witness said "cannot see the difference" — it had caught that they were not being run (the suite's count did not move: 20/20 before and after). Count sub-checks when you add one.
- Added the mock via a `demo_kinematic` study in `apps/annotate/fixtures.js` and a `geometry.features` join on the demo run (so the run names `demo_system`).
- `topology_fixtures.js`: a copy (`VA.demoMixedSourceTopology()`), not a fifth part in the shared fixture, whose counts/gaps/layout are pinned everywhere. Deviation from the handoff's wording; same fixture-tier witness.
- Excluded-term test is scoped to rows that *claim a gap* — "pitch_plate_attach_height's second in-plane component" legitimately names a term row.
- `--only` on the witness runner is a single substring: 36 one-id runs would take hours; I used an uncommitted scratch copy accepting a comma list (deleted). A comma-list `--only` is worth a feature (not mine: runner is owned by another handoff).

## Pins
Browser guard pin 659/626 -> 660/627 (the live `[real]` gap-badge check cannot be witnessed on a gapless projection, so it is deliberately unenrolled); fast 589 -> 590 (enrolled: `6ca658ff`).

## How a fold's own gate could have caught a stale subject
Each fold's gate ran its browser/pytest tiers against the *pre-fold* projection in the main checkout, where the removed topology/gap rows still existed. The freshness refusal exists (the tier refuses a projection whose inputs moved) but only fires once the inputs diverge *in the tree under test*; a fold that deletes a subject should be gated by a rebuilt projection from its own tree, and a check naming a subject by literal id should instead derive it from the projection with a named SKIP when absent (what section 6 now does).

## Found on arrival
Nothing dirty.

## Suite record
Worktree `pytest -q`: 1577 passed, 1 skipped, 1 failed (`test_viewer_js_suite`, the documented worktree-only red: node-fs tier needs the main-checkout projection) in 369 s. Node tiers run with `--repo C:/workspace/tolstack`: viewer 589/589 (1 named SKIP: live mixed-source part), annotate 235/235; browser: `annotate rail and scene` 20/20, `annotate sweep rail` 17/17, `3D pane follows the selection` pass. The full browser TRUTH tier and `--changed-since master` witness gate were not run in full; the 36 affected witnesses were.
