---
type: bug
priority: high
status: open
area: tests/viewer-fixtures
reporter: agent
audience: tactical
found_by: triage batch merge 2026-09-24 (integration -> master, d6f766a -> 4cb6a1d)
---

# `hardware_entries` gained a `claims` key that `apps/viewer/fixtures.js` does not carry — and the guard that pairs them could not see it until after the merge

## The instance

`node apps/viewer/run_tests.cjs` in the main checkout is **red**, 513/514:

```
FAIL  [real] every fixture shape still matches the builder's
      fixtures.js has drifted from the live projection: ["hardware_entries: the projection writes [claims] and apps/viewer/fixtures.js does not — ADD THEM TO fixtures.js, so a fixture-tier test can pin how the viewer renders them"] !== []
```

`claims_registry_guards_read_declarations_not_prose` (merged here) added a
top-level `"claims"` array to `docs/tolerance_stacks/hardware_entries.json`.
The projection builder writes it through. `apps/viewer/fixtures.js` was never
touched by that change (`git diff d6f766a..4cb6a1d -- apps/viewer/fixtures.js`
is empty), so the fixture tier pins nothing about how the viewer renders the
new key.

The point fix is one fixture edit. **That is not what this issue is for.**

## The class, which is the reason this is `high`

**A fixture-shape guard that reads a gitignored derived artifact cannot fail
on the branch that breaks it.** The evidence is this merge's own timeline:

1. Step 2 built the merge candidate in a throwaway worktree and ran the tier
   with `--repo C:/workspace/tolstack` — the documented worktree escape hatch,
   which re-points the node-fs tier at the main checkout's `data/`. Result:
   **514/514 passed.**
2. The merge landed on trunk.
3. Step 7 ran `scripts\rebuild_projections.ps1`, which rebuilt
   `data/projections/viewer/*` from `4cb6a1d` (they had been built by
   `76cb8179` at 05:27, i.e. from a tree predating the merge).
4. The same tier, same code, now: **513/514.**

Nothing about the code changed between (1) and (4). The guard compares
`fixtures.js` against *the projection on disk*, and the projection on disk was
**stale** — built from a tree that had no `claims` key. So the guard was
comparing the new fixtures against the old projection and agreeing with itself.

This makes the fixture pairing **unfalsifiable at exactly the moment it is
needed**: on a handoff branch, in a review worktree, and in the batch merge's
own pre-merge candidate test. It only bites after a rebuild, which today
happens once per batch merge — *after* the merge is already on trunk. A guard
that can only fail downstream of the gate it exists to feed is not a gate.

Note this is the same shape as the mutation-witness decay documented in
`LESSONS_20260922_*` and `CLAUDE.md` ("a witness decays between the branch that
measured it and the trunk that runs it"), but with the stale artifact on the
*input* side rather than the output side, so the existing pre-merge checklist
does not catch it.

## What a fix has to establish

- A tree-vs-projection **freshness check** the tier performs before it trusts a
  `[real]` comparison: the projection's provenance stamp already records
  `branch`/`sha12`/`behind_trunk` (`scripts/projection_provenance.py`), so the
  data to do this exists and is not being read here.
- A projection built from a tree the checkout does not match should make the
  `[real]` tier **loud** — the repo's own precedent is
  `tests/test_viewer_js_suite.py`, which since 2026-09-18 treats a *skipped*
  tier as a failure rather than a pass, for this exact reason. A **stale** tier
  is the same defect wearing a green.
- Whether the pre-merge candidate test can rebuild projections at all. It
  currently cannot: `data/` is gitignored, shared by every worktree, and the
  builders refuse to overwrite from an older tree (exit 3). A candidate
  worktree rebuilding the *shared* projection would corrupt the main checkout's
  artifact for everyone. So the answer is probably a read-only freshness
  assertion plus a named rebuild step, not a rebuild-in-the-worktree.
