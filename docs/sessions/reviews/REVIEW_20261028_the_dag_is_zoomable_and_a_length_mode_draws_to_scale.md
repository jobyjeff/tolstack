---
type: review
handoff: docs/sessions/completed/HANDOFF_20261028_the_dag_is_zoomable_and_a_length_mode_draws_to_scale.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
note: header added by the 2026-10-29 triage sweep from the body's own "Verdict: APPROVE." line; body unchanged
---

# Review — the_dag_is_zoomable_and_a_length_mode_draws_to_scale (2026-10-28)

**Verdict: APPROVE.** Merge of `handoff/the_dag_is_zoomable_and_a_length_mode_draws_to_scale`
into `review/...` was a clean fast-forward (not previously on `integration`); no conflicts, no
inline fixes.

## What was checked
- Deliverables 1–3 read against the diff: `fitEdgeLength`/`dagHeightBudget`/`collapsed` removed
  (window no longer a budget), `VA.DAG_ZOOM {0.15, 2, 1.15}` with a real-model test re-deriving
  the min, wheel/pan/Fit/`0`, leaders scaled by the painted `k`, header moved to ride with the
  grid (absolute + `pinTopoHead`; the lesson records why `sticky` cannot work — accepted, it
  is measured). Wire-up is idempotent per pane. The stale issue is marked resolved with a line.
- Lesson is present and covers bounds, minimum bar, per-mode height, and anchor space for
  the rearrange handoff (which is staged and depends on this one).
- Tactical record is a full run with counts, tiers armed; benefit of the doubt given.

## Runs (review worktree, main-checkout data via `--repo C:/workspace/tolstack`, `node_modules` junctioned in)
- `node apps/viewer/run_tests.cjs`: 598/598.
- Browser tier: 33/34; crop lightbox failed (launcher focus), **passes alone 20/20**; the
  branch does not touch it. Filed `ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`.
- `--changed-since integration`: 34/35 witnessed, 35/35 reached, 26m53s. The one miss
  (`...selected-in-the-scene__47750d7d`, "tier red before the mutation") was WITNESSED on
  rerun in isolation and the suite passes alone — load flake, same cause as above.
- `pytest -q` (worktree, `--deselect tests/test_viewer_js_suite.py`, which is red by design
  here and covered by the three node runs above): 1590 passed, 1 skipped, 3 deselected, 5m05s.
  Data-gated `[real]` checks ran through the node runners against main-checkout projections.

## Notes
- The lesson's "Verified" paths have a stray tab where `\t` met `C:\workspace\tolstack`
  (cosmetic; left as is).

## Landing
`integration` moved (other handoffs) before the landing; merging it conflicted in
`scripts/guard_enumeration.mjs` only (`DECLARED_GUARDS`). Sides: HEAD = this handoff's pins
(fast 599, browser 697/664, annotate 235); integration = others' pins (595 / 673/640 / 239).
Resolution: the sum, re-derived from the census test's own output — fast 599, annotate 239,
browser 699/666; `tests/test_mutation_witnesses.py` 44 passed. Post-merge: viewer fast tier
598/598; `pytest -q` (deselecting the worktree-red viewer suite) 1590 passed, 1 skipped, 5m11s.
