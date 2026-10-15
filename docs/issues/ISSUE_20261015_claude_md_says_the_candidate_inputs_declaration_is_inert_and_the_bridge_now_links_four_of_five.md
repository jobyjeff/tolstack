---
type: chore
priority: low
status: open
area: CLAUDE.md (batch-merge candidate inputs)
reporter: agent
found_by: dispatch/docs/sessions/lessons/LESSONS_20261015_triage_sweep.md
---

# CLAUDE.md says the `candidate_inputs` declaration is inert; the bridge now links four of its five paths

`CLAUDE.md`'s bullet "A batch-merge candidate declares its own read-only
gitignored test inputs in `.dispatch.toml`'s `[tests] candidate_inputs` …"
states that every declared directory carries a tracked placeholder, so
`dispatch bridge-test-inputs` reports each one `present` and refuses to link
it, that "the declaration is inert today", and that a fresh candidate gets the
byte-identical `1 failed, 1437 passed` whether the declaration exists or not.
It also says the node-fs `[real]` tier "stays exactly as unproven in a
candidate as it was before".

Measured 2026-10-15 (triage sweep batch merge, candidate = integration @
`c51cf49`), that is no longer what happens:

```
  interpreter linked   venv-win                     -> C:\workspace\tolstack\venv-win
  input       linked   data/inbox/specs             -> ... (tracked placeholder left in place)
  input       linked   data/inbox/drawings          -> ... (tracked placeholder left in place)
  input       present  data/inbox/feature-identity  already in the candidate worktree -- not replaced
  input       linked   data/inbox/tolerance_stacks  -> ... (tracked placeholder left in place)
  input       linked   data/meshes                  -> ... (tracked placeholder left in place)
  5 declared input(s) + interpreter: 5 linked, 1 present
```

and the candidate's `venv-win/Scripts/python.exe -m pytest -q` (after the
candidate-scoped actuator rebuild) reported **`1446 passed, 1 skipped`** —
no `test_viewer_js_suite.py` red. The dispatch-side placeholder gap
(`dispatch/docs/issues/ISSUE_20261001_bridge_test_inputs_cannot_arm_a_directory_that_carries_a_tracked_placeholder.md`)
appears closed for directories whose placeholder is a file inside them;
`data/inbox/feature-identity` still comes back `present`.

## To do

- Rewrite the bullet to describe today's behaviour (four linked, one
  `present`, and why `feature-identity` differs), drop the stale
  `1 failed, 1437 passed` / "inert" claims, and re-state what a candidate green
  now does and does not cover (the `node_modules` browser TRUTH tier is still
  not declared and still runs only in the main checkout).
- Check whether `data/inbox/feature-identity` is meant to be bridged and, if
  so, why it is `present` (a tracked file at that path itself, or a tracked
  subtree), and say so.
- Any pass/fail count kept in that bullet should be one a test can read, or
  be dated as a measurement.
