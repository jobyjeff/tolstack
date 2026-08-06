---
priority: high
depends_on: []
---

# HANDOFF 2026-08-06 — viewer_generated_checks: render a `thermal_fit` stack's generated checks, coefficients first

Source: `docs/issues/ISSUE_20260806_viewer_does_not_render_generated_checks.md`,
filed by the `stack_viewer_v0` review on 2026-08-06 and routed by the same day's
triage sweep. Baseline: `master` @ `de7f7f1` (the merged tree carrying both
`hub_bearing_thermal_stack` and `stack_viewer_v0`, plus the review's honesty
guard). Scope: `scripts/build_viewer_projection.py`, `apps/viewer/`, and their
tests. Do NOT touch `docs/tolerance_stacks/*.json` (owned by the parallel staged
handoffs `traced_labels_and_ratio` and `citation_export_provenance`),
`tolerance_stack/stack.py`'s schema, or `.gitignore`.

## The defect

`scripts/build_viewer_projection.py` builds every stack with
`tolerance_stack.stack.load_stack()`. A `thermal_fit` stack's `checks` array is
**empty in the file by design** — `thermal.load_thermal_fit_stack()` generates
the checks from the `thermal_fit` block and *refuses* a hand-written one, because
a check in the JSON would be a second, unverified source of coefficients.

On the merged tree:

```
hub_bearing_thermal_fit_m1          8 elements (4T/2I/2U), 0 paths, 0 checks, NO WORKSHEET
hub_bearing_thermal_fit_m2          8 elements (8T/0I/0U), 0 paths, 0 checks, NO WORKSHEET
```

Two of the repo's six stacks reach the review surface as an elements table and
nothing else. **Every engineering result in them — the interference at each
corner of (fit condition × temperature), which is the entire point of the
archetype — is absent, with no error and no test failure.** Neither handoff is at
fault: `stack_viewer_v0` was built against a tree with no thermal archetype,
`hub_bearing_thermal_stack` against a tree with no viewer. Both suites are green
on both branches and on the merge, because nothing tests the viewer against a
generated-check stack. (Recurring-bugs checklist: "a sibling handoff landed on
`master` while you were reviewing", second sighting.)

## What already exists — do not redo it

`review/stack_viewer_v0` shipped the **honesty guard only**, not the feature. The
projection now carries `archetype` and `checks_generated_not_rendered`, and the
viewer prints a loud notice naming the archetype and the command that does show
the terms (`tests/debug_report_thermal_fit.py --terms --markdown`) instead of a
quiet "no checks". Pinned by
`test_a_generated_check_archetype_says_so_rather_than_showing_no_checks` and a
fast-tier JS test. Keep both tests meaningful as you close the gap — replace
them deliberately, don't delete them silently.

## Why this is not a one-liner, and the required order

Dispatching on `archetype` is the easy half. The hard half: generated terms carry
**coefficients** (`2`, `k`, `2k`, `1−k`, soak factors) and the viewer's term
rendering does not.

- `build_viewer_projection.term_elements()` returns `{element_id, sign}` and
  drops `Term.coefficient`;
- `apps/viewer/views/stack.js` renders each input as a chip reading
  `+ element_id` / `− element_id`.

A naive dispatch-only fix would display a `2k`-weighted sleeve wall as a bare
`+ sleeve_wall`. That is **worse than rendering nothing**: a term list that looks
readable and is wrong, on the surface whose job is letting a reviewer read every
sign — and the overlay's check 2 already tells reviewers they cannot verify a
thermal stack's signs from the JSON. A viewer that appears to show them and
doesn't would actively mislead.

## Deliverables, in this order

1. **Coefficients reach the DOM first.** `term_elements()` carries `coefficient`
   alongside `element_id`/`sign`; the projection schema gains it; `stack.js`
   renders it (`+ 2k × sleeve_wall`, or at minimum the numeric weight). A test
   asserts a **non-unity** coefficient reaches the DOM. This is the deliverable
   that makes the rest safe — do not reorder it.

2. **`project_stack()` dispatches on `raw["archetype"]`** to the matching loader
   (`thermal.load_thermal_fit_stack`), so the checks are generated once, in
   Python, by the same code the tests pin — **never re-derived in JS**.

3. **Give the check cards the archetype's vocabulary.** Fit condition,
   temperature, stage — `ARCHETYPE_thermal_fit.md` is the source. A generated
   check card that omits which corner of (fit × temperature) it describes is not
   legible, and legibility is the whole deliverable.

4. **Consider `materials.json` / CTE in the elements table** for a thermal stack;
   it currently reaches the viewer not at all. Suggestion to evaluate, not a
   requirement — if you skip it, say why in the lesson.

5. **The worksheet-matching nit** (smaller, same file):
   `WORKSHEET_hub_bearing_thermal_fit.md` covers **both** `_m1` and `_m2`, but
   the projection matches worksheets by name (`stack_X.json` → `WORKSHEET_X.md`),
   so both stacks report `worksheet_file: null` and the viewer says "no
   worksheet". Declining to guess is the right default and is pinned by
   `test_worksheet_is_matched_by_name_and_absence_is_reported` — keep that
   behaviour, and add an explicit optional `worksheet` field in the stack file
   that overrides the naming convention when present. One worksheet serving
   several stacks is now a real pattern.

## Definition of done

- Rebuild the projection against the **main checkout**
  (`venv-win\Scripts\python.exe scripts\build_viewer_projection.py --data-root
  C:\workspace\tolstack\data` — the projections are stale unless you rebuild
  them, per the checklist) and show `hub_bearing_thermal_fit_m1` and `_m2`
  rendering their generated checks, with coefficients visible on every weighted
  term and a worksheet resolved for both.
- The rendered terms agree, term for term and coefficient for coefficient, with
  `tests/debug_report_thermal_fit.py --terms --markdown` for the same stack.
  Paste the comparison into the lesson — that is the evidence the viewer is not
  re-deriving anything.
- The four non-thermal stacks render exactly as before (no regression in the
  check cards or the provenance scoreboard).
- Tests: non-unity coefficient in the DOM; archetype dispatch pinned at value
  level; the worksheet override and the by-name fallback both pinned.
- Full suite green (`venv-win\Scripts\python.exe -m pytest -q`), and
  `git log --oneline HEAD..master` checked with `master` merged in before you
  call it green — that is the checklist item this issue exists because of.
- Lesson (`docs/sessions/lessons/LESSONS_20260806_viewer_generated_checks.md`):
  what the projection schema now guarantees about coefficients, and the rule for
  the next archetype (generated checks are produced in Python by the archetype's
  own loader; the viewer never re-derives).
