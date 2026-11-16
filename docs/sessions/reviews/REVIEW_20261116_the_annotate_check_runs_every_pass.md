---
type: review
handoff: docs/sessions/active/HANDOFF_20261116_the_annotate_check_runs_every_pass.md
reviewer: agent
date: 2026-11-16
verdict: APPROVE
blockers: 0
---

# Review — the_annotate_check_runs_every_pass

Diff: `apps/annotate/run_browser_check.mjs` only (plus a lesson and one issue). No app code touched.

## Verified
- Merged `handoff/the_annotate_check_runs_every_pass` into the review branch (clean).
- `node apps/annotate/run_browser_check.mjs` (mock) in the merged tree: every pass header printed
  (placement, rail, `[real]` rail, context and view, correcting a binding, proposes/accepts,
  proposes/rejects, reduced motion), `correctionPass` green, no uncaught throw, **94/99**,
  exit 1. The five FAILs are exactly the known five (Display panel, two anchor checks, two `[real]` rail checks).
  Matches the tactical's recorded count.
- `runPass` wraps all passes, incl. `realPass`; a throw is one `FAIL <name>: <first line>` and increments `failed`.
- Flip claim cross-checked: app.js writes a `retracted` event for a flip's first binding; the check's new assertions match.
- Tactical recorded a default-tier run (1 expected worktree red, 2027 passed). I did not re-run the python tier: the diff is a single `.mjs` check script with no python or doc-scan surface beyond a lesson and an issue.

## Findings
- nit: `runPass` keeps only the first message line, so a throw loses its stack (the filed realPass issue says so itself). Cheap follow-up: print `err.stack` when set via an env flag.
- No unfixed should-fix. The `--real` realPass TypeError was filed by the tactical as its own issue. The `docs/ANNOTATION_SURFACE.md` Flip text drift (~l.933-938) is recorded in the lesson as a strategy call, not a check fix.
