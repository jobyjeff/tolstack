---
type: review
handoff: docs/sessions/completed/HANDOFF_20261026_bodies_and_studies_carry_forge_tags.md
reviewer: agent
date: 2026-10-26
verdict: APPROVE
blockers: 0
---

# Review — bodies_and_studies_carry_forge_tags (2026-10-26)

**Verdict: APPROVE.**

## Verified
- Merged `handoff/bodies_and_studies_carry_forge_tags` into the review branch (not previously contained in `integration`).
- Topology/tag/projection pytest subset green. Full `pytest -q` (worktree, `test_viewer_js_suite.py` deselected as documented): 1565 passed, 1 skipped.
- `node apps/viewer/run_tests.cjs`: 454/454 passed; node-fs tier SKIPPED (no projection in a worktree, documented).
- The three new guards each `--only` WITNESSED (1/1) in the worktree.
- Validation cases covered by `tests/test_topology_tags.py`: known axis, unknown axis, forge absent. Forge's axes are read from `C:\workspace\forge\identity.toml`, never copied.

## Findings
- **Deviation, accepted:** forge declares `component`, `purpose`, `phase` and no variant axis. The handoff said to file an issue rather than invent one. The author filed the issue (`needs: jeff`) *and* accepted `variant` as one named provisional axis (`PROVISIONAL_AXES`) so the DoD (chips, dimming) is demonstrable. It is isolated to one constant and documented in DAG_TOPOLOGY.md "Tags". Jeff owns the axis decision.
- The `forge_axes` path is hardcoded to the absolute forge path, as the handoff directs.

## Not run here (main-checkout, batch-merge tiers)
Browser TRUTH tier, annotate suite, `--full` mutation witnesses, `[real]` viewer checks against projections.
