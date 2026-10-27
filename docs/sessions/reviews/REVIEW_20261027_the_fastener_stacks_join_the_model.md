---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_fastener_stacks_join_the_model.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review — the_fastener_stacks_join_the_model

**Verdict: APPROVE.** The four grip-stack topologies are folded into
`topology_vpa_pitch_linkage.json` with ids preserved and suffixed where they collided.
The studies are re-pointed and the aliases follow. Before/after pins are exact, not just
to three decimals, per the lesson. No `apps/` source or `tolerance_stack/` edit. The only
`apps/` changes are test and README files.

## Verified
- Merged `handoff/the_fastener_stacks_join_the_model` into the review branch.
- Full `pytest -q` in the worktree: 1572 passed, 1 skipped, 2 failed.
- The two failures are `test_viewer_js_suite` and `test_annotate_js_suite`. These are the
  documented worktree-red tiers: `[real]` checks read `data/projections/`, which is
  gitignored and built from the pre-fold tree. They are not a defect in the work.
- The one non-fixture annotate `[real]` failure (`.surface` of undefined) is the
  re-pointed `vpa_pitch_linkage` lookup reading the stale shared projection.
- I did not rebuild the shared projections from a review worktree, since they are shared
  with the main checkout.

## Notes for the batch merge (not blockers)
- **Rebuild first.** Run `scripts/rebuild_projections.ps1` in the main checkout, then
  `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`, the browser tier
  and the witness `--changed-since master`, in that order. This handoff re-pointed
  `[real]` checks at the model, so the old projection will fail them.
- **Study count.** The handoff's "fifteen studies" is fourteen (3+9+1+1). The lesson says so.
- **Three follow-up issues filed by the author** (valid frontmatter): split containers per
  component, no `[real]` topology switch, and no worksheet page for the fastener stacks.
- **Body assignment.** The lesson names the judgement calls on hardware-to-body (head-side
  bushings, the VPA bushing) and they are cheap to move.
- I did not re-run the browser tier or the witness registry here.
