---
type: chore
priority: low
status: triaged
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
handoff: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# The stack-side `VALUE_GUARDS` bite test replays only one of the reporting loop's two arms

`projection_field_guard_rows` (2026-09-15) found that
`[real] each topology value guard bites on a value nothing explains` exercised
only the *unknown value* arm of its reporting loop, never the *empty collector*
arm — the one that catches the builder silently stopping writing a guarded
field. It lifted the loop out as `unexplainedValues(guards, projection)` and
replayed the second arm per row, so all nine `TOPO_VALUE_GUARDS` rows now prove
both arms.

The **stack-side** table has the identical hole and was out of that handoff's
scope (`apps/viewer/tests.js`, `TOPO_VALUE_GUARDS` and the `[real]` mesh block):

- `[real] no live value is one the viewer has no branch for` carries its own
  copy of the same two-arm loop, inline.
- `[real] each value guard bites when fed a value nothing can explain` checks
  `known(SENTINEL)` for each of the 15 rows and nothing else.

So for `source_ref.confidence`, `checks[].verdict`, `crop entry status`,
`stacks[].worksheet_source` and eleven more, a collector that went blind — a
renamed key in `build_viewer_projection.py`, a reshaped `crops.json` — would
report `": no live value found"` at runtime and nothing proves that report
fires.

## Fix shape

Hoist `unexplainedValues` to where both tables can call it (it is currently
defined inside the topology block) and give the stack-side bite test the same
per-row blind-collector replay. Mechanical; the topology side is the worked
example, about fifteen lines including the comment.

Worth noting the two loops' messages differ slightly ("the collector in
tests.js is wrong" vs "the collector is wrong"), so sharing the function means
picking one — pick the one that names the file.
