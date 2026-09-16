---
type: bug
priority: high
status: resolved
area: scripts/build_viewer_crops
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_viewer_reference_crops_in_context.md
handoff: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `citation_identity_correctness` moved to completed/; not independently verified.
---

# A balloon crop picks its parts-list row by part number alone, so one of two real rows is silently overwritten

`scripts/build_viewer_crops.py::parts_list_row_for` builds

```python
by_number = {str(row.get("part_number") or ""): row for row in rows}
```

over the run's `parts_list`, then takes `find_no` off whichever row survives.
**Two distinct rows can carry one part number**, and the handoff that introduced
this knows it — `parts_list_row_rect`'s own docstring and `61bb137`'s commit
message both say `217755`'s 2026-AUG-19 export lists `NAS1149V0332H` as *both*
find 13 and find 32. Confirmed: that export's `217755_A_balloons.json` carries
`{find_no: 13, NAS1149V0332H}` and `{find_no: 32, NAS1149V0332H}`, two different
parts (find 13 is `… .032" 1.000" LONG`, qty 15; find 32 is `… .032"`, qty 9).

A dict comprehension keeps the **last** one. So which balloon a crop is framed
on, which row the companion image shows, and what the solid *"found on the page:
balloon N"* highlight asserts are all decided by the order of rows in a JSON file
written by another repo — not by the citation.

## Repro (measured 2026-09-16, on the merged review branch)

```python
import sys, json, pathlib; sys.path.insert(0, "scripts")
import build_viewer_crops as B
b = json.loads(pathlib.Path(r"C:/workspace/drawing-checker/data/runs/"
    r"20260819_110144_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER/217755_A_balloons.json"
    ).read_text(encoding="utf-8"))
sr = {"callout": 'NAS1149V0332H  WASHER, FLAT ... (find 32, qty 9 ...)', "view": "SECTION T-T"}
B.parts_list_row_for(b, sr, "NAS1149V0332")                      # -> find_no 32   (correct)
rev = {**b, "parts_list": list(reversed(b["parts_list"]))}
B.parts_list_row_for(rev, sr, "NAS1149V0332")                    # -> find_no 13   (wrong item)
```

Under the reversed order the crop is framed on balloon **13**, the companion
shows the find-13 row with its part number boxed, and the highlight's title reads
*"found on the page: balloon 13"* — a solid, `verified_match` claim about the
wrong part, under the cited element's own name. Nothing fails.

## Why it is not wrong today, and why that is not reassuring

All four live balloon crops resolve to the find number their citation names
(34, 32, 60, 29 — each verified against the rendered PNG in review). That is
luck of insertion order, and the class is the one the review checklist calls
*"an identity or dedup key whose inputs are narrower than the thing it
identifies"*: the key is `part_number`, the thing identified is a `(part_number,
find_no)` row.

## The fix is cheap, because the citation already says which row

Every one of the four live citations carries the find number in its own callout
— `"… (find 34)"`, `"… (find 32, qty 9 …)"`, `"… (find 60, qty AR …)"`,
`"… (find 29, qty 1)"` — and `hardware_entries.json` records `find_no` as a
field (SOP Step 4's example). `parts_list_row_rect` **already** breaks exactly
this tie by find number one function away. So:

- collect **all** rows matching the part number, not a dict;
- narrow by the citation's own find number where it states one;
- refuse (return `None`) on a tie that survives, the way `parts_list_row_rect`
  already refuses — a missing companion is honest, a wrong one is not.

A test should plant two rows with one part number and assert the cited one wins
**and** that reversing the row order does not change the answer. A round-trip
test over today's data passes either way.
