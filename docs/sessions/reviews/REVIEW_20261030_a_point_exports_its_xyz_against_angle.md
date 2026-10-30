---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_a_point_exports_its_xyz_against_angle.md
reviewer: agent
date: 2026-10-30
verdict: APPROVE
blockers: 0
---

# Review — a_point_exports_its_xyz_against_angle

## Verified
- One new module `apps/viewer/sweep_export.js` (DOM-free builder + one control),
  loaded by both apps; reads coordinates verbatim from the artifact, computes
  nothing, writes nothing to the repo. Rows sorted for the inverse lookup only.
- Merged `handoff/...` into the review branch cleanly.
- `pytest -q` (excluding the worktree-red viewer JS suite): 1685 passed, 1 skipped.
- `node apps/viewer/run_tests.cjs`: pass; node-fs `[real]` tier skipped (no
  projection in a worktree, as documented). `node apps/annotate/run_tests.cjs`: 267/267.
- Browser tier (node_modules junction, removed after): 40/40, including the new
  "point export (pick two points, download, parse the file)" check.
- Tactical lesson reports 80 rows x 12 columns matching the hand-made P2 CSV, 10
  joint ends exportable, 0 bound features with a fitted nominal.

## Witnesses (`--changed-since integration`)
- The four new point-export fast witnesses and three kinematic-page fast witnesses
  report "tier was red before the mutation": the fast tier is red in a worktree
  because its `[real]` freshness check refuses a projection from another tree.
  Environmental; **not proven here** — the sweep/batch merge in the main checkout
  should confirm the four new ones.
- Two browser witnesses NOT WITNESSED reproduce identically on `integration`
  itself, so are not this handoff's; filed as
  `docs/issues/ISSUE_20261030_two_viewer_browser_witnesses_not_witnessed_on_integration.md`.

## Findings (non-blocking)
- The annotator's sweep-bar control was never driven in a browser (tactical says so);
  the extras path (bound features) has only a unit test since no standing binding exists.
- Unposed moving body would yield a silently constant column (noted in lesson; no
  such binding exists today).
