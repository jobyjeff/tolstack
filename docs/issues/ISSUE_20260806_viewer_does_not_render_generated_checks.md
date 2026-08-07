---
type: bug
priority: high
status: resolved
area: apps/viewer + scripts/build_viewer_projection.py
reporter: agent
handoff: docs/sessions/HANDOFF_20260806_viewer_generated_checks.md
---

# The viewer renders no checks for a `thermal_fit` stack, because the projection folds with `load_stack()`

> **RESOLVED 2026-08-06** by handoff `viewer_generated_checks`. The projection
> dispatches on `archetype` (`ARCHETYPE_LOADERS`) so both stacks now project
> their 16 generated checks; `element_terms` carries `coefficient` and the viewer
> prints every weighted term (`+ 2.0010712 × sleeve_wall_lower`), verified term
> for term against `debug_report_thermal_fit.py --terms` by a test; the shared
> worksheet resolves for both through `provenance.worksheet`. The honesty guard
> survives, narrowed to an archetype with no loader. See
> `docs/sessions/lessons/LESSONS_20260806_viewer_generated_checks.md`.

`scripts/build_viewer_projection.py` builds every stack with
`tolerance_stack.stack.load_stack()`. A `thermal_fit` stack's `checks` array is
**empty in the file by design** — `thermal.load_thermal_fit_stack()` generates
the checks from the `thermal_fit` block and *refuses* a hand-written one, so a
check in the JSON would be a second, unverified source of coefficients.

Result, on the merged tree (`hub_bearing_thermal_stack` + `stack_viewer_v0`):

```
hub_bearing_thermal_fit_m1          8 elements (4T/2I/2U), 0 paths, 0 checks, NO WORKSHEET
hub_bearing_thermal_fit_m2          8 elements (8T/0I/0U), 0 paths, 0 checks, NO WORKSHEET
```

Two of the repo's six stacks reach the review surface as an elements table and
nothing else. **Every engineering result in them — the interference at each
corner of (fit condition × temperature), which is the entire point of the
archetype — is absent, with no error and no test failure.**

Neither handoff is at fault: `stack_viewer_v0` was built against a tree with no
thermal archetype, `hub_bearing_thermal_stack` against a tree with no viewer.
Both suites are green, on both branches and on the merge, because nothing tests
the viewer against a generated-check stack.

## What was already done (`review/stack_viewer_v0`, 2026-08-06)

Only the **honesty guard**, not the feature. The projection now carries
`archetype` and `checks_generated_not_rendered`, and the viewer prints a loud
notice naming the archetype and the command that does show the terms
(`tests/debug_report_thermal_fit.py --terms --markdown`) instead of a quiet
"no checks". Pinned by
`test_a_generated_check_archetype_says_so_rather_than_showing_no_checks` and a
fast-tier JS test. That converts a silent misrepresentation into a visible gap;
it does not close the gap.

## Why the real fix is not a one-liner

Dispatching on `archetype` to call `thermal.load_thermal_fit_stack()` is the easy
half. The hard half is that generated terms carry **coefficients** (`2`, `k`,
`2k`, `1−k`, soak factors), and the viewer's term rendering does not:

- `build_viewer_projection.term_elements()` returns `{element_id, sign}` and
  drops `Term.coefficient`;
- `apps/viewer/views/stack.js` renders each input as a chip reading
  `+ element_id` / `− element_id`.

So a naive fix would display a `2k`-weighted sleeve wall as a bare
`+ sleeve_wall`. That is **worse than rendering nothing**: it is a term list that
looks readable and is wrong, on the surface whose job is letting a reviewer read
every sign — and the overlay's check 2 already tells reviewers they cannot verify
a thermal stack's signs from the JSON. A viewer that appears to show them, and
doesn't, would actively mislead.

## Suggested fix

1. `term_elements()` carries `coefficient` alongside `element_id`/`sign`; the
   projection schema gains it; `stack.js` renders it (`+ 2k × sleeve_wall`, or at
   minimum the numeric weight) — and a test asserts a non-unity coefficient
   reaches the DOM. **Do this first**; it is the part that makes the rest safe.
2. `project_stack()` dispatches on `raw["archetype"]` to the matching loader
   (`thermal.load_thermal_fit_stack`), so the checks are generated once, in
   Python, by the same code the tests pin — never re-derived in JS.
3. The check cards will need the archetype's own vocabulary (fit condition,
   temperature, stage) to be legible; `ARCHETYPE_thermal_fit.md` is the source.
4. Consider whether the elements table should show `materials.json` / CTE for a
   thermal stack, which currently reaches the viewer not at all.

## Related, smaller

`WORKSHEET_hub_bearing_thermal_fit.md` covers **both** `_m1` and `_m2`, but the
projection matches worksheets by name (`stack_X.json` → `WORKSHEET_X.md`), so
both stacks report `worksheet_file: null` and the viewer says "no worksheet". It
correctly declines to guess, which is the right default (see
`test_worksheet_is_matched_by_name_and_absence_is_reported`), but one worksheet
serving several stacks is now a real pattern and probably wants an explicit
`worksheet` field in the stack file rather than a naming convention.

Found during `review/stack_viewer_v0`, 2026-08-06, by rebuilding the projection
on the merged tree — neither branch's own suite can see this, which is the
recurring "a sibling handoff landed on master while you were reviewing" class.
