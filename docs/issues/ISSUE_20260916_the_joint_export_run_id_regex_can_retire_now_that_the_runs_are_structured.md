---
type: chore
priority: low
status: open
area: scripts/build_viewer_crops
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md
---

# `build_viewer_crops._RUN_ID_RE` parses run ids out of a prose sentence that now has a structured sibling

`scripts/build_viewer_crops.py` reaches a stack's assembly-export run ids by
regex over free text:

```python
_RUN_ID_RE = ...            # line 182
... _RUN_ID_RE ...          # used at line 492
```

The text it scans is `joint.assembly_export`, e.g.

```
"[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf
 (drawing-checker run 20260804_114000 / 20260803_145243)"
```

As of 2026-09-16 (`python_value_and_schema_pins`) every joint that carries that
sentence **also** carries `joint.assembly_export_ref`, a real `SourceExport`
whose `runs` are `ExportRun(run_id, ts)` objects, validated at load and paired
against the prose field by
`test_a_joint_that_names_an_export_in_prose_also_names_it_structurally`. The
crop builder could read `StackDefinition.assembly_export_ref.run_ids` and drop
the regex entirely.

**Why it was not done in that session.** `scripts/build_viewer_crops.py` and
`tests/test_viewer_crops.py` were both owned by
`HANDOFF_20260916_viewer_unwitnessed_surface_guards.md` in the same triage
sweep, so the migration was deliberately additive and the retirement explicitly
out of scope. Nothing is broken today: the prose field is unchanged, the regex
still finds both runs (verified), and the pairing test is what stops a later
tidy-up from deleting the sentence out from under it.

## What retiring it involves

1. `build_viewer_crops.py`: read the run ids off `assembly_export_ref` instead
   of the sentence; delete `_RUN_ID_RE`.
2. `tests/test_viewer_crops.py`: whatever pins the regex today.
3. `ARCHITECTURE.md:531` describes the resolution order and calls
   `joint.assembly_export` the "legacy free-text" fallback "kept only so a stack
   written before 2026-08-06 still resolves". That sentence has to move with the
   code, and it is the kind of prose this repo's guards do not read.
4. Decide what happens to the prose field itself. It is human-readable context a
   reviewer uses, so "delete it" is not obviously right — but once nothing parses
   it, the pairing test's second half (a block with no prose field is refused)
   is enforcing a requirement with no consumer behind it, and should be
   revisited in the same change.

A stack whose `joint` has **no** export key at all (three of the seven) is
unaffected either way.
