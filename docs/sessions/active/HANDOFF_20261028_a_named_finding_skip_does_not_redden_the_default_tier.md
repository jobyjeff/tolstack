---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-28 — a_named_finding_skip_does_not_redden_the_default_tier: the default tier goes green on a fresh projection without loosening the worktree-skip guard

Source: triage sweep 2026-10-28 batch merge, from
`docs/issues/ISSUE_20261028_the_default_tier_is_red_on_every_fresh_projection_because_a_named_real_skip_trips_the_skip_guard.md`.
Baseline: `master` at `28c6f783`. Scope: `apps/viewer/tests.js` (the
`[real] a part sourced to both a drawing and a workbook ...` block),
`apps/viewer/run_tests.cjs` if a new line kind is needed,
`tests/test_viewer_js_suite.py`, and any mutation spec the change touches.

## The gap

`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` fails on any
`SKIP  ` line. Since `afc5a574` (2026-10-26) `apps/viewer/tests.js` emits one on
purpose — the per-document qualifier has no live witness after the fold — so
the default tier is `1 failed` on every run with a fresh projection, candidate
and main checkout alike. The fixture witness
(`VA.demoMixedSourceTopology()`, landed 2026-10-27) already carries the design.

## Deliverables

1. The default tier is green on a fresh projection with today's data
   (`PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` in the
   main checkout after `scripts/rebuild_projections.ps1`).
2. **The worktree-skip guard is not weakened:** a worktree run with no
   projection still fails `test_viewer_js_suite_is_green` exactly as today.
   Prove both directions (with/without projection) in the lesson.
3. The empty live set stays visible — reported by name somewhere a reader
   sees it (a distinct line kind, a PASS that states it found zero live
   cases, etc.) — so a future live mixed part re-arms the `[real]` check.
   Say in the lesson which shape you chose and why.
4. The wrapper's failure text no longer claims "almost always a worktree" for a
   skip that is not one, if the shape you choose leaves that path reachable.
5. Any guard you add or change is enrolled per CLAUDE.md (mutation spec under
   `scripts/mutation_witnesses/`).
6. Resolve the issue (`status: resolved`, pointing here).

## Definition of done

- `pytest -q` green in the main checkout on a fresh projection; the
  worktree-without-projection case still red; `node apps/viewer/run_tests.cjs`
  output names the empty live set; witness `--changed-since master` clean.
