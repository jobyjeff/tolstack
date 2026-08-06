# PROVENANCE — what was imported at tolstack's founding

tolstack was stamped from forge's `template/` on 2026-08-03 (root commit
`e7bd996`, `forge new-repo`). Its tolerance-stack material was **not** written
here: it was imported from **drawing-checker**'s `tolerance_stack_slice1` slice
(handoff 2026-07-29, worked 2026-07-30) by handoff `tolstack_founding`.

| | |
|---|---|
| Source repo | `C:\workspace\drawing-checker` |
| Source repo `master` at time of copy | **`0743640dc5d41fe25d7084694572b29265fe632b`** (`0743640`, 2026-08-04) |
| Commits that created the material there | `2bb9648` (shapes, fold module, 34 tests, 4 debug tools, inbox copy) and `720df27` (README + both worksheets) |
| Imported by | handoff `tolstack_founding`, 2026-08-03 |

## The rule

Everything below except the specs pile was **copied**: the originals stay in
drawing-checker, untouched. That is the append-only spirit — an import is
one-way and additive, and no drawing-checker file was edited or deleted to make
this repo exist. Only `data/inbox/specs/` was **moved**, because nothing in
drawing-checker had ever consumed it.

Where a copied file was amended here, the amendment is listed in the Amended
column. At founding every amendment was limited to an "imported"/"where this
lives" note. Three files have since changed substantively, because the repo's own
SOP requires it — `hardware_entries.json` (Step 4), `tests/test_tolerance_stack.py`
(Step 7) and `docs/tolerance_stacks/README.md` grow with every new stack. **A
"byte-identical" row is a claim about the import, not a freeze**; when one of
these files changes, amend its row in the same commit. The rows below say when
each stopped being byte-identical and why.

## Copied — `docs/tolerance_stacks/`

Design artifacts, committed (not run data).

| source (drawing-checker) | destination (tolstack) | amended |
|---|---|---|
| `docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json` | same path | no — byte-identical |
| `docs/tolerance_stacks/stack_tan_link_to_pitch_plate_take2.json` | same path | no — byte-identical |
| `docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json` | same path | no — byte-identical |
| `docs/tolerance_stacks/hardware_entries.json` | same path | **yes, since 2026-08-04** (`pitch_link_stack`) — was byte-identical at import. Added the `NAS6403U11D` entry (the first whose inline values are traced to a standard rather than to the 260729 workbook, carrying a proposed additive `values_source` field), extended four entries' `gaps`, and added `used_by` back-references. SOP Step 4 requires a hardware entry per standard part, so this file changes with every new stack. **Amended again 2026-08-05** (`sop_edits_apply`): `values_source` backfilled to all 13 entries — eight `kind: "workbook"` / `untraced`, four explicit `null` for the not-transcribed entries — the `sheets` key on `NAS6403U11D` renamed to `sheet` to match `SourceRef`, and the file `description` corrected (it still claimed no entry came from a standard document) |
| `docs/tolerance_stacks/WORKSHEET_tan_link_to_pitch_plate.md` | same path | no — byte-identical |
| `docs/tolerance_stacks/WORKSHEET_vpa_output_to_pitch_plate.md` | same path | no — byte-identical |
| `docs/tolerance_stacks/README.md` | same path | **yes** — its "Where this lives is NOT decided" section is now answered (it lives here); added pointers to the SOP and to `docs/reference/`, and corrected "three shapes" to four |

## Copied — the `tolerance_stack/` package

| source | destination | amended |
|---|---|---|
| `tolerance_stack/__init__.py` | same path | no — byte-identical |
| `tolerance_stack/stack.py` | same path | **yes, since 2026-08-04** (`pitch_link_stack`) — was byte-identical at import. **Comment only:** `SourceRef.kind`'s inline list gained `spec`, which the SOP already mandates for a `data/inbox/specs/` file and which the imported comment omitted. No executable line changed; `fold()` is untouched and still reads `min`/`max` only. **Amended again 2026-08-05** (`sop_edits_apply`), also **comment only**: `StackElement.role`'s inline list gained `nut_geometry`, which the seeded take-2 has used three times since the import and which the SOP already documented. **Amended again 2026-08-05** (`hub_bearing_thermal_stack`) — and this one **does change executable lines**, the first time since the import: `Term` gained a positive `coefficient` (default `1.0`) plus a `weight` property, and `fold()`, `terms()` and `_expand()` use it. Behaviour-preserving by construction (default weight is the old `±1`) and verified so: the three seeded stacks re-derive against the 260729 workbook with a largest delta of **6.439e-15**, the same as before. `fold()` is still the only place element values are combined and still never reads `lmc`/`mmc` — a test now asserts the latter by reading the function's own source. Rationale in ARCHITECTURE.md, "Where computation may live — and the coefficient" |
| — (new) | `tolerance_stack/thermal.py` | **not imported** — written 2026-08-05 by `hub_bearing_thermal_stack`. The thermal-fit archetype layer. Nothing in drawing-checker corresponds to it |

Stdlib only. `SCHEMA_*` constants keep the `joby.tolerance_stack/...` namespace
they were minted with — the schema id is not repo-scoped, so moving repos does
not rev it.

## Copied — tests and the four debug tools

