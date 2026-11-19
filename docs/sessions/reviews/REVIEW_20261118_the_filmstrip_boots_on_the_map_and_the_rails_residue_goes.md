---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md
reviewer: agent
date: 2026-11-18
verdict: APPROVE
blockers: 0
---

# Review — the_filmstrip_boots_on_the_map_and_the_rails_residue_goes

## Verified
- `scripts/filmstrip.mjs` waits on `svg.tv__map`, `bandProbe` -> `mapProbe`, respine scenarios deleted, the three survivors re-pointed; one composite + probe JSON per scenario committed (pane-open's frame narrows and refits; row-click and click hold the world box still, 3 marks lit).
- Every deleted helper (`blockColumns`, `kinematicPoseLengths`, `dimensionText`, `rowElement`, `transformText`, `topologyBuiltLine`, `searchMemo`) and CSS token has no remaining hit in apps/scripts/tests/docs (git grep).
- Debug probes: rule stated; 2 deleted, 26 kept. I re-checked the lowest-citation kept probes: each is named by one other tracked file, so the rule was applied as written.
- Comment fixes in `tolerance_stack/topology.py` point at real targets (`docs/DAG_TOPOLOGY.md` "Joint symbols" exists). Both issues resolved; leftovers filed as a new low issue.
- After merge: `pytest -q` (deselecting the worktree-red viewer suite) 2116 passed, 1 skipped; `apps/viewer/run_tests.cjs` 501/501; `apps/annotate/run_tests.cjs` 324/324.

## Not run here (be explicit)
- The viewer `[real]` tier and the browser tier: `rebuild_projections.ps1` refuses to run from a worktree and the main-checkout projection predates this tree's `topology.py` comment edits, so the provenance gate (not a code failure) stops the real tier. No witness spec names a deleted helper (grep). The diff changes no drawn behaviour; the batch merge runs these on the merged tree.

## Notes
- Nit: the tactical lesson's first `click` run died at `div.kmverdict` once, re-run green, unchased. Low risk.
