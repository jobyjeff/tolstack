---
type: bug
priority: high
status: resolved
area: tests/viewer-fixtures
reporter: agent
audience: tactical
handoff: docs/sessions/HANDOFF_20260924_fixture_pairing_reads_a_fresh_projection.md
found_by: dispatch/docs/sessions/lessons/LESSONS_20260924_triage_sweep_403_burst_and_the_merge_gate_ordering.md
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

## Resolution — 2026-09-24, `fixture_pairing_reads_a_fresh_projection`

**The instance.** `claims` is in `apps/viewer/fixtures.js`'s hardware pile,
declared against that pile's own (deliberately empty) `entries` list rather
than copied from trunk's counts, and a fixture-tier guard pins the honest
answer to "how does the viewer render it": it must not. A metric name is a key
out of a test registry — the same class of thing as `source_ref` and
`crops.json` on the reader-facing banned list — so no surface of the page may
print one.

**The class.** `apps/viewer/run_tests.cjs` now pairs the projection with the
tree before the `[real]` tier trusts a line of it. The question it puts to git
is deliberately **not** "which branch" or "how far behind" but the only one
that decides whether the comparison means anything: *are the inputs this
projection was built from still what is on disk here?* One answer covers a
stale projection, a newer one, a divergent branch and an uncommitted edit.
The inputs are read out of the stamp itself — the source directory is found by
shape (the one absolute path inside the recorded `repo_root`) rather than by
key name, so `stacks_dir` / `events_dir` stays a fact Python owns — plus the
recorded `built_by` script and `tolerance_stack/`, which all three builders
import.

It is quiet where it should be: two of the thirty commits before this one
touched a projected input, so this is not an alarm that is always on.

**What a worktree does**, the question the handoff asked to be decided in the
diff: a borrowed projection (`--repo`) is freshness-checked against **the
borrowing worktree's** tree, and a borrow that fails is a **failed check plus a
skipped tier** — not a downgraded pass. The rejected alternative (accept the
borrow, soften the verdict) leaves the pre-merge candidate test unable to
produce a trustworthy answer at all, and the candidate is exactly the moment
the pairing has to be falsifiable. A worktree still must not rebuild the shared
projection to clear the red; the message names a rebuild in the checkout that
owns `data/`.

**Witnessed, not merely asserted.** Pointed at a projection stamped
`76cb8179bbc9`, the tier exits 1, names the stale commit and the thirteen input
files that have moved, and reports `422/423 passed, 1 TIER SKIPPED -- NOT RUN,
NOT PASSED`. (Re-measured in review on the merged tree, 2026-09-24: the
`421/422` first written here was taken before this handoff's *second* guard
existed, so the shipped tree runs one check more than the figure describes.
The 13 input files and the exit code reproduce exactly.) The mutation spec
`fast__real-the-projection-this-tier-reads-was-built-from-this__ea8930ee.json`
replays the original defect (one more declaration added to
`hardware_entries.json`) and is `WITNESSED`.

**The ordering.** `CLAUDE.md`'s pre-batch-merge list now says the projections
are rebuilt **before** the three node tiers, never after. The 2026-09-24 sweep
ran them in the other order; the wrong order is now loud rather than green, but
it is still a rerun.

**Not fixed here, and filed:**
`ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`.

