---
priority: high
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-01 — mutation_witness_shadow_is_per_run: give the witness shadow an owner, and make a collision say so

Source: `docs/issues/ISSUE_20261001_two_mutation_witness_runs_on_one_worktree_corrupt_each_others_shadow.md`
(`bug`, `priority: high`), filed by
`HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits` and routed here by
the 2026-10-01 triage sweep. Baseline: tolstack's trunk at
`8547a5e1c0798b7e2e57659a19fdcbbed5860f37` (the 2026-10-01 batch merge; `pytest -q`
and `node scripts/run_viewer_browser_tests.mjs` both green in the main checkout
after a clean projection rebuild — `1438 passed` equivalent and `25/25`). Scope:
`scripts/run_mutation_witness_tests.mjs` and its tests. Do NOT touch
`scripts/projection_freshness.cjs`, `scripts/projection_provenance.py`, or
anything under `data/projections/` — the shared-projection coupling is a separate,
live design question (`docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md`)
and this handoff must not pre-empt it.

## The defect

`scripts/run_mutation_witness_tests.mjs` builds its shadow tree at **one fixed
path** inside the repo it runs from, and wipes it on the way in:

```js
const SHADOW = join(REPO, "tmp", "mutation-witness");

function buildShadow() {
  rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(SHADOW, { recursive: true });
  for (const parts of SHADOWED) { cpSync(join(REPO, ...parts), join(SHADOW, ...parts), { recursive: true }); }
}
```

No lock, no per-run directory. A second run started against the same worktree
wipes and re-copies the tree the first one is mid-way through patching. Both then
fail, and **neither failure mentions concurrency**:

- the run that is **mid-flight** when the other rebuilds dies on
  `ENOENT ... open '<shadow>/apps/viewer/views/dom.js'` from `applyToShadow`'s
  `writeFileSync` — naming a file that **is** present in both the real tree and
  the rebuilt shadow by the time anyone looks;
- the run that starts **second** dies on `EPERM ... rm '<shadow>'` from
  `buildShadow`'s `rmSync`, because the first run's spawned tier still holds
  files open underneath it.

Both were hit on 2026-10-01 against
`C:\workspace\tolstack-worktrees\vpa_pitch_linkage_topology_and_feature_fits`:
a full-tier run crashed at spec 44 of ~132 with the ENOENT, and the immediate
clean re-run died on the EPERM. The cause was a second witness run
(`--only annotate`) started against the same worktree by another session.

**The diagnostic half is the expensive half.** The ENOENT actively misleads: it
names a present file, so the natural reading is "the shadow copy list is missing
a path the merged tree added", which sent that session through `SHADOWED` and
`apps/viewer/views/` — both fine. This tier is the slow one (tens of minutes), so
a misread costs a full re-run. And the collision is reachable in **ordinary**
use: the review cycle points a tactical agent and a review agent at the same
branch, and `CLAUDE.md` tells both to run this tier before trusting a green.

**The repo has already answered this shape once, one level up.** The shared
viewer projection had the same defect (`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`)
and was answered with a **gate** — `scripts/projection_provenance.py` — that
*refuses* rather than warns. The shadow has nothing. Match that posture.

## Deliverables

1. **A per-run shadow.** `tmp/mutation-witness-<pid>` (or another
   collision-free discriminator), plus a sweep of stale ones at startup so the
   directory does not accumulate. This removes the contention rather than
   reporting it, at the cost of a second copy of the tree on disk while two runs
   overlap — which the issue judged acceptable and so do I.

   **The shadow must stay INSIDE the repo.** The module's own comment says why
   and it is not negotiable: node resolves `playwright-core` by walking up from
   the running script, so a shadow under the system temp dir finds no
   `node_modules` at all. Keep it under `<repo>/tmp/`.

   Check `tmp/` is gitignored before you start, and that the stale-sweep cannot
   delete a *live* sibling's directory — a sweep that reaps by age alone will
   eventually eat a slow run. Reap only directories whose pid is dead.

2. **A lock whose refusal names the other run.** `tmp/mutation-witness.lock`
   carrying the pid, written at start, refused if a live one is there. Per-run
   shadows remove the file contention but **not** every shared resource: two
   runs still spawn tiers against the same repo and the same gitignored
   `data/`, and the issue asks for both measures for exactly that reason. The
   refusal message is the deliverable as much as the lock is — one sentence that
   says *another witness run (pid N, started HH:MM) is using this repo*, so the
   next person reads it instead of the ENOENT.

   Handle the stale lock: a lock whose pid is dead must not wedge the tier
   forever. Check liveness, say in the message that a stale lock was cleared.

3. **A test for each failure mode, by behaviour not by message text.** Two runs
   over one repo must now produce a clean refusal rather than an ENOENT/EPERM
   crash, and two runs over *different* repos (main checkout vs a worktree) must
   still both succeed — that case works today and must not regress, because it
   is how the batch-merge duty and a live session coexist. Assert on exit code
   and on the refusal being *identifiable*, not on an exact sentence.

4. **Leave a pointer where the misdiagnosis happened.** A short comment at
   `applyToShadow`'s `writeFileSync` saying an ENOENT there used to mean a
   concurrent rebuild and now cannot. One or two lines; it is the thing that
   cost a session a re-run.

## A process note from the filing session, worth reading before you debug this

While diagnosing, that session **killed two node processes** (`1836`, `52200`)
believing them to be its own orphans. They were the *other* run's parent and
child. The process list had rotated between the two observations that identified
them — one child per spec, a new pid roughly every 23 seconds — which is exactly
what a healthy run looks like, and was the signal that should have been read
first. If this tier misbehaves while you work on it, read the rotation before you
kill anything, and do not kill a process you have not established is yours.

## Definition of done

- Two concurrent witness runs against the same repo produce a **named refusal**
  naming the other run, not `ENOENT` and not `EPERM`; demonstrated, with both
  invocations and their output quoted in the lesson.
- Two concurrent runs against *different* repo roots (main checkout and a
  worktree) both still complete — stated as tested, since this is the case the
  merge gate depends on.
- A stale lock (pid dead) is cleared with a message, not treated as live;
  demonstrated.
- `venv-win/Scripts/python.exe -m pytest -q` green in the main checkout, and the
  witness tier itself runs to completion once: `node scripts/run_mutation_witness_tests.mjs`.
  Per `CLAUDE.md`, rebuild the projections **before** the node tiers, never
  after (`powershell -ExecutionPolicy Bypass -File scripts/rebuild_projections.ps1`) —
  and note that the rebuild must run against a **clean** tree, or its provenance
  stamp records `dirty: true` and the `[real]` tier correctly refuses it
  (measured by the 2026-10-01 sweep; stash unrelated edits first).
  From a worktree the venv is absent — use
  `C:\workspace\tolstack\venv-win\Scripts\python.exe` with your worktree as cwd.
- Lesson (`docs/sessions/lessons/LESSONS_20261001_mutation_witness_shadow_is_per_run.md`):
  the disk cost of overlapping per-run shadows actually observed, how stale-pid
  liveness is determined on Windows and whether it is reliable, and whether any
  *other* shared path this tier touches still has no owner — the issue suspects
  the spawned tiers' use of `data/` and this handoff did not settle it.
