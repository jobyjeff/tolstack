---
type: chore
priority: med
status: resolved
resolution: fixed 2026-09-16 by handoff `mutation_witness_tier_reaches_its_checks` -- third tier word `annotate` added, two witnesses declared on it and both witnessed.
area: scripts/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
handoff: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
---

# A guard in `apps/annotate/run_tests.cjs` cannot be declared in `mutation_witnesses.json` at all

The mutation-witness tier knows **two** tiers, and its `"fast"` one is the
viewer's, not a generic one:

- `scripts/run_mutation_witness_tests.mjs`, `tierCommand()` — `tier: "fast"`
  spawns `apps/viewer/run_tests.cjs` and nothing else.
- `tests/test_mutation_witnesses.py`, `CHECK_SOURCE` — a fast entry's
  `expect_red` is searched for in `apps/viewer/tests.js` and nothing else.

So a guard living in `apps/annotate/run_tests.cjs` has no way to be declared:
the runner would run the wrong suite and the pytest pairing would report the
entry's `expect_red` as rotted.

## What is uncovered right now

`annotate_hosted_page_posture` (2026-09-15) added two fast-tier guards to the
annotate runner, both standing on Jeff's never-render-a-terminal-command rule:

- `the no-projection banner is plain words, with nothing to paste`
- `this app holds no terminal command for a banner to render`

Neither can get a witness entry, so nothing standing checks that they would
notice the defect coming back. That handoff's *browser*-tier guard did get one
(`hosted-annotate-withholds-the-bind-workspace`, witnessed 2026-09-15) —
browser entries name a `suite`, and the annotate hosted-posture suite is in
the viewer runner's own `SUITES` registry, so that half already worked.

## Fix shape

Add a third tier word rather than overloading `"fast"` — the two runners are
separate harnesses with separate check-name sources, and `"fast"` already
means the viewer's. Roughly:

- `TIERS` gains the word; `CHECK_SOURCE` gains its row
  (`apps/annotate/run_tests.cjs` is both the harness *and* where the names
  live, unlike the viewer's split).
- `tierCommand()` gains the branch; the annotate runner takes `--repo` already
  (its `[real]` checks read the main checkout), so nothing else changes.
- `FAST_FAIL` in the mutation runner parses `FAIL  <name>`; the annotate
  runner prints the same shape, so the failure-name regex may be reusable
  as-is — check before assuming.

Cheap, and it is the difference between two guards that are checked and two
that are merely written.

## Resolved 2026-09-16 -- `mutation_witness_tier_reaches_its_checks`

Done as recommended: a **third tier word**, `annotate`, rather than a second
meaning for `"fast"`.

- `scripts/run_mutation_witness_tests.mjs` now holds the tier vocabulary in one
  `TIER_HARNESS` object keyed by tier word -- the script to spawn, the regex its
  failure lines match, and whether it takes `--only <suite>`. The `if`-chain and
  the `FAST_FAIL`/`BROWSER_FAIL` ternary are gone.
- `tests/test_mutation_witnesses.py` carries `annotate` in `TIERS` and a
  `CHECK_SOURCE` row pointing at `apps/annotate/run_tests.cjs` -- which is both
  the harness *and* where its check names live, unlike the viewer's split. A new
  test reads `TIER_HARNESS`'s keys out of the runner and pairs them against
  `TIERS`, so a word on one side and not the other is red in 0.2s instead of
  `unknown tier` several minutes into a sweep.
- **Two** entries declared on it and both witnessed, standing behind exactly the
  two guards this issue named: `annotate-banner-says-nothing-to-paste` (the
  copy) and `annotate-carries-no-command-to-render` (the supply).

```
--- annotate-banner-says-nothing-to-paste
  clean run of annotate / ... green
  mutated run... WITNESSED
  reddens: the no-projection banner is plain words, with nothing to paste

--- annotate-carries-no-command-to-render
  clean run of annotate / ... green
  mutated run... WITNESSED
  reddens: this app holds no terminal command for a banner to render
```

### Three corrections to this filing, all measured

1. **`FAST_FAIL` is reusable as-is** -- confirmed. The annotate runner prints
   `FAIL  <name>` with two spaces, so `/^FAIL {2}(.+)$/` matches unchanged.
2. **`apps/annotate/run_tests.cjs` does not read `--repo`** -- correct, it never
   touches `process.argv`. It is forwarded anyway: `tierCommand` passes
   `--repo <DATA_REPO>` to every tier from one code path, the annotate runner
   ignores it harmlessly, and a harness that learns the flag later then works
   with no change on the runner side.
3. **But it DOES have `[real]` checks** -- two of them, and this is the one thing
   both this issue and the handoff got wrong in the direction that cost time.
   They resolve `data/` through a two-candidate fallback (this tree, then a
   hard-coded main-checkout path), which is why they run from a worktree with no
   `--repo` at all. What they do *not* resolve that way is the **tracked**
   `docs/topologies/part_mesh_aliases.json`, read repo-relatively -- correctly,
   since it is tracked and therefore in every worktree. Inside the mutation
   runner's shadow tree it is not, because the shadow held only `apps/` and
   `scripts/`: both `[real]` checks threw `ENOENT`, the clean run went red, and
   every annotate entry reported *the tier was red before the mutation, so
   nothing was proved*. Fixed by shadowing `docs/topologies/` too -- 194 KB,
   narrow on purpose rather than all 5.2 MB of `docs/`.

Not taken on, as the handoff directed:
`ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`.
