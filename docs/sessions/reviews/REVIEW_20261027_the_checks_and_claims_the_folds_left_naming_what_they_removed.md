---
type: review
handoff: docs/sessions/active/HANDOFF_20261027_the_checks_and_claims_the_folds_left_naming_what_they_removed.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review — the_checks_and_claims_the_folds_left_naming_what_they_removed

**Verdict: APPROVE, 0 blockers.** Reviewed in a role-limited pass (diff read for
the five deliverables; not a line-by-line audit of every witness spec).

## What I verified
- Tactical report records a full-suite run (1577 passed / 1 documented worktree-only red), 35/35 witness re-run, node tiers and the annotate rail suite -- consistent with the diff; benefit of the doubt given, no full pre-merge suite.
- Rebuilt the topology, viewer-results and kinematic projections from the merged tree (`--data-root C:/workspace/tolstack/data`; `rebuild_projections.ps1` refuses a worktree, so the builders were run directly). Kinematic: 1 of 1 studies built.
- **Pre-merge subset** (touched modules): `tests/test_kinematic.py`, `test_viewer_readme_doc_facts.py`, `test_claims_registry.py`, `test_browser_runner.py` -- 122 passed on rebuilt projections.
- Node tiers vs main-checkout data: viewer 589/589 (1 named SKIP, the live mixed-source part), annotate 235/235.
- Browser: `annotate rail and scene` passed (run from the main checkout's runner against this worktree; the topology REAL tier is skipped by the runner there, so the live-gap path rests on the tactical's 20/20 plus the new `[mock]` fixture gap row).
- **Post-merge full `pytest -q`** in the review worktree: 1585 passed, 1 skipped, 1 failed in 371 s. The failure is `test_viewer_js_suite` (node-fs tier needs the main checkout's projection) -- the documented worktree-only red; the same tier is green above. Not exercised here: the full browser TRUTH tier and `--changed-since` witness gate (neither run by tactical in full; the 36 affected witnesses were).
- Items 1-5 each landed: gap-badge checks pick from the projection with a named SKIP plus a `[mock]` witness; README `smallest_chain` re-pointed (`vpa_pitch_linkage`, `studies: pitch_link_`); stale `excluded_terms` rows removed and pinned by a test; qualifier fixture witness enrolled; exit-handler guard reads the handler's own trace line.

## Notes
- Side effect: the shared `data/projections/` in the main checkout now holds a projection built from this tree (the handoff's own instruction).
- Not independently re-run: the 35-mutation witness re-run (trusted from the lesson).
