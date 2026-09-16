---
type: bug
priority: low
status: resolved
area: scripts
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `python_value_and_schema_pins` moved to completed/; not independently verified.
---

# Two builders read `hardware_entries.json`; only one refuses a register with the wrong schema

`scripts/build_viewer_projection.py`'s `build()` reads the register and
**raises** when its `schema` is not `SCHEMA_HARDWARE`:

```python
if hardware.get("schema") != SCHEMA_HARDWARE:
    raise ValueError(f"{hardware_path}: expected schema {SCHEMA_HARDWARE!r}, ...")
```

`scripts/build_topology_projection.py`'s new `load_hardware()` (added
2026-09-15, `viewer_study_verdicts_and_gaps`) reads `entries` off whatever JSON
is at the path and returns `{"entries": []}` when the file is absent, with no
schema check at all. So a register that has been renamed, re-schema'd or
replaced makes the DAG page's "What's missing" panel report **no hardware
questions** — 43 of the 98 live gap rows are `hardware_entry` — while the
classic view's builder refuses the same file loudly.

Tolerating an *absent* register is deliberate and documented in the docstring (a
fixture tree carries its own, and a tree without one honestly has no
hardware-entry gaps). Tolerating a *present but unreadable* one is the part with
no argument behind it: on this page an empty gap list is a positive claim that
nothing is missing.

**Fix shape:** the same three lines the sibling builder has, in `load_hardware`
— import `SCHEMA_HARDWARE` (already exported from `tolerance_stack.stack`) and
raise on a mismatch. Absence stays silent; a wrong schema stops being silent.
