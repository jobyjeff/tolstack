---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-01 — declare_candidate_test_inputs: make tolstack's `[real]` tier gate the batch merge, and price it first

Source: `docs/issues/ISSUE_20261001_tolstack_declares_no_candidate_inputs_so_its_real_tier_is_unproven_at_every_batch_merge.md`
(`chore`, `priority: med`), filed by the 2026-10-01 triage sweep from its own
merge of this repo. Baseline: tolstack's trunk at
`8547a5e1c0798b7e2e57659a19fdcbbed5860f37`. Scope: `.dispatch.toml` and
whatever documentation records the choice (`CLAUDE.md`'s worktree section is the
likely home). Do **NOT** change any test, any builder, or anything under
`data/` — this handoff adds a declaration and measures what it costs. It also
must not touch `scripts/run_mutation_witness_tests.mjs` (owned by
`mutation_witness_shadow_is_per_run`) or `docs/topologies/` (owned by
`one_part_feature_one_value_across_topologies`), both staged in parallel.

## Why this exists

The batch-merge gate tests the merge candidate in a throwaway worktree, which
holds only tracked files. dispatch provisions it with
`C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli bridge-test-inputs <root> <candidate>`,
which symlinks the interpreter plus **every path the repo declares** under
`[tests] candidate_inputs` in `.dispatch.toml`. tolstack declares nothing, so
the 2026-10-01 candidate reported `1 failed, 1437 passed` — seven `[real]`
sub-tests failing purely because `data/meshes` (176 files → 1) and
`data/inbox/specs` (60 files → 1) were absent. Those failures are
**product-shaped**: one is a content claim. A gate agent reading them as real
holds a good merge; this sweep only got the right answer by diagnosing the red
by hand and then re-proving trunk green in the main checkout.

## Deliverables

1. **Measure before you declare — this is the deliverable, not a preamble.**
   Build a candidate worktree the way the merge gate does and time the suite
   twice, unbridged and bridged, so the declaration is a priced decision:

   ```
   git -C C:/workspace/tolstack worktree add -b inputs-cost-test C:/workspace/tolstack-inputscost integration
   C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli bridge-test-inputs C:/workspace/tolstack C:/workspace/tolstack-inputscost --dry-run
   ```

   Then run the suite with cwd = that worktree and the main checkout's absolute
   interpreter (`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`),
   first with only the interpreter bridged, then again with `--also data/meshes
   --also data/inbox/specs` (and the other read-only inbox dirs). Record wall
   time and the pass/fail/skip line for each. Tear the worktree down when you
   are done (`worktree remove --force`, then `branch -D inputs-cost-test`) and
   leave the branch list as you found it.

   The comparable number, for calibration: rotorkit's suite went **2m49s →
   31m55s** when its inputs were bridged, because its `[real]` tier then really
   parses STEP. tolstack's unbridged candidate is ~2 minutes today and bridging
   arms ~86 `[real]` checks. If the bridged number lands anywhere near
   rotorkit's, say so prominently — it changes the recommendation.

2. **Declare the read-only inputs in `.dispatch.toml`.** The set the issue
   identified, which you should verify rather than take on trust:

   ```
   [tests]
   candidate_inputs = [
     "data/inbox/specs",
     "data/inbox/drawings",
     "data/inbox/feature-identity",
     "data/inbox/tolerance_stacks",
     "data/meshes",
   ]
   ```

   **Three paths must NOT appear, and the reasons are not interchangeable:**

   - **`data/projections/`** — the actuator *writes* it. The merge duty rebuilds
     projections into the candidate's own `data/` so the candidate is judged
     against its own tree. A symlink here aims that write at the main checkout's
     shared projection and would disarm every live worktree's `[real]` tier —
     causing, deliberately, the failure
     `ISSUE_20260930_a_rebuild_from_an_unlanded_branch_now_disarms_every_other_worktrees_real_tier.md`
     describes.
   - **`data/runs/`, `data/sessions/`** — written by runs.
   - **A blanket `data/`** — wrong for the reason above; the key names
     subdirectories by design.

   **Confirm the read-only claim rather than assuming it.** Before declaring a
   path, establish that the suite does not write under it — the contract is
   read-only and a symlinked path the suite writes into has a candidate that may
   never land mutating shared state. The cheap check: record a manifest of each
   candidate directory (name, size, mtime) before and after a bridged run and
   diff it. If anything moved, that path is not declarable; say which and why in
   the lesson, and leave it out.

3. **Decide `node_modules`, and write the reasoning down either way.**
   `playwright-core` exists only in the main checkout, so declaring
   `node_modules` would let the browser tier gate the merge too (25 suites).
   That is a real increment on top of deliverable 1's number. **My
   recommendation, which you should check against your measurement: declare it
   only if deliverable 1 shows the bridged `pytest` cost is modest.** The merge
   gate runs on every sweep and a 30-minute tolstack leg starves the rest of it;
   the browser tier is separately run in the main checkout at merge time per
   `CLAUDE.md`, so leaving it out of the candidate is a smaller loss than it
   looks. Record the rejected alternative.

4. **Say what stays unproven.** Whatever you declare, some tier is still
   unprovisioned in a candidate. Write that list into `CLAUDE.md`'s worktree
   section next to the existing two-tiers-cannot-run bullet, so the next merge
   agent reads "these are unproven by design" instead of re-deriving it. An
   unproven tier is not a failing one, and the gate now depends on that
   distinction being written down per-repo.

## Definition of done

- `.dispatch.toml` carries a `[tests] candidate_inputs` list; `bridge-test-inputs
  --dry-run` against a fresh candidate prints one line per declared path and
  every line reports success. That output is quoted in the lesson.
- The before/after timing and pass/fail/skip lines from deliverable 1 are in the
  lesson as a two-row table, with the `[real]` check count that went from
  skipped-or-failing to running.
- The read-only claim is **evidenced** for every declared path (the manifest
  diff), not asserted.
- The `node_modules` decision is recorded with its reasoning and its rejected
  alternative.
- `CLAUDE.md` says which tiers remain unproven in a candidate worktree.
- Full suite green in the **main checkout**: `venv-win/Scripts/python.exe -m pytest -q`.
  Rebuild the projections **before** any node tier and from a **clean** tree — a
  dirty tree stamps `dirty: true` and the `[real]` tier correctly refuses the
  projection (measured by the 2026-10-01 sweep; stash unrelated edits, restore
  after).
- Lesson (`docs/sessions/lessons/LESSONS_20261001_declare_candidate_test_inputs.md`):
  the timing table, the read-only evidence, the `node_modules` call, and — the
  thing the next repo to do this most needs — whether `bridge-test-inputs`
  behaved as documented (it refuses absolute paths and `..`, and never replaces
  a path the candidate already has). tolstack is the first repo in the workspace
  to declare anything, so this lesson is the pattern eleven others will copy.
