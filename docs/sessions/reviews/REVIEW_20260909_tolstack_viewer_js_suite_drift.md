---
type: review
handoff: tolstack_viewer_js_suite_drift
reviewer: agent
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# Review: tolstack_viewer_js_suite_drift

Not a tolerance-stack review — the deliverable is two JS test-suite fixes, so
the overlay's "mandatory checks" 1–7 (provenance audit) don't apply. This
review verifies the fix against the live projection and the scope contract
instead.

## What I verified

- **Merge**: `handoff/tolstack_viewer_js_suite_drift` (`7db8a5c`) merged clean
  into this review branch (no conflicts) — `92e4949`.
- **Baseline, then a wrinkle**: running `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack` pre-merge showed **three** red tests, not the two the
  handoff named, including a fresh drift on `topology_fixtures.js` studies[]
  missing a `checks` key. That third failure was **contamination, not a real
  bug**: the shared `data/projections/viewer/topologies.json` had just been
  overwritten by a *different*, unrelated, currently-active handoff
  (`topology_projection_emits_study_checks`, `dirty=true`,
  `repo_root=...worktrees/topology_projection_emits_study_checks`) — its
  `checks` key doesn't exist anywhere in this branch's
  `build_topology_projection.py`. Rebuilt all three projections myself from
  this review branch's own tree (`--data-root C:/workspace/tolstack/data
  --allow-older-tree`, since local `master` is 2 commits ahead for unrelated
  reasons) to get a clean, attributable baseline. This is exactly the overlay's
  existing "rebuild before trusting" entry (~line 1038) and the "persistently-
  red test explanation copied forward" entry (~line 1003) — both already
  named this class; this is reinforcing evidence, not a new failure mode, so
  no new checklist entry.
- **Post-merge, clean rebuild**: `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack` → **211/211 passed**, including both target
  assertions (`[real] the pitch system's five forks are marked`, `[real] the
  topology fixture's shapes still match the builder's`). Live rebuild
  confirms `pitch_system` branch_nodes = 5, `dirty=false`.
- **Python suite**: `C:\workspace\tolstack\venv-win\Scripts\python.exe -m
  pytest -q` from this worktree → **750 passed, 1 skipped** (documented
  node-fs worktree skip). No `data/` pollution beyond the deliberate
  projection rebuild.
- **Scope discipline**: diff touches exactly `apps/viewer/fixtures.js`,
  `apps/viewer/tests.js` (one test block, the four→five-forks fix + its two
  DOM assertions), plus the required issue and lesson files. `topology_fixtures.js`
  was correctly left untouched — its drift was already closed by `15fc611`
  before this session started, and the lesson explains this clearly rather
  than silently deviating from the named file. The *actual* live drift had
  moved to `apps/viewer/fixtures.js` (a new `by_topology`/`unresolved_topology`/
  `summary_topology` index `build_viewer_crops.py` grew on 2026-09-08). I
  diffed the added fixture entries field-for-field against the real
  `crops.json`'s `by_topology`/`unresolved_topology`/`summary_topology` shapes
  myself: exact match, both the resolved-entry field set (19 fields) and the
  unresolvable one (3 fields). `fixtures.js` carries no "paste from the
  builder" contract (unlike `topology_fixtures.js`) so hand-authoring here is
  the file's own established convention, not a shortcut.
- **The shape-diff test itself** (`[real] every fixture shape still matches
  the builder's`, `apps/viewer/tests.js:2483`) does a real bidirectional
  key-set diff (missing/extra), not a vacuous check — confirmed by reading it.
- **No stale "four branch points" prose survived elsewhere**: grepped the
  repo; `docs/topologies/topology_pitch_system.json`'s notes and
  `docs/DAG_TOPOLOGY.md` already say 5 (fixed by an earlier handoff,
  `mechanical_stroke_stack`, 2026-09-06) and add up correctly (2 + 3 = 5).
- **Definition of done**: test name/prose updated ("four forks" →
  "five forks"), lesson written at
  `docs/sessions/lessons/LESSONS_20260909_tolstack_viewer_js_suite_drift.md`
  covering both required questions (why the stale pin survived, and whether
  the anti-pattern should extend to hardcoded JS counts), and the
  strategy-audience issue
  (`ISSUE_20260909_hardcoded_structural_counts_in_js_tests_should_derive_not_pin.md`)
  is correctly out-of-scope-for-this-handoff rather than fixed here. Issue
  frontmatter is well-formed (`type: feature`, `priority: low`, `status: open`,
  `audience: strategy`).

## Findings

None. No blockers, no should-fixes, no nits worth filing.

## Overlay

Already well-populated; no edit needed. This review's findings are second/
third sightings of existing entries (rebuild-before-trusting; persistently-red-
test explanation copied forward — this handoff is literally that entry's
predicted resolution) and a first-hand confirmation of the documented
backslash-path footgun (~line 1164), which the tactical agent's own lesson
also independently rediscovered. Nothing new to seed.

## Verdict: APPROVE

Merged into `integration` at `92e4949` (fast-forward-incompatible, real merge
commit, no conflicts). Pushed to `origin/integration`.
