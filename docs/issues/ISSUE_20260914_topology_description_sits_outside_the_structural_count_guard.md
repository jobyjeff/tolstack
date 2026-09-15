---
type: bug
priority: med
status: triaged
area: tests/topology
reporter: agent
handoff: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
---

# A topology's new `description` is a second home for structural counts, and the count guard does not read it

`stack_title_style_pass` (2026-09-14) added an optional top-level `description`
to `Topology`, `Study` and `StackDefinition`, and moved into it the
qualification the shortened `title` shed. For two topologies the demoted
sentence is a **structural inventory of the graph**:

| file | `description` | `notes` (the guarded copy) |
|---|---|---|
| `topology_pitch_link_to_pitch_plate.json` | "The grip-length joint as a graph: **4 parts, 7 interfaces, 8 edges**. …" | "The graph: 4 parts, 7 interfaces, 8 edges, 3 branch points, 2 grounded loops …" |
| `topology_tan_link_to_pitch_plate_take2.json` | "The take-2 grip-length joint as a graph: **4 parts, 7 interfaces, 7 edges**, closing at the derived protrusion gap." | same counts, in `notes` |

Both are **correct today** — verified by hand against the files (4/7/8 and
4/7/7). The defect is the pairing, not the numbers.

`tests/test_topology.py::test_a_topologys_own_notes_count_the_graph_they_describe`
is the guard this repo wrote for exactly this hand-copy. It scans

```python
prose = json.dumps({k: v for k, v in raw.items()
                    if k in ("title", "notes", "provenance")})
```

`description` is not in that tuple. So the `notes` copy fails loudly when an
edge is added and the `description` copy goes stale in silence — and
`description` is the copy the **viewer renders**, as the nav rail's hover
tooltip. The guarded copy is the one nobody sees; the unguarded copy is the one
a reader is shown.

This is the repo's standing "a hand-restated count with nothing pairing it to
its source" shape, on a surface the guard predates. Same question applies to
`Study.description` and `StackDefinition.description`: none of them is read by
any doc-scan guard, and any prose field is a candidate home for a restated
count.

## Suggested fix

1. Add `"description"` to the key tuple above (one word), and extend
   `test_the_structural_count_pairing_can_fail` so the **scope** is replayed,
   not just the parser: assert a wrong count planted in `description`
   is caught, the way the section-scoping guards in this repo replay their own
   boundary. Without that, the tuple can silently lose a key again.
2. Decide whether the same scan should reach `Study.description` and
   `StackDefinition.description`, or whether the SOP's "Titling an artifact"
   should simply say a `description` never carries a derivable count.

Found in `review/stack_title_style_pass`, 2026-09-14. Not fixed inline: the fix
wants a new assertion to be trustworthy, which puts it past the reviewer's
inline-fix boundary.
