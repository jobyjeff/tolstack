---
type: bug
priority: high
status: triaged
area: viewer/real-tier
reporter: agent
found_by: dispatch/docs/sessions/lessons/LESSONS_20260918_triage_sweep_classes_over_instances.md
handoff: docs/sessions/HANDOFF_20260918_real_tier_red_and_the_skipping_tier.md
---

# Two `[real]` viewer tests are red on trunk after today's batch merge, and the merge's own candidate test could not see them

Measured 2026-09-18 in the **main checkout** (`C:\workspace\tolstack`), on trunk
at `2dd457f`, immediately after the triage batch merge and its
`scripts/rebuild_projections.ps1` run:

```
PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q
1 failed, 1203 passed in 15.35s
FAILED tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green
```

The Python test is a wrapper; the real failures are in the JS runner
(`node apps/viewer/run_tests.cjs`), **451/453 passed**:

```
FAIL  [real] the zero-width flag reaches the page
      not equal: 1 !== 2

FAIL  [real] no rendered stack surface of any live stack prints an internal id,
      a field name, a checksum or a workstation path
      pitch_link_to_pitch_plate stack page renders "sha256" (an algorithm's
      name -- nothing a reader can act on)
```

Both are `[real]`-tier assertions, i.e. they read the shared live projections in
`data/projections/` rather than fixtures.

## Not caused by the docs edit that found it

Confirmed by stashing the only working-tree change (a
`docs/prompts/REVIEW_AGENT.md` checklist entry) and re-running: identical
`451/453`, same two failures. Nothing in the working tree is implicated.

## Why the batch merge reported green

This is the part worth keeping. The merge was tested in a **throwaway candidate
worktree**, and reported `1203 passed, 1 skipped`. The skip was this JS suite, so
the tier that carries these two assertions **did not run at all**.

> **Correction, 2026-09-18 (`real_tier_red_and_the_skipping_tier`):** the cause
> named below and above was `node_modules`, and that is wrong.
> `apps/viewer/run_tests.cjs` uses node built-ins only and needs no install; it
> is the **node-fs tier** that skips, because `data/projections/` is gitignored
> and lives only in the main checkout. Measured: a fresh worktree ran 369 of
> 455 checks and exited 0. `node_modules/playwright-core` is a real
> worktree-only dependency, but of the browser TRUTH tier, which pytest never
> runs. The distinction matters to anyone trying to reproduce this: `npm
> install` in a worktree fixes nothing here. The merge was therefore green on a suite
that structurally could not contain this failure, and the red only appeared in
the main checkout, after the merge had landed and the projections had been
rebuilt at `2dd457f`.

This repo's own review overlay already carries the worktree half of this shape
(*"Fresh review worktree has no `node_modules` → mass NOT WITNESSED"*). The new
finding is that the **batch merge** inherits it: `TRIAGE_AGENT.md` step 2 warns
that a gitignored build input missing from the candidate should be *reported*
rather than treated as a failure, but says nothing about the opposite and more
dangerous case — a tier that silently **skips** and lets a candidate pass.

## Which is it: the code, or the data?

Not determined here, and it decides the fix, so determine it first. Both
assertions read the live projections, which
`scripts/rebuild_projections.ps1` overwrote during the merge (all three were
stale at `efa5c4c1abed` and were rewritten at `2dd457fc904e`, `behind_trunk=0`,
exit 0). So either:

- the **merged code** changed what the page renders (a real regression that the
  candidate could not see), or
- the **rebuilt projections** legitimately carry new content that these
  assertions were not written for — in which case the assertion is what needs
  updating, and the second failure looks like this: `sha256` appears as a
  *column header* in the export block of the `pitch_link_to_pitch_plate` page,
  not as a leaked value.

The cheap discriminator: check out the pre-merge trunk (`861f6e6`) with the
**current** projections and re-run the JS suite. Same failures ⇒ the data moved;
different ⇒ the code did.

## Why `high`

tolstack's trunk suite is red, so the next batch merge is blocked on it exactly
as drawing-checker's is
(`drawing-checker/docs/issues/ISSUE_20260918_run_staleness_policy_tests_are_a_wall_clock_time_bomb.md`),
and `integration` is currently level with trunk so every handoff branch cut from
here starts red.