| source | destination | amended |
|---|---|---|
| `tests/test_tolerance_stack.py` | same path | **yes, since 2026-08-04** (`pitch_link_stack`) — was byte-identical at import (**34 tests, all green** under this repo's `venv-win`). Added the pitch-link stack's value and provenance tests, hoisted the stack-file list into `ALL_STACK_FILES`, and admitted `spec` to the `source_ref.kind` whitelist. **50 tests** as of that commit (51 after the review added one). SOP Step 7 requires new tests per stack, so this file changes with every new stack. **Amended again 2026-08-05** (`sop_edits_apply`): three tests for the `values_source` requirement and for Step 5b's transitive workbook ban, plus a parametrized `role`-vocabulary test. **58 tests** at the end of that handoff |
| `tests/__init__.py` | same path | no — empty, both |
| `tests/debug_dump_tol_stack_xlsx.py` | same path | **yes** — import note; dropped a "drawing-checker's venv-win" aside; folded in the shared-formula gotcha |
| `tests/debug_report_tolerance_stacks.py` | same path | **yes** — import note |
| `tests/debug_stack_hardware_crosscheck.py` | same path | **yes** — import note: the `data/runs/` it reads is drawing-checker's, plus the `item_no` / `find_no` key mismatch |
| `tests/debug_trace_stack_values.py` | same path | **yes** — import note: needs PyMuPDF (deliberately absent from `requirements.txt`) and a drawing-checker PDF |

The test file needed **no** path edits: it resolves `docs/tolerance_stacks/` as
`Path(__file__).parent.parent / "docs" / "tolerance_stacks"`, and this repo
reproduces that layout exactly.

Two of the four tools are cross-repo by nature (`debug_stack_hardware_crosscheck`
wants a drawing-checker run dir; `debug_trace_stack_values` wants a drawing PDF
and `fitz`). They were imported anyway because they are how a `source_ref` gets
its `traced` confidence — see the SOP's tracing step.

## Copied — the source workbook

| | |
|---|---|
| source | `C:\workspace\drawing-checker\data\inbox\tolerance_stacks\260729_sample_tol_stack.xlsx` |
| destination | `data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx` |
| sha256 | `51b6c5362848758aaeebd8281f96e1ba4786abbeb40642b94e7f98bffecd6fd1` — **verified identical after the copy** |
| size | 113,156 bytes |
| ultimate origin | forge atomic-note attachment `20260729T173648_qjk2xk` (immutable) |

Contents gitignored, `PROVENANCE.md` committed — the same rule the original
carried. `data/inbox/tolerance_stacks/PROVENANCE.md` was copied and extended with
this second hop.

## Copied — the slice-1 lesson

| source | destination |
|---|---|
| `docs/sessions/lessons/LESSONS_20260729_tolerance_stack_slice1.md` | `docs/reference/LESSONS_20260729_tolerance_stack_slice1.md` |

Verbatim apart from a prepended header marking it imported reference, stating
that its paths are drawing-checker-relative, and naming the one part of it this
repo supersedes (its "leave the stacks where they are through phase 2"
recommendation). It is the primary source behind the SOP and the review checklist.

## MOVED — the spec/datasheet pile

The only thing that did not stay in drawing-checker, and the founding handoff's
one sanctioned change outside this repo.

| | |
|---|---|
| source | `C:\workspace\drawing-checker\data\inbox\specs\` |
| destination | `C:\workspace\tolstack\data\inbox\specs\` |
| moved | 2026-08-03 |
| verified | **42 files, 111,575,456 bytes** on both sides of the move (the count includes hidden `desktop.ini`, which a `Get-ChildItem` without `-Force` misses) |
| breadcrumb | `MOVED_TO_TOLSTACK.txt`, one line, left in the old location |

Moved rather than copied because nothing in drawing-checker had ever read it, and
because it is the *trace target* for stack elements — it belongs with the stacks
that cite it. **Append-only from now on**; see `data/inbox/specs/README.md`.

Those two numbers pin the **move**, not the current contents. The pile has since
grown — **64 files / 249,106,379 bytes**, re-counted 2026-08-05 by
`hub_bearing_thermal_stack` — which is append-only working as intended, not a
falsified row. Count it before quoting it.

**Correction, 2026-08-05** (`hub_bearing_thermal_stack`): the previous wording of
this paragraph said the pile included "`MS9363 Rev C.pdf` and five hub-bearing
drawings". `MS9363 Rev C.pdf` is there; the **five hub-bearing drawings are
not** — Jeff dropped those into drawing-checker's
`data\inbox\drawings\`, and they were copied into this repo's *own* new
`data/inbox/drawings/` stream, not into `specs/`. An `ls` of `specs/` returns no
`212966` / `214955` / `214959` / `214588` / `214589`. The byte count in the same
sentence was also 488 bytes stale. Both halves were written one day before the
drawings existed here, which is the recurring-bug class the review checklist
names: **an inventory number or contents claim written from expectation rather
than from a count.** Recount, don't read.

Note for anyone auditing drawing-checker's data tree: that folder was
**untracked**, not gitignored. The founding handoff described both sides as
gitignored; the destination is, but drawing-checker's `.gitignore` uses per-stream
patterns and never covered `specs/`. No drawing-checker commit was involved
either way.

## Not imported

Deliberately left behind, because they are drawing-checker's own and this repo
has no use for them: `parser/`, `pipeline/`, `webui/`, `scoring/`, that repo's
`conftest.py` (it exists to redirect the pipeline's data root — there is no
pipeline here), its `requirements.txt` (PyMuPDF, pdfplumber, pandas, FastAPI —
none needed), and the other ~35 `tests/debug_*.py` tools, which are parser and
web-UI diagnostics unrelated to stacks.
