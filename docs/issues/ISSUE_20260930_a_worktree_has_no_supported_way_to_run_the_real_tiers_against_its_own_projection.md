---
type: feature
priority: med
status: triaged
area: tiers/projection-freshness
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md
class: shared_mutable_state_across_worktrees
strategy: docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md
---

# A worktree that changes a projection builder has no supported way to run the `[real]` tiers against its own projection

Any handoff that edits `scripts/build_*_projection.py` hits this, and
`columns_ordered_to_minimise_crossings` (2026-09-30) is the second in a month
(`fixture_pairing_reads_a_fresh_projection`, 2026-09-24, is the first).

## The bind

Three true rules that together leave no door open:

1. **`data/projections/viewer/` is one directory shared by every live
   worktree**, and `scripts/projection_freshness.cjs`' own header says a
   worktree *"must NOT rebuild the shared projection to clear the red"*. With
   two or three agents live, a rebuild from one branch reds every other one's
   `[real]` tier — the stamped commit is not in their trees.
2. **`scripts/rebuild_projections.ps1` builds from the MAIN checkout's tree**,
   which is on `master`. So the handoff instruction *"rebuild in the main
   checkout, then run the tiers"* produces a projection **from the old code**,
   and every `[real]` check then compares the branch's new fixtures against it
   — the two-trees comparison the freshness pairing exists to catch, arrived at
   by following the documented procedure.
3. **`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`** borrows
   the main checkout's projection, which is (2) again, and correctly reports
   itself not-fresh rather than passing.

Net: the tier a projection-builder change most needs is the one it cannot run,
and the honest outcomes are a red, a skip, or a shared-state collision.

## What actually works today, in four manual steps

Nothing in the harness is missing — only the route is undocumented:

1. A scratch root with `data/inbox` and `data/meshes` as junctions to the main
   checkout's (`cmd /c mklink /J`), `data/projections/` a real directory, and
   `docs` junctioned to the worktree's own (the viewer reads worksheets through
   the same `--repo` root).
2. Build all three projections into it from the worktree with `--data-root`.
   The provenance gate does not fire — nothing to overwrite — and the stamp
   names the worktree's own HEAD, so the freshness check passes.
3. `node_modules` junctioned into the worktree; `playwright-core` exists only
   in the main checkout and the browser tier needs it.
4. Every tier with `--repo <scratch>`. All four already take the flag.

Keep the scratch path SHORT: PyMuPDF could not write a crop PNG under the
session scratchpad's ~160-character path.

## What a fix could look like (not costed, hence `audience: strategy`)

* a `-DataRoot` parameter on `scripts/rebuild_projections.ps1` plus a
  `-SourceRoot`, so a worktree can say "build from me, write there";
* or a `scripts/private_projection.ps1` that does the four steps above and
  prints the `--repo` argument to paste;
* or leave it manual and write it into `CLAUDE.md`'s worktree section and the
  tactical handoff template, next to the existing "run the tiers in the main
  checkout" line — which is the line that is currently wrong for exactly this
  class of change.

Whichever: the freshness module's header tells a worktree what it must **not**
do and does not say what it **can**, and that gap is where the time goes.
