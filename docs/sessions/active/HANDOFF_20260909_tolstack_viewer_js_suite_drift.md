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

`ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md` (read
that file in full — it supersedes the summary below and the now-closed
duplicate `ISSUE_20260909_pitch_system_branch_count_pin_is_stale.md`).
`apps/viewer/tests.js` (~line 2838 as of this handoff, ~line 3085 per the
issue — confirm current line), `[real] the pitch system's four forks are
marked`, asserts `livePitch.branch_nodes.length === 4`. A fresh, authoritative
build (`.\scripts\rebuild_projections.ps1` from the main checkout, then check
the printed provenance stamps show `dirty=False` and `behind_trunk=0`) gives
**5** branch points for `pitch_system`, stably — not a rebuild race.

**This is very likely NOT a "which side is correct" investigation** — the
issue already did that work: two independent by-hand derivations, from
before this handoff, both already agree 5 is correct: `docs/DAG_TOPOLOGY.md`'s
L2 section states "12 parts, 21 interfaces, 24 edges, **5 branch points**, 4
grounded loops", and `REVIEW_20260906_mechanical_stroke_stack.md` independently
re-derived the same count in Python (`len(t.branch_nodes())`) directly from
the loaded topology. Every review since (including
`LESSONS_20260908_viewer_v2_single_nav.md` §7) has re-labelled this a
"pre-existing branch-count race" without re-running that derivation — it
isn't a race, the count is stable. Fix: update the assertion to `5`, AND its
two DOM assertions (`circle.rail__dot--branch` / `tr.tvrow--branch`, also
hardcoded at 4) — check which node is the newly-missing branch in the
rendered rail first, don't just bump the numbers — AND the test's own name
and any "four forks" prose. Only fall back to correcting
`docs/DAG_TOPOLOGY.md`/the review's counts instead if you find a concrete
reason the two independent derivations are both wrong, which the issue
considers unlikely.

## Definition of done

- `venv-win\Scripts\python.exe -m pytest -q` fully green, including
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.
- If the branch-point count changes were expected: `apps/viewer/tests.js`'s
  test name and any prose referencing "four forks" is updated to match, not
  just the assertion's number.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_tolstack_viewer_js_suite_drift.md`):
  record why this specific stale pin survived three-plus review cycles under
  a "pre-existing unrelated failure" framing despite two independent
  derivations already contradicting it since 2026-09-06 — that's the durable
  lesson here, not the branch-count fix itself. Say whether this repo's named
  anti-pattern ("a quantity written in prose that no test reads from the tree
  is a defect") should extend to hardcoded counts like this one (e.g.,
  deriving the expected count from a comment/constant near the topology's own
  provenance instead of a bare literal in the test), so a future stale pin
  fails loudly instead of blending into "one pre-existing unrelated failure."
