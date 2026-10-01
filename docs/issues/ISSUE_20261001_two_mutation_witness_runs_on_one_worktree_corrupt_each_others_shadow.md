---
type: bug
priority: high
status: open
area: mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
---

# Two mutation-witness runs against one worktree destroy each other's shadow tree

## What happens

`scripts/run_mutation_witness_tests.mjs` builds its shadow at **one fixed path**
inside the repo it is run from:

```js
const SHADOW = join(REPO, "tmp", "mutation-witness");

function buildShadow() {
  rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(SHADOW, { recursive: true });
  for (const parts of SHADOWED) { cpSync(join(REPO, ...parts), join(SHADOW, ...parts), { recursive: true }); }
}
```

There is no lock and no per-run directory, so a second run started against the
same worktree wipes and re-copies the tree the first one is in the middle of
patching. Both runs then fail, in two different ways depending on who gets
there first — and **neither failure says anything about concurrency**:

- the run that is mid-flight when the other rebuilds dies on
  `ENOENT ... open '<shadow>/apps/viewer/views/dom.js'` from `applyToShadow`'s
  `writeFileSync` — a file that is present in both the real tree and the rebuilt
  shadow by the time anyone looks;
- the run that starts second dies on
  `EPERM ... rm '<shadow>'` from `buildShadow`'s `rmSync`, because the first
  run's spawned tier still holds files open under it.

Both were hit on 2026-10-01 against
`C:\workspace\tolstack-worktrees\vpa_pitch_linkage_topology_and_feature_fits`:
a full-tier run crashed at spec 44 of ~132 with the ENOENT, and the immediate
clean re-run died on the EPERM. The cause was a *second* witness run
(`--only annotate`) started against the same worktree by another session while
the first was going.

## Why this is worth more than the inconvenience

It is the same shape as
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`,
one level in — a shared mutable path with no owner — and the projections
answered it with a **gate**, `scripts/projection_provenance.py`, which refuses
rather than warns. This has nothing.

The worse half is diagnostic rather than mechanical. Neither error mentions
concurrency, and the ENOENT one actively misleads: it names a file that *is*
there, so the obvious reading is "the shadow copy list is missing a path the
merged tree added" — which sent this session looking at `SHADOWED` and at
`apps/viewer/views/`, both of which were fine. The tier is already the slow one
(tens of minutes), so a misread costs a re-run of all of it.

And it is reachable in ordinary use: the review cycle has a tactical agent and a
review agent both pointed at the same branch, and `CLAUDE.md` tells both of them
to run this tier before trusting a green.

## What would fix it

Any of three, in increasing order of effort:

1. **A lock.** Create `tmp/mutation-witness.lock` with the pid at the start and
   refuse to start if a live one is there, naming the other run. Cheapest, and
   it turns both failures into one sentence.
2. **A per-run shadow** — `tmp/mutation-witness-<pid>` — plus a sweep of stale
   ones at startup. Removes the contention instead of reporting it; costs a
   second copy of the tree on disk while two runs overlap.
3. Both, since (2) still wants (1)'s message when two runs would collide over
   the repo's own files.

Whichever: the shadow has to stay **inside** the repo. The module's own comment
says why — node resolves `playwright-core` by walking up from the running
script, so a shadow under the system temp dir finds no `node_modules` at all.

## What this session did about it, and got wrong

While diagnosing, this session killed two node processes (`1836`, `52200`) that
it believed were its own orphans, on the evidence that it had run `--only`
invocations earlier. They were the **other** run's parent and child. The
process list had rotated between the two observations that identified them,
which is exactly what a healthy run looks like — one child per spec, a new pid
every ~23 seconds — and that was the signal that should have been read first.

Recorded here rather than only in the lesson because the next agent to debug a
locked shadow will reach for the same `Stop-Process`, and the right first step
is to sample the process list twice and check whether the pids are *rotating*
before concluding anything is stuck.
