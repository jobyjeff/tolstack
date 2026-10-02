---
type: bug
priority: med
status: deferred
area: viewer / projections
reporter: agent
found_by: review/declare_candidate_test_inputs
class: shared_mutable_state_across_worktrees
defer_until: 2026-10-15
resolution: deferred 2026-10-01 (triage, second sweep) -- med beyond this sweep's BUDGET=3 for this repo. Not a judgement that it is unimportant; it is what the budget rule does with med past the cap.
---

# The main checkout's shared viewer projection is stamped from a commit only on `integration`, so `rebuild_projections.ps1` there now refuses every rebuild until the next batch merge

Found while reviewing `declare_candidate_test_inputs` (a `.dispatch.toml` /
`CLAUDE.md` / lesson-only change — unrelated to this). `venv-win/Scripts/python.exe
-m pytest -q` in the main checkout (`C:/workspace/tolstack`, on `master` @
`f50e6525c18a`, clean tree) reports `1 failed, 1437 passed`, the one failure
being `test_viewer_js_suite.py::test_viewer_js_suite_is_green`'s own
provenance-pairing guard:

```
the projection this tier reads was NOT built from this tree ...
topologies.json was built from 104eb140d5fa, and 2 of its input file(s)
differ in this tree: docs/topologies/topology_pitch_system.json,
docs/topologies/topology_vpa_pitch_linkage.json
projection: C:/workspace/tolstack/data/projections/viewer
this tree:  C:/workspace/tolstack @ f50e6525c18a
```

`104eb140d5fa` is the review commit for `one_part_feature_one_value_across_topologies`
("Review: inline fixes, one new issue, and three overlay entries") — it is on
`integration`, **not an ancestor of `master`**
(`git merge-base --is-ancestor 104eb140d5fa master` fails). Attempting the
documented fix makes this explicit — `scripts/rebuild_projections.ps1` in the
main checkout refuses:

```
REFUSED: ...\data\projections\viewer\topologies.json was built by
review/one_part_feature_one_value_across_topologies @ 104eb140d5fa ...
and this tree is master @ f50e6525c18a ...
commit 104eb140d5fa is NOT an ancestor of this tree's HEAD, so rebuilding
here would overwrite a projection built from a tree this one does not
contain. That is ISSUE_20260806_concurrent_worktrees_clobber_the_shared_
viewer_projection, which has happened three times.
```

So the shared, main-checkout-only `data/projections/viewer/` was built from a
**review worktree** sitting on `integration`, not from the main checkout on
`master` — the exact action `ISSUE_20260806_concurrent_worktrees_clobber_the_
shared_viewer_projection`'s own fix ("rebuild only in the checkout that owns
`data/`, never from a worktree") exists to prevent. The guard is doing its
job (refusing rather than silently overwriting), but the practical effect is
that **no session can get a genuinely green full suite in the main checkout
right now** without either waiting for the operator's next batch merge
(`master` → includes `104eb140d5fa`) or consciously passing
`--allow-older-tree` — a call this review declined to make since it isn't
this handoff's to make and the tree in question (`one_part_feature_one_value_
across_topologies`) isn't this review's to touch.

This did not block this review: the one failure reads none of the three files
the handoff under review touched (`.dispatch.toml`, `CLAUDE.md`,
`docs/sessions/lessons/LESSONS_20261001_declare_candidate_test_inputs.md`), so
it is independently confirmed unrelated, not a regression.

## What's worth triaging

- Confirm whether the `one_part_feature_one_value_across_topologies` review
  rebuilt the projection from its own worktree (a process violation of the
  main-checkout-only rule) or whether there's a legitimate path that produces
  this same stamp — if the former, it's a second-hand repeat of the 2026-08-06
  class worth a note in that review's own record.
- Likely self-resolves at the next operator batch merge (master will then
  contain `104eb140d5fa`); worth confirming post-merge that a plain
  `rebuild_projections.ps1` run in the main checkout goes green with no
  override needed.
