---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
---

# The annotator's draw cap now cuts a real part short, and three texts say no part reaches it

## What was found

`AA.OCCURRENCE_DRAW_LIMIT = 64` (`apps/annotate/sweep.js`) was set above the
largest real occurrence count, which was the `NAS1149V0332H` washer at 29 when
handoff `parts_sit_where_the_assembly_puts_them` measured it. The cap's own
argument: it exists for "a rivet pattern of hundreds", and **no installed part
reaches it**.

rotorkit installed 13 more meshes into `data/meshes/` at 2026-10-14 20:21,
during that handoff's session. That moved the store from 34 meshes to 47. One of
the new ones is `CCR244CS-3-02` (`674069da…`), which has **66** occurrences
with a `placement_world`. So today a real part is drawn at 64 of its 66
positions, and its panel row says so. The behaviour is what the design asked
for. Its premise no longer holds.

Re-derive it with one walk over `data/meshes/*/provenance.json`, counting
`extraction.instances[]` with a 12-value `placement_world` per mesh. The top
three counts are 66 (`CCR244CS-3-02`), 29 (`NAS1149V0332H`) and 16
(`MS21299C3K`).

## Where it is now false

- `docs/ANNOTATION_SURFACE.md`, "Where a part is drawn": "No installed part
  reaches it: the most-repeated is the NAS1149V0332H washer, and it is drawn in
  full."
- `apps/annotate/sweep.js`, the `AA.OCCURRENCE_DRAW_LIMIT` comment: "the
  most-repeated part in the installed store is the NAS1149V0332H washer at 29".
- `docs/sessions/lessons/LESSONS_20261014_parts_sit_where_the_assembly_puts_them.md`.
  This one has a correction blockquote from the review. The other two do not,
  because they are live documents.
- `apps/annotate/run_tests.cjs`, "the placement rule…": it pins
  `OCCURRENCE_DRAW_LIMIT >= 29` as a literal. This is a count of live data that
  had already gone stale when it merged, and nothing reads the store to keep it
  true.

## What to decide, then fix

1. **Is 66 pathological?** 66 × 1,228 triangles is about 81 k, which costs less
   than a tenth of the hub. The cap's own cost argument says draw it in full.
   Either raise the cap or re-argue it. That is a design call, so it was not
   made inline.
2. Whatever the cap becomes, replace the prose counts with something a test
   derives. Options: a `[real]` check in `run_tests.cjs` that walks the store and
   asserts the cap's stated relation to the largest real count, or drop the
   count from the prose. A literal 29 in a guard is a count that live data can
   change (the canonical review checklist's wall-clock/live-count entry).
