---
type: chore
priority: med
status: open
area: guards/mutation-witness
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260923_mutation_witness_derived_enrollment_and_gating.md
---

# The guard census covers the three JS check sources and not pytest, so a Python guard can still arrive unenrolled in silence

`scripts/guard_enumeration.mjs` (2026-09-23) makes "this guard has no mutation
witness" a computed fact for three of the four tiers: it reads the guard
declarations out of `apps/viewer/tests.js`, `apps/annotate/run_tests.cjs` and
`scripts/run_viewer_browser_tests.mjs`, pins the count per source
(`DECLARED_GUARDS`), and reddens `pytest -q` when a guard arrives without a
spec.

**`python` is not in that map, and the omission is deliberate rather than an
oversight** — the module says so where the row would be. Two reasons, and only
the first is cheap to fix:

1. **There is no single file a python guard's name is written in.** Every other
   tier has one check source; for pytest, the entry's own `suite` *is* the file.
   An enumeration would have to walk `tests/` — which is well defined, and would
   be ~1,000 more guards.
2. **Whether a given python guard could ever be witnessed is not cheaply
   decidable.** A `python` spec may only name a suite the shadow tree can run —
   one that reads nothing outside `SHADOWED` (`tests/`, `tolerance_stack/`, and
   the three named `docs/` subdirectories). A test file that reads `data/` or the
   rest of `docs/` comes back `TIER_ALREADY_RED`, and finding that out means
   running it. So a naive census would pin a large number of guards as
   "unenrolled" when many of them are *unenrollable*, and the pin would stop
   meaning anything.

## Why it matters

The census is the whole of the new gate: *a guard you add is enrolled in the
same change*. For a Python guard that rule is still only a sentence in
`CLAUDE.md` with nothing behind it — the same posture every JS guard had until
2026-09-23, which six enrollment handoffs in eight days failed to move
(`docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md`). This repo writes
a lot of Python guards.

## What the answers look like, and why this is `audience: strategy`

They are not equivalent and the choice is a design one:

- **Census `tests/` wholesale** and accept that the pin is mostly
  unenrollable guards. Cheapest to build, and it does make a new Python test
  red until somebody acknowledges it — but "acknowledged" would become the
  normal outcome, which is how a pin stops being read.
- **Census only the test files that are already shadow-runnable** — the ones a
  `python` spec names today, plus any file a one-off sweep proves clean. A
  smaller, honest population, at the cost of a second hand-kept list (the thing
  the 09-23 rework existed to remove).
- **Make shadow-runnability declarable** — a marker in the test module itself,
  paired against an actual run in the tier. Then the population derives, like
  the JS one does, and the residue is the marker.

## Repro

```
node scripts/guard_enumeration.mjs
```

Three rows. There is no fourth, and nothing anywhere counts a Python guard that
arrived without a witness.
