---
priority: med
depends_on: []
---

# HANDOFF 2026-09-09 — tolstack_viewer_js_suite_drift: fix two pre-existing red assertions in the viewer JS suite

Source: triage's session-start batch-merge duty (2026-09-09), which runs
`tests/test_viewer_js_suite.py` as part of `pytest -q` before merging
`integration` into `master`. Both failures below reproduce on `master` alone
(confirmed by testing before and after the merge) — neither was introduced by
integration's content, but both are currently red on trunk and need fixing.
Baseline: trunk (master) after the 2026-09-09 batch merge. Scope: this
session owns `apps/viewer/topology_fixtures.js`, `apps/viewer/tests.js`
(the two spots named below), and running
`.\scripts\rebuild_projections.ps1` from the **main checkout**
(`C:\workspace\tolstack` — a worktree has no `venv-win` and the script's own
preflight refuses to run from one) to get an authoritative live projection to
check against. Do NOT touch other `docs/topologies/*.json` or other viewer
tests outside these two failures.

## 1. `topology_fixtures.js` has drifted from the builder's current output shape

`ISSUE_20260909_topology_fixtures_js_drifted_from_builder.md`. Running the
suite (`venv-win\Scripts\python.exe -m pytest -q tests/test_viewer_js_suite.py`)
fails `[real] every fixture shape still matches the builder's` with:

```
topology_fixtures.js has drifted from the builder: [
  "topologies[]: the projection writes [joint, worksheet_file, worksheet_source]
   and apps/viewer/topology_fixtures.js does not -- REGENERATE it (its header
   says how)",
  "topologies[].studies[]: the projection writes [configuration] and
   apps/viewer/topology_fixtures.js does not -- REGENERATE it (its header
   says how)"
]
```

`apps/viewer/topology_fixtures.js`'s own header states the regeneration
procedure: every number in it came from running
`scripts/build_topology_projection.py`'s `project_topology()` over the demo
documents and pasting the result — **do not hand-edit a number**. After
regenerating, the three `crop_key` values need to be patched back in by hand
(the demo mechanism has no real stack behind it, so those three are
deliberately not builder output — the header explains which three and why).
Follow the header's own instructions exactly; it is more precise than this
paraphrase.

## 2. `pitch_system`'s hardcoded "four forks" test expectation disagrees with the live projection

`ISSUE_20260909_pitch_system_branch_count_pin_is_stale.md`.
`apps/viewer/tests.js:2838`, `[real] the pitch system's four forks are
marked`, asserts `livePitch.branch_nodes.length === 4`. A fresh, authoritative
build (`.\scripts\rebuild_projections.ps1` from the main checkout, then check
the printed provenance stamps show `dirty=False` and `behind_trunk=0`) gives
**5** branch points for `pitch_system`. Confirmed this is not a projection
staleness artifact — the rebuild script reports the projection was built
fresh from the current tree.

This is NOT a mechanical pin update like forge's repo-list tests
(`forge/tests/test_repos_to_check.py`) — investigate first: is 5 the correct
branch-point count for `pitch_system`'s current graph (in which case update
the assertion to `5` and rename the test, `four` -> `five` forks, plus its
prose), or does the extra branch point mean an unintended structural change
landed in `docs/topologies/topology_pitch_system.json` and the graph itself
is wrong? The issue's best guess is handoff `endstop_location_stack`'s
2026-09-06 retrace update (see that file's `provenance.retrace_update_20260906`
note, six edges re-cited) as the point where the count may have moved — check
that handoff's own review/lesson for whether a branch-point change was
expected and reviewed, or slipped through unnoticed.

## Definition of done

- `venv-win\Scripts\python.exe -m pytest -q` fully green, including
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.
- If the branch-point count changes were expected: `apps/viewer/tests.js`'s
  test name and any prose referencing "four forks" is updated to match, not
  just the assertion's number.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_tolstack_viewer_js_suite_drift.md`):
  record which of the two branch-point explanations was correct (stale pin vs.
  real structural regression) and why, plus anything learned about how easily
  a hand-maintained fixture/pin drifts silently until this specific real-data
  smoke test catches it — this repo's `CLAUDE.md` already names "a quantity
  written in prose that no test reads from the tree is a defect" as a known
  anti-pattern; say whether that principle should extend to hardcoded branch
  counts (e.g., deriving the expected count from a comment/constant near the
  topology's own provenance instead of a bare literal in the test).
