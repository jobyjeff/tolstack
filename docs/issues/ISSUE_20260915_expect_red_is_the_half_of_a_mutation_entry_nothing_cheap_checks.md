---
type: bug
priority: med
status: resolved
area: tests/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md
handoff: docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `mutation_witness_tier_repair` moved to completed/; not independently verified.
---

# `expect_red` is the half of a mutation entry that nothing cheap checks

A `scripts/mutation_witnesses.json` entry couples itself to the tree with **two**
strings, not one:

- `find` — where the mutation lands, in the app.
- `expect_red` — the sub-check name the owning tier must print, in the test file.

`tests/test_mutation_witnesses.py` pairs the first against the tree on every
`pytest -q`, and its own docstring says exactly why: *"an entry whose `find` no
longer resolves is not a failing guard — it is a guard that quietly stopped being
checked, which is the exact failure mode the whole tier exists to kill, reproduced
one level up."* Every word of that is true of `expect_red`, and nothing checks it.

So a reviewer who rewords a sub-check name — which is a normal, correct edit, and
exactly the kind of "the app changed correctly" change this whole tier was built
around — silently converts the entry into one that can never be witnessed. The
only symptom is a `NOT WITNESSED` from a ~7-minute browser sweep somebody makes
time for later, which is the delay `test_mutation_witnesses.py` exists to remove.

## Measured, 2026-09-15 (review of `guard_mutation_witness_tier`)

Replaced one entry's `expect_red` with `"a check name nobody prints"`:

```
venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py
  6 passed in 0.03s                          <-- green, with a dead entry

node scripts/run_mutation_witness_tests.mjs --only hosted-page
  NOT WITNESSED — the tier went red, but not on the declared check.
    declared: a check name nobody prints
```

The runner's diagnostic is good; the point is that only the slow half ever asks.

## The fix, verified to work today

Sub-check names are written as adjacent string literals across source lines, so a
naive substring search misses them. Joining the concatenations first is enough —
all ten entries then resolve to **exactly one** place:

```python
JOINED = re.compile(r'"\s*\+\s*"')
CHECK_SOURCE = {"fast": "apps/viewer/tests.js",
                "browser": "scripts/run_viewer_browser_tests.mjs"}
# ...then the same count(...) == 1 assertion test_every_anchor_resolves_
# to_exactly_one_place already makes for `find`.
```

Two things to get right:

- `CHECK_SOURCE` maps a **tier** to the file its check names live in, and for the
  fast tier that is `apps/viewer/tests.js`, **not** the `run_tests.cjs` the tier
  is invoked as. Make it a module-level constant beside `TIERS`, per this repo's
  standing rule on vocabularies.
- Uniqueness, not mere presence: two checks sharing a name means the runner
  cannot attribute the red either, which is the same defect one step along.

Three of the ten entries deliberately share one `expect_red` (the three
`*-survives-a-topology-switch` preference siblings all point at one sub-check), so
assert one match **in the source**, not one entry per name.
