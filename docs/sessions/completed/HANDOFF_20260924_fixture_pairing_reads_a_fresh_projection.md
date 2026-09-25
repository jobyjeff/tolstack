---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-24 — fixture_pairing_reads_a_fresh_projection: make the `[real]` tier refuse a stale projection, and pin the `claims` key it missed

Source: triage batch merge 2026-09-24 (`integration` -> `master`,
`d6f766a` -> `4cb6a1d`) and
`docs/issues/ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_projection_is_rebuilt.md`.
Baseline: `integration` at `4cb6a1d` (this merge is already on trunk; the red
below is trunk's red, not a branch's).

**The measured fact this exists for.** The merge candidate's viewer tier
reported **514/514 passed** before the merge and **513/514** after
`scripts\rebuild_projections.ps1` ran — with no code change in between. The
tier's `[real]` checks read `data/projections/viewer/*`, which is gitignored
and was stale: built by `76cb8179` at 05:27, from a tree with no `claims` key.
The guard was comparing new fixtures against an old projection and agreeing
with itself. A fixture-shape guard that cannot fail on the branch that breaks
it is not a gate.

Scope: `apps/viewer/run_tests.cjs`'s `[real]`/node-fs tier and its freshness
posture, `apps/viewer/fixtures.js`, `scripts/projection_provenance.py` (read
side only), `tests/test_viewer_js_suite.py`, `CLAUDE.md`'s pre-batch-merge
list. Do NOT change what any projection builder writes, and do NOT loosen the
fixture pairing to make the red go away — the pairing is right, its input was
stale.

## Deliverables

1. **Clear the instance.** Add the `claims` key to `hardware_entries` in
   `apps/viewer/fixtures.js` and pin how the viewer renders it with a
   fixture-tier check. `node apps/viewer/run_tests.cjs` in the main checkout
   returns to 514/514.

2. **The class: the `[real]` tier asserts its projection is fresh before it
   trusts it.** The projections already carry a provenance stamp — this
   merge's rebuild printed `topologies.json / results.json / crops.json
   branch=master sha12=4cb6a1d91774 dirty=False behind_trunk=0` — and nothing
   in the tier reads it. Read it. A projection whose `sha12` names a commit
   the working tree does not contain, or which is behind the tree, must make
   the tier **loud**.

   Follow the repo's own precedent rather than inventing a posture: since
   2026-09-18 `tests/test_viewer_js_suite.py` treats a *skipped* `[real]` tier
   as a **failure**, because "a skipped tier is not a passed one". A **stale**
   tier is the same defect wearing a green, and should read the same way.

3. **Decide, and write down, what a worktree is supposed to do.** A handoff
   worktree has no `data/` at all and uses `--repo <main checkout>` to borrow
   one — which is exactly how this defect stayed invisible. Two honest options,
   and the handoff picks one with its reasoning in the diff:
   - the borrowed projection is freshness-checked against **the worktree's**
     tree (likely red on any branch whose change touches a projected source,
     until someone rebuilds), or
   - the borrowed projection is accepted but the tier's verdict is downgraded
     to something that cannot be read as a pass.

   What is NOT acceptable is a candidate worktree rebuilding the shared
   projection: `data/` is shared by every worktree, and the builders refuse an
   older tree with exit 3 (`scripts/projection_provenance.py` owns that gate).
   A worktree rebuild would corrupt the main checkout's artifact for everyone.

4. **Enroll the new guard.** Per `CLAUDE.md`, a guard added here needs one
   mutation spec under `scripts/mutation_witnesses/`
   (`node scripts/run_mutation_witness_tests.mjs --unenrolled` prints the name
   to write). The per-source guard count is pinned, so skipping this reddens
   `pytest -q`.

5. **`CLAUDE.md`'s pre-batch-merge list gains the ordering fact**, in one line:
   the projections must be rebuilt **before** the node tiers are trusted, not
   after. This sweep ran them in the order that hid the defect, and the list as
   written does not say which comes first.

## Definition of done

- `node apps/viewer/run_tests.cjs` in the main checkout: 514/514, no skipped
  and no stale tier.
- The freshness guard **bites**: demonstrate it by pointing the tier at a
  deliberately older projection and showing a non-zero exit with a diagnosis
  naming the stale sha — a guard asserted but not witnessed failing is the
  thing this whole handoff is about.
- `venv-win/Scripts/python.exe -m pytest -q` green in the main checkout.
- `node scripts/run_mutation_witness_tests.mjs` exits 0.
- The issue above is closed with the derivation as its resolution.
