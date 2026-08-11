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

The fastener library **now exists** — `spec_library_v0` (2026-08-05) built the
event-sourced spec library at `docs/spec_library/`, and `NAS6403U11D` is the first
entry here to defer to it (`values_status: "library"`,
`library_ref: "spec_library:NAS6403U11D"`). It holds only a handful of documents,
so it is still the binding constraint on nearly every value here. The seam worked
as designed: `hardware_entries.json` is shaped so a `library_ref` can supersede an
entry's inline numbers without touching any stack, and that promotion changed no
stack file.

**To build a new stack, follow `docs/SOP_TOLERANCE_STACK.md`.** The first three
stacks here are its worked examples, and every caveat the SOP states was learned
from them.

`stack_pitch_link_to_pitch_plate.json` (2026-08-04) is the fourth, and the first
to be *produced by* the SOP rather than distilled into it — built from scratch
with no workbook, sourcing four of six element values to a NAS standard and a
part drawing. Its worksheet carries the friction report's evidence and
`docs/sessions/lessons/LESSONS_20260804_pitch_link_stack.md` carries the proposed
SOP edits.

## Two archetypes, not one kind of stack

The first five stacks here are all the **same archetype** — a linear grip-length
stack, whose procedure *is* the SOP. `hub_bearing_thermal_fit_*` (2026-08-05) is
the **second**: a two-stage diametral thermal shrink fit, evaluated over a corner
grid of fit condition × temperature. It needed things the first did not — real
term coefficients, material properties, generated rather than hand-authored
checks — and `ARCHETYPE_thermal_fit.md` names all of them, because that list is
the design input for an archetype registry.

There is deliberately **no registry**. A registry wants three archetypes.

## Contents

| File | What it is |
|---|---|
| `stack_tan_link_to_pitch_plate.json` | Tangential link ↔ pitch plate, 217755 sheet 4 DETAIL B. The fullest of the three. |
| `stack_tan_link_to_pitch_plate_take2.json` | Jeff's second pass at the same joint — a restatement, same total. |
| `stack_vpa_output_to_pitch_plate.json` | VPA output ↔ pitch plate, 217755 sheet 5 DETAIL X (zone C10). |
| `stack_pitch_link_to_pitch_plate.json` | **Pitch link ↔ pitch plate**, 217755 sheet 4 DETAIL B — the 5-place joint beside the tangential one. The first stack built **from scratch** (no source workbook) and the first to cite `data/inbox/specs/`. |
| `stack_hub_bearing_thermal_fit_m2.json` | **Main spindle bearing seats, M2/TC intent** — the current design. `thermal_fit` archetype: two chained shrink fits per seat, two seats, three temperatures. 8 of 8 elements traced to released part drawings. |
| `stack_hub_bearing_thermal_fit_m1.json` | The same joint **as built** — the configuration that slipped. Kept as the control: a fix is only validated against the thing it fixed. |
| `materials.json` | **Material CTEs with provenance** — the repo's first. `material_entry/v0`. Designations traced to drawing notes; **not one CTE value traced to anything**, each with its CINDAS request written out. |
| `hardware_entries.json` | Fastener-library seed: every standard part the stacks consume, each with inline values and a `library_ref` filled exactly where the spec library holds the part (`test_only_the_one_entry_was_promoted` owns how many that is). Now also the two NSK bearings under source-control drawings. |
| `ARCHETYPE_thermal_fit.md` | What the thermal-fit archetype is, its inputs, its arithmetic, its caveats, and what it needed that the linear stack did not. |
| `WORKSHEET_tan_link_to_pitch_plate.md` | Elements, results, re-derivation vs Jeff's cells, discrepancies, source gaps. |
| `WORKSHEET_vpa_output_to_pitch_plate.md` | Same, for the VPA joint. |
| `WORKSHEET_pitch_link_to_pitch_plate.md` | Same shape minus the re-derivation section (nothing to re-derive), plus the joint-identification argument and a **Refused** table of values not filled from memory. |
| `WORKSHEET_hub_bearing_thermal_fit.md` | Both thermal-fit stacks in one worksheet. Carries the finding that the source's coherent-corner method understates the loosest stage-1 fit by 0.05 mm, and an appendix listing **every generated term, sign and weight** — the reviewability the generated checks cost. |

Source workbooks: `data/inbox/tolerance_stacks/` (gitignored contents, see its
`PROVENANCE.md`) — `260729_sample_tol_stack.xlsx` for the linear stacks,
`260209_Hub Bearing Fits.xlsx` for the thermal ones. Part drawings:
`data/inbox/drawings/`, same convention.

