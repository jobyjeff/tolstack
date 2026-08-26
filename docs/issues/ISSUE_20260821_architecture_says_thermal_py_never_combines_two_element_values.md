---
type: bug
priority: low
status: triaged
area: docs
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260826_thermal_never_combines_invariant.md
---

# `ARCHITECTURE.md` says `thermal.py` "never combines two element values"; `workbook_corner` does

Found during `architecture_inventory_quantifiers` (2026-08-21) while auditing the
module inventory block's quantifiers. The inventory row for `thermal.py` read
*"stdlib only, and no arithmetic of its own beyond `thermal_factor()`"* — an
unchecked claim, and a false one. That row is fixed (the clause is deleted; the row
now points at the section where the rule is argued). **The section it points at
carries the same claim, and this issue is about that copy.**

`ARCHITECTURE.md`, "Where computation may live — and the coefficient":

```
`thermal.py` computes **weights** — thermal factors, `2k`, `1−k`. It never
combines two element values. That is the line, and it is the one to hold if a
third archetype wants its own layer.
```

`tolerance_stack/thermal.py`, `workbook_corner()`:

```python
sleeve_bore = at(chain.sleeve_bore_element) * f_sleeve
wall        = at(chain.sleeve_wall_element) * f_sleeve
hub_bore    = at(chain.hub_bore_element) * f_hub
sleeve_od   = sleeve_bore + 2 * wall
if stage == "hub_to_sleeve":
    return sleeve_od - hub_bore
```

Those are two element values being combined, in `thermal.py`, outside `fold()`.

## Why it is not simply a typo

The exception is **already documented, deliberately, two sections earlier in the
same file** — the `thermal.py` contents table says `workbook_corner` is *"for
comparison only … deliberately not routed through `fold()`"* — and the function's
own docstring argues the case at length: a coherent material corner is a
single-valued evaluation of one point, not a fold over a band, so routing it
through `fold()` "would be the second arithmetic path this repo refuses". That
argument may well be right. What is wrong is that the file states an absolute
("never") in the section where the invariant is defined, and its own exception in
a table above it, so a reader who arrives at either one is misled about the other.

So the fix is a **statement of the rule**, not an edit: does the one-combiner
invariant read "nothing outside `fold()` combines element values, except a
declared comparison-only reader", or is `workbook_corner` a violation to be
removed? That is a design call, hence `audience: strategy`.

## What would make it stick

The same rule the inventory block now runs on: the claim is checkable, so it
should be checked rather than asserted. `test_fold_is_still_the_only_arithmetic_and_still_never_reads_lmc_or_mmc`
(`tests/test_tolerance_stack.py:180`) already reads `fold()`'s own source, and
`tests/test_architecture_inventory.py` is the precedent for pairing a paragraph of
`ARCHITECTURE.md` against the tree. A guard that walks `thermal.py` for arithmetic
over two `StackElement` values and requires each site to be on a declared
exception list would turn this paragraph from prose into an invariant — and would
have gone red the day `workbook_corner` was added.

## Not in scope where it was found

`architecture_inventory_quantifiers` is scoped to the module inventory block and
was told not to touch `tolerance_stack/stack.py`. Rewriting the repo's central
arithmetic invariant is well outside that, so it is filed rather than fixed.
