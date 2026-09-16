---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# `worksheet_source`'s vocabulary is spelled inline at its branch, with no `VA.WORKSHEET_SOURCES` to read

Deferred out of `viewer_value_guard_rows_and_replays` (2026-09-15), which
enrolled `topologies[].worksheet_source` as a `TOPO_VALUE_GUARDS` row beside
the existing stack-side `stacks[].worksheet_source` row.

`ISSUE_20260915_four_branched_topology_fields_have_no_value_guard_row.md`'s
fix shape asked for the constant as part of that work:

> `known` reads a named constant. There is no `VA.WORKSHEET_SOURCES` — the
> stack-side row spells the vocabulary inline, `inList(["declared", "by_name",
> null])`. That is the inline-literal shape `CLAUDE.md` names as this repo's
> most-repeated defect […] So adding the constant is part of the fix.

**It was not done, and deliberately.** The constant belongs beside the branch
that reads it — `apps/viewer/views/worksheet.js`'s
`if (stackProj.worksheet_source === "declared")`, with the table itself in
`viewer.js` or `topology.js` where `VA.CONFIDENCES` / `VA.VALUE_SOURCES` live.
The handoff's scope was `apps/viewer/tests.js`, `apps/viewer/README.md`'s
hover-card section, `apps/viewer/views/topology.js`'s `renderNodeDetail`
comment and `tests/test_topology.py`, and named
`apps/viewer/topology.js` as do-not-touch. So the vocabulary is currently a
single shared `WORKSHEET_SOURCES` **inside `tests.js`**, read by both guard
rows — one copy instead of two, but still not co-located with the branch, and
still invisible to the branch's own reader.

## Fix shape

1. `VA.WORKSHEET_SOURCES` beside the other viewer vocabularies, carrying
   `declared` / `by_name` / `null` and what each one means on screen. Both
   builders write the same three (`worksheet_for` in
   `scripts/build_viewer_projection.py` and in
   `scripts/build_topology_projection.py` — the same two rules, deliberately
   not shared because each builder is stdlib-only).
2. `views/worksheet.js` branches off it rather than off a bare string literal.
3. Both `tests.js` rows read `VA.WORKSHEET_SOURCES`; delete the local
   `WORKSHEET_SOURCES` and the comment pointing at this issue.

## Worth deciding with it

`test_no_persisted_field_vocabulary_is_an_inline_literal` reads the
`tolerance_stack/` package only, which is why this one went uncaught in the
viewer for as long as it has. Whether that scanner should reach `apps/viewer/`
is a bigger question than this issue and is why this carries no
`audience: strategy` — the three steps above stand on their own.
