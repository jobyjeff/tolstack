# STRATEGY BRIEF 2026-08-26 — thermal_never_combines_invariant: does `thermal.py` ever combine two element values, or does `workbook_corner` get a declared exception?

> **CONSUMED 2026-09-01 — decided: option 1, the exception is declared in the
> rule (`workbook_corner` stands; routing it through `fold()` would be the
> second arithmetic path). Walker/enforcement test built regardless. Expanded
> to `docs/sessions/HANDOFF_20260901_thermal_exception_declared.md` (low).**

**Routing note.** `docs/issues/ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`
is `type: bug`, `priority: low`, `audience: strategy` — the filer already marked
this a design question, and triage agrees: the fix is a decision about the rule,
not a text edit, so a bare doc patch would just restate whichever answer nobody
chose yet.

## The contradiction, as filed

`ARCHITECTURE.md`, "Where computation may live — and the coefficient", states an
absolute:

> `thermal.py` computes **weights** — thermal factors, `2k`, `1−k`. It never
> combines two element values.

`tolerance_stack/thermal.py`'s `workbook_corner()` does exactly that (combines
`sleeve_bore`, `wall`, and `hub_bore` element values, computed outside `fold()`).
The file's own module inventory table, two sections earlier, already carries the
exception in prose ("for comparison only … deliberately not routed through
`fold()`") and `workbook_corner`'s docstring argues the case at length — a
material corner is a single-valued evaluation of one point, not a fold over a
band, so routing it through `fold()` "would be the second arithmetic path this
repo refuses." That argument may be right. The bug is that the absolute-rule
section doesn't know about its own exception, so a reader who lands on either
passage is misled about the other.

## The decision a strategy agent has to make

Pick one of:

1. **State the exception in the rule itself.** "Nothing outside `fold()`
   combines element values, except `workbook_corner`, a declared
   comparison-only reader" — the rule becomes conditionally true and stays
   checkable.
2. **Treat `workbook_corner` as the violation and remove it** — push its
   comparison logic through `fold()` (or an equivalent single arithmetic path),
   eliminating the second combiner rather than documenting it.

Whichever is chosen, the filer's suggested enforcement is concrete and cheap
either way: a test that walks `thermal.py` for arithmetic over two
`StackElement` values and requires each site to be on a declared exception
list (mirroring `test_fold_is_still_the_only_arithmetic_and_still_never_reads_lmc_or_mmc`,
`tests/test_tolerance_stack.py:180`, and the `test_architecture_inventory.py`
precedent for pairing prose against the tree). That test is what turns whichever
answer is chosen into an invariant instead of a paragraph — build it regardless
of which way the decision goes.

## Scope note

Found during `architecture_inventory_quantifiers` (2026-08-21), which was scoped
to the module inventory block and explicitly told not to touch
`tolerance_stack/stack.py` — this is why it was filed rather than fixed. Whatever
handoff this decomposes into should scope to `ARCHITECTURE.md`'s "Where
computation may live" section, `tolerance_stack/thermal.py`, and (if option 2 is
chosen) `workbook_corner`'s call sites.
