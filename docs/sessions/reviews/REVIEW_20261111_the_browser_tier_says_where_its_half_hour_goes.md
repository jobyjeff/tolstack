---
type: review
handoff: docs/sessions/active/HANDOFF_20261110_the_browser_tier_says_where_its_half_hour_goes.md
reviewer: agent
date: 2026-11-11
verdict: APPROVE
blockers: 0
---

# Review — the browser tier says where its half hour goes

Diff: per-suite `TIMING` table + ledger row in `run_viewer_browser_tests.mjs` (full runs only), slot-wait stamp in
`browser_runner.mjs`, one who-runs-what table in `CLAUDE.md`, new `docs/prompts/TACTICAL_AGENT.md`, one sentence in
`REVIEW_AGENT.md`. No `apps/`, assertions or witness logic touched.

## Verified
- `node --check` on both scripts; `tests/test_mutation_witnesses.py`, `test_browser_runner.py`, `test_claims_registry.py` green.
- Smoke: `--only "rail suggestion"` (node_modules junction removed afterwards) prints the TIMING table; no ledger row for a filtered run.
- `pytest -q` after merge, worktree: 1927 passed, 1 skipped, 1 failed (the documented worktree-only `test_viewer_js_suite`), 431 s.
- Not re-run: the whole browser tier (author ran it once: 2,723 s, 43/44; the failing suite is a baseline abort, filed as an issue) and the witness gate (no spec changed).

## Findings
None blocking. Notes:
- Deliverable 2 took nothing out (one boot per suite, 42 s of fixed sleeps in total); the lesson says why and files the origin-pair
  saving (~250-300 s) for strategy, since it would remove executed assertions. Consistent with the "no assertion deleted" fence.
- Slot wait is one number, not per-suite (the slot is held for the whole process) — sound deviation, documented.
- Ledger row has `handoff`/`role` null; cosmetic.
