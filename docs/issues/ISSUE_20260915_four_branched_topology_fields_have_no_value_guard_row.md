---
type: bug
priority: med
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md
---

# The topology page branches on four projection fields `TOPO_VALUE_GUARDS` does not list

Filed from the audit `HANDOFF_20260914_projection_field_guard_rows` asked for:
*"whether any other field added in the last month is missing from
`TOPO_VALUE_GUARDS` — the enumeration is the thing that keeps going stale."*
It is stale. The handoff enrolled `parts[].mesh.installed` (row 9); the method
that found it finds four more, and the strongest one is recent.

## Method (so this is reproducible rather than a reading)

1. Walk every field path of `data/projections/viewer/topologies.json` and keep
   the paths whose live value set is small and non-numeric — the shape of an
   enumeration.
2. `git log --since` on `scripts/build_topology_projection.py` for fields added
   in the last month.
3. For each candidate, grep `apps/viewer/views/topology.js` /
   `topology_app.js` / `views/worksheet.js` for a branch on it.
4. Compare against the nine `TOPO_VALUE_GUARDS` rows.

## The findings, strongest first

### 1. `topologies[].worksheet_source` — recent, branched, silent default arm

Added **2026-09-08** by `topology_schema_v1`. Live values `{null, "declared"}`.
The topology page renders it: `topology_app.js:1051` calls the shared
`VA.renderWorksheet` with `topoProj`, and `views/worksheet.js:29` is

```js
    if (stackProj.worksheet_source === "declared") {
```

— a note explaining that one worksheet may cover several documents. Anything
else prints **nothing**, which is right for `null` and silent for a new word or
a typo: exactly the `mesh.installed` shape the handoff just fixed.

And the repo already guards this vocabulary — `stacks[].worksheet_source` is a
row in the *stack-side* `VALUE_GUARDS` table. But that table runs against
`realResults` only (`apps/viewer/tests.js`, `[real] no live value is one the
viewer has no branch for`), so the topology projection's own copy of the same
field is unguarded. This is `docs/prompts/REVIEW_AGENT.md`'s "when a second file
joins a class the repo already guards" almost verbatim, one projection over.

### 2. `edges[].zero_width` — branched three times, no row

`views/topology.js:945` (row class), `:1037` (grid chip), `:1302` (detail
chip). Live values `{false, true}`, so a row would not be vacuous. Falsy is the
silent arm, same as `mesh.installed`: an absent field withholds the zero-width
chip with nothing said, and a zero-width band is a claim about a *lower bound*
on the real spread — the one chip a reader most needs not to lose quietly.

### 3. `nodes[].branch` and `layout.rows[].branch` — branched three times, no row

`views/topology.js:769` and `:776` (the dot's class and its larger radius),
`:1236` (the BRANCH POINT chip, whose title explains `BranchAmbiguity`). Live
values `{false, true}`. Same silent-falsy arm.

Both 2 and 3 predate the audit window (`5679129`, 2026-09-01), so they are not
drift from the last month — they are the class having been incomplete from the
day it was written. They are listed here because the argument that put
`mesh.installed` in row 9 applies to them unchanged, and because the next
person to ask "is this field covered?" is told to read the rows.

### 4. `studies[].checks[]`'s `verdict` / `verdict_scope` / `worst_confidence` — latent, not yet a defect

`project_study()` started emitting a study's authored `checks` on **2026-09-09**
(`391dc7c`), and those rows carry three vocabularies the repo guards
stack-side (`VA.verdictClass`, `VA.VERDICT_SCOPES` — whose own silent-fallback
miss is the 2026-08-13 precedent the mesh issue cites — and `VA.CONFIDENCES`).
Measured: the topology page renders **none** of them; `views/topology.js:1127`
says so and grep finds no reader. So there is no branch to guard today, and a
row now would guard an unrendered field.

Worth writing down anyway, because the moment that strip prints a verdict three
unguarded enumerations arrive with it, and the person adding the strip will not
be reading this table.

### Correctly absent, and why — `studies[].error.type`

`VA.STUDY_ERRORS` is a real branch table with a **loud** fallback
(`VA.unlabelledStudyErrorText`), unlike the silent default arms above. No live
study carries an error, so a `TOPO_VALUE_GUARDS` row would trip the
empty-collector arm on every run, permanently. It is instead paired to Python
by `tests/test_topology_projection.py` (`VA.STUDY_ERRORS` vs. the exception
set). Not a gap; recorded so the next audit does not re-derive it.

Also checked and not applicable: `parts[].mesh.part_id`, `crop_key.*`,
`joint.*`, `transform.id`, `configuration.*`, `closes` — ids and free text, not
vocabularies. `description` (2026-09-14) is prose; it is the count-guard case,
handled by the same handoff in `tests/test_topology.py`.

## Fix shape

Three rows in the same shape as row 9, each reading the field **raw** rather
than through the page's own reader:

- `worksheet_source`: `known` reads a named constant. There is no
  `VA.WORKSHEET_SOURCES` — the stack-side row spells the vocabulary inline,
  `inList(["declared", "by_name", null])`. That is the inline-literal shape
  `CLAUDE.md` names as this repo's most-repeated defect, and it is uncaught
  here because the scanner that enforces it
  (`test_no_persisted_field_vocabulary_is_an_inline_literal`) reads the
  `tolerance_stack/` package only. So adding the constant is part of the fix,
  and the stack-side row should read it too rather than two rows keeping two
  copies of one list.
- `zero_width`, `branch`: `known: function (v) { return v === true || v === false; }`.

All three are cheap. The one with a date on it is #1.
