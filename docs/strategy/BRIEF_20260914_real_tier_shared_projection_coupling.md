# BRIEF 2026-09-14 — the `[real]` tier couples per-worktree fixtures to one shared projection, so parallel handoffs redden each other

> Routed here by the triage sweep of 2026-09-14/15 from
> `docs/issues/ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`
> (`type: bug`, `priority: med`, `audience: strategy`). This is an architecture
> question about how the `[real]` tier is wired, and it bites the orchestrator's
> ability to run tolstack handoffs in parallel — so it is worth a design look
> rather than a rule telling agents to take turns.

## What happens

`apps/viewer/tests.js`'s `[real]` tier pairs the **hand-written fixtures in a
worktree** against the **shared projection in the main checkout**. Both sides
move, and only one of them is per-worktree. Hit on 2026-09-14 by
`annotate_affordances_flyout_and_mesh_gating` and `stack_title_style_pass`
running concurrently:

1. `stack_title_style_pass` adds `description` to the stack projection, updates
   `apps/viewer/fixtures.js` on its branch, rebuilds `results.json`/`crops.json`
   into `C:\workspace\tolstack\data\`, and goes green.
2. `annotate_affordances_flyout_and_mesh_gating` adds `mesh` to the topology
   projection, updates `apps/viewer/topology_fixtures.js` on *its* branch,
   rebuilds `topologies.json` into the same directory, and goes green — except
   for `description`, which its branch has never heard of and its fixtures
   therefore do not carry.
3. Each agent now sees a `[real]` failure **naming a field it did not add, in a
   file it must not edit** (the other handoff owns that fixture change), and the
   clean `master` checkout fails on **both**.

Measured, both directions, 2026-09-14:

```
worktree annotate_…  --repo C:\workspace\tolstack  293/294  (fails: stacks[].description)
main checkout master --repo C:\workspace\tolstack  281/283  (fails: description AND mesh)
```

## What this is not

**Not** `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`
reopening. That one was *silent* clobber, and the provenance gate
(`scripts/projection_provenance.py`) fixed it: the overwrite is now refused,
loudly, with both trees named. **The gate did its job here** — it refused, the
message was clear, and no work was lost. What is left is the half the gate cannot
reach: the gate governs *writing* the shared projection, and this is about
*reading* it from a tree that does not know all its fields.

Also not the same as
`ISSUE_20260914_the_shared_viewer_projections_are_from_two_different_trees`,
which this sweep resolved by rebuilding all three from one tree after the batch
merge. That was a stale-artifact problem with a mechanical fix. This is
structural: it recurs every time two handoffs each add a projection field, and
the rebuild does not prevent it.

## The core problem to solve

**"Green" in the `[real]` tier is now a function of who rebuilt last**, which
makes it a poor gate: an agent cannot distinguish "my change is wrong" from
"a sibling branch's field is in the shared file". Worse, the honest reading of a
red `[real]` tier becomes "probably someone else", which is exactly how a real
failure gets waved through.

Directions worth weighing (the issue does not pick one):

- **Make the `[real]` tier tolerant of unknown fields** — assert that every field
  the *reading tree* knows is present and well-formed, and ignore extras. Cheap,
  and it gives up the "no live value the page cannot render" property in the
  additive direction only. Worth checking whether that property is what
  `TOPO_VALUE_GUARDS` actually needs.
- **Give each worktree its own projection build** so the `[real]` tier reads a
  projection from its own tree. Removes the coupling entirely; costs a rebuild per
  worktree and loses the "tested against the real shared artifact" guarantee that
  is the tier's whole point.
- **Version the projection schema** and have the tier assert against the schema
  version its fixtures were written for, skipping loudly when the shared file is
  newer.
- **Sequence at the orchestrator instead** — treat "adds a projection field" as a
  mutex and never run two such handoffs concurrently. No code change; cost is
  throughput and it needs the orchestrator to know which handoffs those are,
  which today only the handoff text says.

## Why it matters beyond tolstack

Dispatch's whole model is parallel handoffs in separate worktrees. tolstack is
the repo where a shared, gitignored, rebuilt-in-place artifact is load-bearing
for tests — so it found this first, but any repo that grows the same shape will
find it too. Whoever decides this should say whether the answer is a tolstack
answer or a convention (`forge/CONVENTIONS.md`) other repos should inherit before
they build the same coupling. Compare
`forge/docs/strategy/BRIEF_20260914_cross_repo_jsonl_append_lock.md`, filed the
same day, which is the same "one repo fixed it, the mechanism is workspace-wide"
question about a different shared artifact.

## 2026-10-01 triage sweep — the consequence changed from "reddens" to "disarms", and the batch-merge duty is itself one of the writers

Three things this brief does not yet know, all measured since it was written.
They do not change its question; they change what the wrong answer costs.

**1. The failure mode is no longer a red fixture — it is a refused tier.**
Since the freshness gate landed (2026-09-30), another worktree's rebuild does
not redden your `[real]` checks, it **stops them running**: `projection NOT
paired with this tree -- the [real] tier is stale`, ~86 `[real]` checks not
executed, and the mutation-witness fast half reporting `TIER_ALREADY_RED` for 59
of 132 declared mutations because the clean run is red before any mutation is
applied. Filed as
`docs/issues/ISSUE_20260930_a_rebuild_from_an_unlanded_branch_now_disarms_every_other_worktrees_real_tier.md`
(`bug`, `high`), which states plainly that it is not a second report of this
brief but a changed consequence of it. Two properties are new and both are worse
than the brief's version:

- **It is retroactive.** A session that had already finished verifying had its
  verification invalidated by a write it did not make and cannot see. The record
  in its report was true of the moment it ran and is unreproducible afterwards.
- **The provenance gate cannot catch it by construction.** The builders refuse a
  tree they do not *contain* (`scripts/projection_provenance.py`, exit 3); the
  rebuilding branch did contain `integration`, so the gate correctly let it
  through. The gate is about *older*; this is *divergent*, and divergence
  between two live handoff branches is this repo's normal state.

**2. The route the brief calls impossible is merely undocumented — and it has
now been run twice.** This brief's option set, and the issue above, both assume a
worktree cannot build a private projection because the builders' inputs are
main-checkout paths. `ISSUE_20260930_a_worktree_has_no_supported_way_to_run_the_real_tiers_against_its_own_projection.md`
writes down four manual steps that **do** work today — a short scratch root with
`data/inbox` and `data/meshes` junctioned to the main checkout's,
`data/projections/` a real directory, `docs` junctioned to the worktree's own,
`node_modules` junctioned for `playwright-core`, the three builders with
`--data-root`, then every tier with `--repo <scratch>` (all four already take the
flag). Measured results: `522/522` with no tier skipped, browser `25/25`. So the
costed option "a worktree builds a private one" is **a script away, not a
redesign** — which materially cheapens one branch of this brief's decision and
should be priced before the others.

**3. The batch-merge duty is one of the writers, and it wrote a poisoned stamp
on 2026-10-01.** This sweep's own step-7 actuator run rebuilt the projections in
the **main checkout** while that checkout was dirty (one unrelated modified brief
file, disjoint from the merge). The rebuild exited 0 and stamped
`branch=master sha12=8547a5e1c079 dirty=True`, and the `[real]` tier then
correctly refused it — *"results.json was built from 8547a5e1c079 by a tree with
UNCOMMITTED changes (its own stamp says dirty: true), so that commit does not
identify the code that built it"*. tolstack's trunk was therefore red
(`1 failed, 1437 passed`) immediately after a clean merge, for a reason that had
nothing to do with the merge.

Stashing the one unrelated file, re-running the identical actuator, and
re-running the tier fixed it — `dirty=False`, tier armed, `1 passed`, and the
browser tier `25/25` on trunk — and the sweep then restored the stashed file
byte-identically (the tier stays armed, because the check reads the *stamp*, not
the current tree).

Why this belongs in this brief rather than only in an issue: it is a **new class
of writer**. The brief's model is two handoff worktrees racing each other. Here
the writer was the *merge gate itself*, writing from trunk, on a schedule nobody
coordinates with, and the thing it poisoned was not a competitor's view but
trunk's own. Any answer that only arbitrates between handoff branches leaves this
one open. Whoever decides this should say whether the shared projection has
**one** privileged writer (the merge gate, from a clean tree) with everyone else
private, or whether per-tree private projections make the question moot — the
latter now being the cheap option per point 2 above.

## 2026-10-02 triage sweep — the class is measured, and it is not tolstack's alone

Two additions, and the first one answers a question this brief asks in its own
core-problem section: *whether the answer is tolstack's or a workspace
convention.*

### 1. The failure class spans four repos, 21 issues

Classified across all twelve registered repos on 2026-10-02 (frontmatter
`class:` plus every `defer_until: class:…` pointing at it),
**`shared_mutable_state_across_worktrees`** holds **21 issues**: 4 live
(`open`+`triaged`), 14 `deferred`, 5 already `resolved`. By repo:

| repo | issues | what the shape looks like there |
|---|---|---|
| dispatch | 6 | the batch-merge candidate's provisioning and the actuator-rebuild ordering; concurrent full-suite runs making the post-merge suite unmeasurable |
| tolstack | 5 | this brief's own pair, plus a rebuild from an unlanded branch disarming every other worktree's `[real]` tier, and meshes installed mid-session taking a classification floor red |
| atp-post | 6 | a dashboard projection rewritten in place under the server serving it; a successor's boot cycle overwriting its predecessor's progress record; a staleness test red on every branch during parallel work |
| drawing-checker | 4 | a browser default-out overwriting committed evidence; abandoned partial export dirs; an untracked, ungitignored mutation scratch dir |

The *mechanism* differs each time — a projection, a run log, a dashboard JSON, an
export dir, a scratch dir — and the *shape* does not: **one process-shared,
gitignored artifact with no owner, written by N trees that cannot see each
other.** Four repos arriving at it independently is the evidence that the answer
wanted here is a workspace convention about who may write shared derived state,
not a tolstack wiring change. The 09-14 pair and the 10-01 "the merge gate is
itself a writer" addendum are two instances of a 21-instance class.

**This section is also how the sweep discharged a wake trigger without churning
the board.** `shared_mutable_state_across_worktrees` is, as of 2026-10-02, the
**only** class in the workspace at or above `CLASS_WAKE_THRESHOLD` (3 live), with
10 `deferred` issues naming it as their `defer_until:` trigger. The wake rule's
stated purpose is "so the class gets judged as the set it is" — so the sweep
judged it as a set, here, in the brief that owns it, rather than flipping 10
issues to `open` for the next sweep's budget to re-defer. (The trigger
arithmetic itself is filed separately:
`dispatch/docs/issues/ISSUE_20261002_a_class_defer_trigger_cannot_fire_once_the_budget_rule_has_deferred_the_class.md`.)

### 2. This sweep's own batch merge is a fresh, clean instance — and it now has a floor

tolstack's merge candidate (a fresh worktree at the merge result) reported
**`5 failed, 1439 passed, 1 skipped`** with only placeholder `data/`, and
**`1444 passed, 1 skipped`** once the real `data/inbox/*` and `data/meshes` were
present. All five reds were absent-input artifacts, including one shaped like a
content claim about a workstation path — which is this brief's coupling seen from
the merge gate's side: the fixtures are per-tree, the projection they pair
against is not, and a tree without the shared artifact cannot tell "wrong" from
"absent".

**Point 2 of the 10-01 addendum — "per-tree private projections make the question
moot, and that is now the cheap option" — got materially cheaper the same day,
and the sweep verified it rather than assuming it.** dispatch's
`HANDOFF_20261001_candidate_inputs_actually_provisions` landed both halves of the
provisioning fix, but on `integration`, reaching dispatch's master only in this
sweep's own merge — so the sweep that carried the fix ran the pre-fix tool, which
is why the merge agent saw all five paths report `present` and had to stage real
data by hand. Re-measured **after** that merge, against a fresh tolstack
candidate at `master`:

```
  interpreter linked   venv-win                     -> C:\workspace\tolstack\venv-win
  input       linked   data/inbox/specs             -> ...\data\inbox\specs (tracked placeholder left in place)
  input       linked   data/inbox/drawings          -> ...\data\inbox\drawings (tracked placeholder left in place)
  input       present  data/inbox/feature-identity  already in the candidate worktree -- not replaced
  input       linked   data/inbox/tolerance_stacks  -> ...\data\inbox\tolerance_stacks (tracked placeholder left in place)
  input       linked   data/meshes                  -> ...\data\meshes (tracked placeholder left in place)
  5 declared input(s) + interpreter: 5 linked, 1 present
```

Four of five now link past their tracked placeholder. The fifth is **correct, not
residual**: `data/inbox/feature-identity` holds nothing but its own `README.md`
in the main checkout too, so there is genuinely nothing to bridge. (Both source
issues had been auto-closed with dispatch's `handoff completed … not
independently verified` note; this is that verification.)

**What that does and does not settle for this brief.** It gives a *read-only*
floor: a candidate tree can now see the shared inputs without copying them, so
the merge-gate instance of the coupling is answered by symlink. It does **not**
answer this brief, because the coupling that bites parallel handoffs is about
**writes** — two trees rebuilding `topologies.json`/`results.json`/`crops.json`
into one shared `data/`. Symlinking a read-only input is explicitly the opposite
case; the bridge contract refuses a path the suite writes into, and
`data/runs`-shaped paths stay unbridgeable for exactly that reason. So the
privileged-writer-versus-private-projection question the 10-01 addendum ends on
is still the open one, now with a working read-side mechanism to build the
private option on top of.
