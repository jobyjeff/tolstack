---
name: declare_candidate_test_inputs
---

# declare_candidate_test_inputs

## The headline finding, up front

**The declaration in `.dispatch.toml` does not do anything yet.** Every path
the issue asked for — `data/meshes`, `data/inbox/specs`,
`data/inbox/drawings`, `data/inbox/feature-identity`,
`data/inbox/tolerance_stacks` — carries a tracked placeholder file
(`README.md`, `.gitkeep`, `PROVENANCE.md`). A fresh `git worktree add` checks
those out, so the directory already `.exists()` in the candidate before
bridging runs, and `dispatch.candidate_inputs.plan_bridges`'s own
never-replace-tracked-content guard reports the path `present` and leaves it
alone. Declaring the path and declaring nothing produce the **byte-identical**
candidate. Filed as
`dispatch/docs/issues/ISSUE_20261001_bridge_test_inputs_cannot_arm_a_directory_that_carries_a_tracked_placeholder.md`
(`bug`, `priority: high` — this is not tolstack-specific; any repo that
follows this workspace's own `data/` convention hits the identical no-op).

I declared the paths anyway (deliverable 2 asked for it, the set is correct,
and it costs nothing now and starts working the moment dispatch's gap
closes), but do not read `.dispatch.toml` carrying this list as "the `[real]`
tier now gates the merge" — it does not, yet.

## The timing table (deliverable 1)

All rows: same candidate worktree (`C:/workspace/tolstack-inputscost`, branch
`inputs-cost-test` off `integration` @ `3e54796`), cwd = candidate, interpreter
= main checkout's absolute `venv-win/Scripts/python.exe`.

| run | what was armed | wall clock | result |
|---|---|---|---|
| unbridged | interpreter only (`bridge-test-inputs` with no declaration) | 204.47s | `1 failed, 1437 passed` |
| tool-bridged | `bridge-test-inputs --also <5 paths>` run for real | 204.98s | `1 failed, 1437 passed` — **diff against the unbridged log is empty** |
| hand-bridged | the 5 paths replaced with real symlinks (bypassing the PRESENT guard by hand), no projection rebuild | 234.47s | `1 failed, 1437 passed` (still fails: no projection) |
| hand-bridged + actuator rebuild | the 5 paths symlinked + `scripts/rebuild_projections.ps1` run against the candidate (31.7s) + pytest (225.01s) | ~257s total | `1438 passed` — the one failure clears |

The comparable number the handoff asked for: properly armed, the cost is
**order +50s on a ~204s baseline (+~25%)**, nowhere near rotorkit's
2m49s→31m55s. If dispatch's gap closes, declaring these paths is cheap and
worth it.

The middle row is the one that matters most: it is what every sweep gets from
this declaration **today**, and it is indistinguishable from declaring
nothing.

## The read-only claim, evidenced (deliverable 2)

Manifest (name, size, mtime) of the main checkout's `data/meshes`,
`data/inbox/specs`, `data/inbox/drawings`, `data/inbox/feature-identity`,
`data/inbox/tolerance_stacks` and `data/projections`, taken before any of the
above and again after the hand-bridged + actuator-rebuild run (the row that
actually touches real content and runs the full suite against it):

```
data/meshes added=0 removed=0 changed=0
data/inbox/specs added=0 removed=0 changed=0
data/inbox/drawings added=0 removed=0 changed=0
data/inbox/feature-identity added=0 removed=0 changed=0
data/inbox/tolerance_stacks added=0 removed=0 changed=0
```

and the main checkout's `data/projections/viewer/*.json` mtimes were
unchanged (older than the run window) — the actuator rebuild wrote into the
**candidate's own** `data/projections`, never the main checkout's, exactly as
designed. Zero bytes moved anywhere the declaration touches.

## `bridge-test-inputs` behaved as documented

The central guarantee — "never replaces a path the candidate already has" —
is exactly the mechanism this session's headline finding turned on; I didn't
have to go looking for it; it fired on every one of the five paths. The
final dry-run, against a fresh candidate, with the real main checkout as
`repo_root` and the five paths passed via `--also` (the main checkout's own
`.dispatch.toml` doesn't carry the declaration yet — it lives only on this
branch until the review merges it):

```
would bridge into C:\workspace\tolstack-inputscost
  interpreter linked   venv-win
  input       present  data/inbox/specs             already in the candidate worktree -- not replaced
  input       present  data/inbox/drawings          already in the candidate worktree -- not replaced
  input       present  data/inbox/feature-identity  already in the candidate worktree -- not replaced
  input       present  data/inbox/tolerance_stacks  already in the candidate worktree -- not replaced
  input       present  data/meshes                  already in the candidate worktree -- not replaced
  5 declared input(s) + interpreter: 1 linked, 5 present
```

exit code `0` (`present` counts as `ok` by design — correctly, for the case
the guard was built to protect; see the filed issue for why that is also the
failure mode here). I did not separately re-derive the absolute-path/`..`
refusal — `dispatch/tests/test_candidate_test_inputs.py` already pins that
behavior thoroughly and nothing about tolstack's environment would change it.

## `node_modules` — rejected, and why (deliverable 3)

`node_modules` is genuinely absent from a fresh worktree (no tracked
placeholder — unlike every `data/` path above, it would actually bridge as
`linked`, not `present`). I did not declare it. Two reasons: the browser
TRUTH tier it would arm already runs separately in the main checkout at merge
time (existing `CLAUDE.md` bullet), so declaring it is a pure increment, not a
necessity; and arming it *before* the `data/` bridging gap closes would gate
the merge on a tier reading a hollow, just-rebuilt projection (built from
placeholder-only `data/meshes`/`data/inbox/specs` in the candidate) — a
worse outcome than leaving the tier unproven, since a hollow-projection
browser run can agree with itself exactly the way `test_viewer_js_suite.py`'s
own docstring warns a stale one can. Revisit once the dispatch-side gap
closes and the `data/` declaration is doing real work.

## What stays unproven, written into `CLAUDE.md`

Added a bullet next to the existing "two test tiers cannot run in a fresh
worktree" one, naming: the declaration is inert today (dispatch bug, filed);
the priced cost for when it isn't; and the `node_modules` call with its
reasoning. Did not duplicate the timing table or the manifest evidence there
— those live here, and `CLAUDE.md` points at this file and the dispatch
issue rather than restating the numbers.

## An unrelated discovery, surfaced but not acted on

Every Python-level `[real]` test that reads mesh/spec/geometry data
(`test_part_mesh_aliases.py`, `test_feature_geometry.py`,
`test_mesh_route_doc_facts.py`, `test_topology.py`'s `REQUIREMENTS_PULL`)
already falls back to an **absolute, hardcoded main-checkout path**
(`MESHES_DIR_CANDIDATES`, `C:/workspace/tolstack/data/...`) when the
repo-relative candidate copy is empty — a deliberate, pre-existing pattern
(`CLAUDE.md`'s own worktree-reality rules). That means these particular
checks were never actually blocked by the candidate's own `data/` being
empty, bridged or not — they read the main checkout directly regardless. The
**only** check that genuinely depends on the candidate's own tree is the
node-fs `[real]` tier wrapped by `test_viewer_js_suite.py`, which needs a
projection built **inside the candidate** (never bridged, per this handoff's
own fence) by `scripts/rebuild_projections.ps1` — which the batch-merge duty
already runs as its own step 2, separately from `candidate_inputs` bridging.
Not a defect, not something this handoff's scope covers fixing — just worth
a future reader knowing that the `data/` declaration's payoff, once
dispatch's gap closes, is entirely about unblocking that one actuator-rebuilt
projection's checks, not about the Python-level mesh/spec tests, which were
never gated on it.

## The main-checkout verification hit two conditions I did not create and did not force past

1. **Two unrelated docs files were dirty in the main checkout**
   (`docs/issues/ISSUE_20260914_leaders_cross_each_other...`,
   `docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs...`), left by
   another agent. The main-checkout edit guard correctly refused my attempt
   to stash them from this worktree session. Asked the operator; told it's
   not mine to clean up. Left as-is.
2. **The shared `data/projections/viewer/` was stamped as built by a
   concurrent review session** (`review/one_part_feature_one_value_across_topologies`
   @ `104eb140d5fa`), a commit master does not yet contain. Rebuilding over
   it would have overwritten that session's in-flight projection — exactly
   `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`,
   "happened three times" per the refusal's own message. I did not
   `--allow-older-tree` past this; it is not this handoff's call.

Net effect: `venv-win/Scripts/python.exe -m pytest -q` in the main checkout
reported **`1 failed, 1437 passed` in 211.02s**, and the one failure is
`test_viewer_js_suite.py`'s own provenance-pairing guard correctly refusing a
projection it can prove was built from a tree master doesn't contain —
**not** a regression from this change (which is `.dispatch.toml` +
`CLAUDE.md` + this file, nothing that test reads). I did not run
`node scripts/run_viewer_browser_tests.mjs` or
`node scripts/run_mutation_witness_tests.mjs` in the main checkout: both
would read the same contested projection, a run against it would not be
representative of anything, and rebuilding to make it representative is the
same clobber risk condition 2 names. A docs-only change cannot plausibly
regress either JS tier; reviewer should re-run both once the concurrent
review session's worktree is gone and the projection dispute has resolved
one way or the other.

## Worktree hygiene

Built and tore down `C:/workspace/tolstack-inputscost` /
`inputs-cost-test` twice (once for the real-measurement runs, once for the
clean final dry-run demonstration) — `git worktree remove --force` +
`git branch -D` both times; `git worktree list` confirmed the branch list was
left exactly as found.
