---
type: chore
priority: medium
status: closed
area: schemas
reporter: agent
closed: 2026-08-05
closed_by: handoff sop_edits_apply
---

# `hardware_entry/v0` has a `values_source` field on 1 of 13 entries

> **CLOSED 2026-08-05** by handoff `sop_edits_apply` (commit `7aa4d9e`). All 13
> entries carry the field: 8 `kind: "workbook"` / `untraced` with the exact
> workbook cells, 1 `spec` / `traced` (`NAS6403U11D`), and 4 explicit `null` for
> the `not_transcribed` entries — the `library_ref` convention, so "nothing to
> cite" reads differently from "not backfilled". Enforced by
> `test_every_inline_hardware_entry_cites_where_its_values_came_from`, with a
> workbook-kind entry pinned by exact content beside the existing spec-kind one,
> and by `test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`,
> which makes Step 5b's transitive ban checkable rather than prose. Recorded in
> SOP Step 4; `hardware_entry` stays `/v0` — the field is additive and no reader
> breaks on it. Suggestion 3's open question is answered that way.

Filed during the `pitch_link_stack` review (2026-08-04). The half-landed state is
in scope for that handoff (which proposed it deliberately); **finishing it is
not**, hence an issue.

## What

`hardware_entry/v0` has no way to say where an entry's inline numbers came from.
Elements carry a mandatory `source_ref`; hardware entries carry nothing, and
`values_status: "inline"` says where the numbers *live*, not where they came
*from*. That was harmless while every entry was a slice-1 transcription of the
same workbook. It stopped being harmless the moment entries of different
provenance sat side by side:

| entry | inline values actually come from | |
|---|---|---|
| `NAS6403U11D` | `NAS6403-NAS6420 Rev 4.pdf` sheets 1–3 | **traced** |
| `214820-002` | the 260729 workbook | untraced |
| `NAS1149V0332` | the 260729 workbook | untraced |
| the other ten | the workbook or the 217755 parts list | untraced / inferred |

`pitch_link_stack` added an additive `values_source` field (a `source_ref`-shaped
dict) to **`NAS6403U11D` only**, with a test pinning it
(`test_the_nas6403_entry_cites_the_standard_its_inline_values_came_from`), and
proposed requiring it whenever `values_status == "inline"`. See proposed edit 7
in `docs/sessions/lessons/LESSONS_20260804_pitch_link_stack.md`.

## Why it matters

This is the mechanism behind the report's sharpest trap: because an entry cannot
state its own provenance, citing `hardware_entries.json` for a band **launders a
workbook value into a from-scratch stack** — the resulting `source_ref` reads
`kind: "parts_list"`, `confidence: "inferred"`, zero workbook references, and
passes every test in the repo. The `pitch_link_stack` author caught it by hand
and refused the value. The next author has nothing but that lesson to catch it
with.

Until the field is universal it is also not enforceable, so the schema is
carrying a field that documents one entry and misleads about twelve: absence of
`values_source` currently means "not backfilled", not "no source".

## Suggested fix

Small and mechanical — the origins are all known:

1. Backfill `values_source` on the other twelve entries. Every one is either the
   260729 workbook (`kind: "workbook"`, `confidence: "untraced"`) or the 217755
   parts list (`kind: "parts_list"`, `confidence: "inferred"`).
2. Promote the existing single-entry test to a parametrized one asserting
   `values_source` is present with a valid `confidence` whenever
   `values_status == "inline"`, alongside the existing `library_ref`-null and
   non-empty-`gaps` assertions.
3. Record the field in the SOP's Step 4 example and in the schema table, and
   decide whether `hardware_entry` stays `/v0` — the field is additive and breaks
   no reader, so it probably does.

Do (1) and (2) together; a required field with a hole in it is worse than either
state.