The full slice-1 lesson — findings F1–F16, the source-gap ranking, and the
xlsx-reading gotchas — is imported verbatim at
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md`.

## The five shapes

**stack definition** (`joby.tolerance_stack/stack_definition/v0`) — an ordered
`elements` list, a set of named `paths` through the joint, and `checks` defined
over them. Elements carry `nominal`/`min`/`max` **lengths** alongside the
`lmc`/`mmc` values as transcribed, because LMC/MMC are material conditions, not
extremes: for a subtracted feature (a chamfer) LMC is the *larger* size. Paths
and checks are both signed term lists, so one `fold()` does all the arithmetic.
A term also carries an optional positive `coefficient` (default `1.0`), added
2026-08-05 so a diametral term, a thermal soak factor and a stiffness split could
ride on that same one fold — direction stays in `sign`, magnitude in
`coefficient`. A `thermal_fit` block is an additive extension the thermal
archetype reads; `load_stack()` ignores it, `load_thermal_fit_stack()` uses it to
**generate** the checks (so the file's own `checks` array must be empty).

**material entry** (`joby.tolerance_stack/material_entry/v0`, new 2026-08-05) —
one material + condition and the CTE a stack may cite for it, in
`materials.json`. Same discipline as `hardware_entry`: `values_status: inline`,
`library_ref: null`, a mandatory `values_source`, a non-empty `gaps`. Here the
null ref really is unconditional — **there is no materials library**, and
`test_material_entries_keep_library_ref_null_and_schema_v0` asserts it. That is
the one thing this shape does *not* share with `hardware_entry`, whose ref has
been filled on one entry since the spec library was built. Its one
addition is **`designation_source` separate from `values_source`**, because a
material's *name* and its *numbers* have different provenance — every designation
here but one is traced to a drawing note, and no CTE value is traced at all.
**CINDAS is the source of record** (Jeff, 2026-08-05); Google-sourced and recalled
CTE values are prohibited on the same footing as recalled fastener dimensions.

**source_ref** — `document` / `revision` / `sheet` / `zone` / `view` / `callout`
is what a human needs to re-find a value, plus a `confidence` of
`traced` | `inferred` | `untraced`. `element_id` and `run_id` are the slot for
feature identity: when extraction addresses a dimension stably, an element cites
the extracted element instead of a human reading and a re-exported drawing
re-runs the stack with no re-transcription. Slice 1 leaves both `None`
everywhere — the door is open, nothing walks through it.

**hardware entry** (`joby.tolerance_stack/hardware_entry/v0`) — a standard part
whose `library_ref` is filled **if and only if** its `values_status` is `library`;
a null ref means `inline` or `not_transcribed`. That pairing, not nullness, is
what the test enforces, and it has been the invariant since 2026-08-05, when the
spec library was built and `NAS6403U11D` was promoted: `library_ref` points at the
subject, `values_status` reads `library`, and the inline numbers become a
cross-check rather than the source — asserted value by value against the library,
which is what stops "cross-check" being a word. Each entry also
carries `assembly_status` (present/absent in the 217755 parts list, find number,
balloons) and a `gaps` list. Since 2026-08-05 it carries **`values_source`** too
— a `source_ref`-shaped dict saying where the inline numbers came from, required
whenever they are inline and explicitly `null` when nothing is transcribed.
**Eight of the eleven inline entries say `kind: "workbook"`**, which is the point:
those numbers are slice-1 transcriptions and a from-scratch stack may not reuse
them through the entry any more than out of the xlsx (SOP Step 5b). The other
three are safe — one traced to the NAS6403 standard, two to their own
source-control drawings, where the drawing *is* the controlling document for a
vendor part. Do not quote those counts from here: a test asserts them against the
file (`test_hardware_entry_values_source_counts_match_the_description`) because
this very sentence had already gone stale once.

**check result** (`joby.tolerance_stack/check_result/v0`) — produced, not
stored: `worst_case_min/max`, `rss_min/max`, and a verdict of
`pass` | `marginal` | `fail`. `marginal` is the honest answer when nominal
satisfies the criterion and worst case does not — no single build is
guaranteed, so the joint needs assembly-time selection rather than a clean
analytical answer.

## Regenerating

```powershell
venv-win\Scripts\python.exe -m pytest -q

# the linear stacks
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --compare

# the thermal-fit stacks
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --compare --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --workbook --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms --markdown
```

These print the worksheet tables; paste them back if an element value changes.
`tests/debug_dump_tol_stack_xlsx.py` re-reads either source workbook (stdlib only
— no openpyxl dependency was added).

`--terms` has no counterpart on the linear side and is not optional for review:
the thermal archetype **generates** its checks, so its term lists exist nowhere in
the JSON. That output is the only place a reviewer can read every sign and weight
one at a time, and the worksheet's appendix is a paste of it.
