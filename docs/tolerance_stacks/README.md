# docs/tolerance_stacks

Hand-transcribed tolerance stacks, their candidate JSON shapes, and the
worksheets that compare an independent re-derivation against the source.

Seeded by handoff `tolerance_stack_slice1` (2026-07-29) from Jeff's own
grip-length workbook — the SOP/brute-force rung of the ladder: **one hand-built
stack first, to fix the data shapes, before any pipeline code**
(`dispatch/docs/strategy/drafts/DRAFT_tolerance_stack_mvp.md`).

## Where this lives IS now decided — it is here

Slice 1 wrote these files inside drawing-checker and explicitly left the question
open: forge stream + projection, a drawing-checker sibling, or a new repo on the
template. Strategy answered it on 2026-08-03 by founding **tolstack**, and this
directory is a copy imported at that founding (`PROVENANCE.md` in the repo root
records the source paths and drawing-checker's sha at the time). The originals
stay in drawing-checker, untouched — the import was one-way and additive.

The fastener library is still a separate open question, and still the binding
constraint on nearly every value here. `hardware_entries.json` is deliberately
shaped so a `library_ref` can supersede its inline numbers without touching any
stack.

**To build a new stack, follow `docs/SOP_TOLERANCE_STACK.md`.** These three
stacks are its worked examples, and every caveat the SOP states was learned from
them.

## Contents

| File | What it is |
|---|---|
| `stack_tan_link_to_pitch_plate.json` | Tangential link ↔ pitch plate, 217755 sheet 4 DETAIL B. The fullest of the three. |
| `stack_tan_link_to_pitch_plate_take2.json` | Jeff's second pass at the same joint — a restatement, same total. |
| `stack_vpa_output_to_pitch_plate.json` | VPA output ↔ pitch plate, 217755 sheet 5 DETAIL X (zone C10). |
| `hardware_entries.json` | Fastener-library seed: every standard part the stacks consume, with inline values and an empty `library_ref` slot. |
| `WORKSHEET_tan_link_to_pitch_plate.md` | Elements, results, re-derivation vs Jeff's cells, discrepancies, source gaps. |
| `WORKSHEET_vpa_output_to_pitch_plate.md` | Same, for the VPA joint. |

Source workbook: `data/inbox/tolerance_stacks/` (gitignored contents, see its
`PROVENANCE.md`).

The full slice-1 lesson — findings F1–F16, the source-gap ranking, and the
xlsx-reading gotchas — is imported verbatim at
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md`.

## The four shapes

**stack definition** (`joby.tolerance_stack/stack_definition/v0`) — an ordered
`elements` list, a set of named `paths` through the joint, and `checks` defined
over them. Elements carry `nominal`/`min`/`max` **lengths** alongside the
`lmc`/`mmc` values as transcribed, because LMC/MMC are material conditions, not
extremes: for a subtracted feature (a chamfer) LMC is the *larger* size. Paths
and checks are both signed term lists, so one `fold()` does all the arithmetic.

**source_ref** — `document` / `revision` / `sheet` / `zone` / `view` / `callout`
is what a human needs to re-find a value, plus a `confidence` of
`traced` | `inferred` | `untraced`. `element_id` and `run_id` are the slot for
feature identity: when extraction addresses a dimension stably, an element cites
the extracted element instead of a human reading and a re-exported drawing
re-runs the stack with no re-transcription. Slice 1 leaves both `None`
everywhere — the door is open, nothing walks through it.

**hardware entry** (`joby.tolerance_stack/hardware_entry/v0`) — a standard part
with `values_status: inline` and `library_ref: null`. When the fastener library
exists, `library_ref` points at it, `values_status` becomes `library`, and the
inline numbers become a cross-check rather than the source. Each entry also
carries `assembly_status` (present/absent in the 217755 parts list, find number,
balloons) and a `gaps` list.

**check result** (`joby.tolerance_stack/check_result/v0`) — produced, not
stored: `worst_case_min/max`, `rss_min/max`, and a verdict of
`pass` | `marginal` | `fail`. `marginal` is the honest answer when nominal
satisfies the criterion and worst case does not — no single build is
guaranteed, so the joint needs assembly-time selection rather than a clean
analytical answer.

## Regenerating

```powershell
venv-win\Scripts\python.exe -m pytest tests\test_tolerance_stack.py -q
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py
```

The second prints the worksheet tables; paste them back if an element value
changes. `tests/debug_dump_tol_stack_xlsx.py` re-reads the source workbook
(stdlib only — no openpyxl dependency was added).
