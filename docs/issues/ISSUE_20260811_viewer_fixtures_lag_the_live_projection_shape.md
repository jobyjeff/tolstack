---
type: chore
priority: med
status: triaged
area: apps/viewer / fixtures.js + tests.js
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_viewer_fixture_shape_guards.md
---

# `fixtures.js` lags the live projection shape in six places, and only `crops.json` is now guarded against it

Filed by handoff `viewer_source_ref_export_label` (2026-08-11) after fixing
`ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule`, whose **root
cause** was this class: the fixture was hand-authored from an older data shape,
so the JS suite stayed green while pinning behaviour the builder had stopped
emitting. That fix added a `[real]` key-set test for the two `crops.json` entry
shapes and its `summary`. The same audit over `results.json` found the rest, and
they are **not** guarded.

Every diff below is *fixture-omits-what-real-data-has*; nothing in the fixtures
carries a field the projection has dropped. Run of the audit (fixture key set vs
the corresponding live object):

| shape | in `results.json`, absent from the fixture |
|---|---|
| `stack.stack.elements[].source_ref` | `export`, `cell`, `element_id`, `run_id` |
| `materials[].material` | `library_ref`, `values_status`, `class`, `designation_source`, `applied_over_c`, `cindas_request`, `used_by` |
| `stacks[].stack` (the embedded raw stack) | `schema`, `id`, `title`, `units`, `paths`, `checks`, `provenance` |
| `stacks[]` (demo fixture only) | `archetype`, `checks_source`, `checks_generated_not_rendered`, `materials`, `worksheet_source` — all covered by `generatedFixture()`, so this row is fine |
| `stacks[].elements[]` (demo fixture only) | `material` — likewise covered by `generatedFixture()` |
| `hardware_entries` | `schema`, `description`, `provenance` |
| top-level `results` | `built_by`, `stacks_dir` (superseded by `provenance.*`, which the fixture does carry) |

The two that matter: **`source_ref.export`** is in every live citation since
2026-08-06 and in no fixture, so no fixture-tier test can pin how the viewer
renders it — and it renders nothing, which is
`ISSUE_20260811_viewer_shows_nothing_for_source_ref_export`. **`library_ref` /
`values_status`** on a material entry are the provenance of a *number*, same
story.

Also worth knowing, because it bounds what a key-set test can do: the bug that
started this was a stale **value** (`resolved_by: "provenance.sources_used"`) in
a field that was present and correctly named. **A key-set diff would not have
caught it.** The value-level guard is a separate assertion — for crops it is
`VA.unlabelledCropRules(realCrops)` over `summary.by_resolved_by`, i.e. the
viewer's own label table checked against the values the live data actually
contains.

## Options, in the order they were considered

1. **Generate the fixture from real `crops.json`/`results.json`.** Rejected for
   now: the fixture is deliberately *not* a copy of a real stack — it is a
   miniature that exercises every provenance state in one place (untraced band,
   INCOMPLETE check, stale index, missing entry), and real data does not contain
   that combination. Generating it would lose the states the fixture exists for,
   and it would put a real drawing's numbers into a file that says at the top
   that nothing in it is a claim about a Joby part.
2. **Key-set tests per shape, in the `[real]` tier** (what was done for crops).
   Cheap, keeps the fixture hand-authored and small, fails with a message naming
   the fixture as the thing to update. Extend to `source_ref`, `materials[].material`,
   the check object and `hardware_entries`.
3. **A value-level guard per enumerated field**, like `unlabelledCropRules`: for
   each field the viewer switches on (`resolved_by`, `confidence`, `kind`,
   `located_by`, `values_status`, `worksheet_source`, `status`), assert the live
   data contains no value the viewer has no branch for. This is the one that
   catches the bug that actually happened.

Recommend 2 + 3 together; they are complementary and each is a handful of lines.
