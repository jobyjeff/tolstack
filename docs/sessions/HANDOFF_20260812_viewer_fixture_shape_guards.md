---
priority: med
depends_on: []
---

# HANDOFF 2026-08-12 — viewer_fixture_shape_guards: the fixture lags the live projection in six places, and only `crops.json` is guarded

Source: `docs/issues/ISSUE_20260811_viewer_fixtures_lag_the_live_projection_shape.md`,
filed by `viewer_source_ref_export_label` (2026-08-11). Baseline: trunk with
`viewer_source_ref_export_label` and `viewer_projection_provenance` merged.
Scope: `apps/viewer/fixtures.js`, `apps/viewer/tests.js`. Do **NOT** edit
`apps/viewer/views/stack.js` — that is `viewer_export_and_material_provenance`'s
file, and it is staged to run **after** this one.

## Why this is the root-cause handoff and not the cleanup one

The bug `viewer_source_ref_export_label` just fixed had **this** as its root
cause: the fixture was hand-authored from an older data shape, so the JS suite
stayed green while pinning behaviour the builder had stopped emitting. That fix
added a `[real]` key-set test for the two `crops.json` entry shapes and its
`summary`. The same audit over `results.json` found the rest, and they are not
guarded.

Every diff below is *fixture-omits-what-real-data-has*; nothing in the fixtures
carries a field the projection has dropped.

| shape | in `results.json`, absent from the fixture |
|---|---|
| `stack.stack.elements[].source_ref` | `export`, `cell`, `element_id`, `run_id` |
| `materials[].material` | `library_ref`, `values_status`, `class`, `designation_source`, `applied_over_c`, `cindas_request`, `used_by` |
| `stacks[].stack` (embedded raw stack) | `schema`, `id`, `title`, `units`, `paths`, `checks`, `provenance` |
| `hardware_entries` | `schema`, `description`, `provenance` |
| top-level `results` | `built_by`, `stacks_dir` (superseded by `provenance.*`, which the fixture does carry) |

Two rows from the issue's table are **already fine** and need no work —
`stacks[]` and `stacks[].elements[]` in the demo fixture are covered by
`generatedFixture()`. Don't "fix" them.

## The bound on what a key-set test can do — read this before choosing

The bug that started all of this was a stale **value**
(`resolved_by: "provenance.sources_used"`) in a field that was present and
correctly named. **A key-set diff would not have caught it.** So key-set tests
alone would leave the actual failure mode uncovered.

The value-level guard is a separate assertion. For crops it is
`VA.unlabelledCropRules(realCrops)` over `summary.by_resolved_by` — i.e. the
viewer's own label table checked against the values the live data actually
contains.

## Deliverables

1. **Key-set tests per shape, in the `[real]` tier** — the pattern already
   established for crops. Extend to `source_ref`, `materials[].material`, the
   check object and `hardware_entries`. Failure message must name the fixture as
   the thing to update; that is what makes this tier cheap to act on.
2. **Value-level guards per enumerated field**, in the shape of
   `unlabelledCropRules`: for each field the viewer switches on — `resolved_by`,
   `confidence`, `kind`, `located_by`, `values_status`, `worksheet_source`,
   `status` — assert the live data contains **no value the viewer has no branch
   for**. This is the one that catches the bug that actually happened, and it is
   the deliverable to protect if you run short.
3. **Add `source_ref.export` and the `materials[].material` provenance fields to
   the fixture**, so the next handoff can pin rendering behaviour at the fixture
   tier. Keep them synthetic and keep the miniature's character (see the fence
   below) — include at least one `export.status: "unestablished"` **with a
   `why`**, because that is the state `viewer_export_and_material_provenance`
   most needs to render and the live data's unresolvable citations are exactly
   where it matters.
4. **Do not generate the fixture from real data.** This was considered and
   rejected, and the reasoning is binding: the fixture is deliberately *not* a
   copy of a real stack — it is a miniature that exercises every provenance state
   in one place (untraced band, INCOMPLETE check, stale index, missing entry),
   and real data does not contain that combination. Generating it would lose the
   states the fixture exists for, and it would put a real drawing's numbers into
   a file whose header says nothing in it is a claim about a Joby part.

## Definition of done

- Every shape in the table above is covered by a `[real]`-tier key-set test that
  fails loudly, naming the fixture, when the builder adds a field.
- The deliverable-2 value-level guards pass against the live
  `C:\workspace\tolstack\data\projections\viewer\results.json` and
  `crops.json` (main-checkout absolute paths — `data/` is gitignored and absent
  from your worktree), and demonstrably **fail** when fed a value with no viewer
  branch. Show that failure, don't assert it.
- The fixture carries `source_ref.export` including an `unestablished` case.
- Full JS suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_viewer_fixture_shape_guards.md`):
  state plainly which of the two tiers would have caught the original
  `resolved_by` bug and which would not — the next agent will otherwise assume a
  key-set test is sufficient, which is the mistake this whole thread is made of.
