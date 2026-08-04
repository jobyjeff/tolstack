# Lessons — tolerance_stack_slice1 (worked 2026-07-30)

> **IMPORTED REFERENCE — verbatim, do not edit.** This is a **drawing-checker**
> lesson, copied into tolstack at its founding (2026-08-03, handoff
> `tolstack_founding`; see the repo-root `PROVENANCE.md` for the source path and
> drawing-checker's sha at the time of the copy). It is here because it is the
> primary source material behind `docs/SOP_TOLERANCE_STACK.md` and
> `docs/prompts/REVIEW_AGENT.md` — findings F1–F16, the ranked source gaps, and
> the xlsx/balloon-reading gotchas.
>
> Read every path in it as **relative to drawing-checker**, not to this repo:
> `tests/debug_*.py` and `docs/tolerance_stacks/` do exist here (imported), but
> `data/runs/`, `pipeline/`, `parser/`, `webui/` and `scoring/` do not.
>
> Its closing section, "Where should stacks and the fastener library live?", is
> the recommendation that **caused this repo to exist**. Strategy accepted the
> split on 2026-08-03: stacks + the spec inbox here, fastener library still open.
> The lesson's "leave `docs/tolerance_stacks/` where it is through phase 2" is
> therefore the superseded part — it moved early because founding the repo was
> cheaper than a second migration later.
>
> If a statement here conflicts with the SOP, the SOP wins and the divergence is
> recorded in `docs/sessions/lessons/LESSONS_20260803_tolstack_founding.md`.

Handoff: `docs/sessions/active/HANDOFF_20260729_tolerance_stack_slice1.md`.
Branch: `handoff/tolerance_stack_slice1`, cut from `master`.

Transcribe Jeff's hand-built grip-length workbook into candidate JSON shapes,
independently re-derive its numbers, trace what can be traced to drawings, and
report the gaps. Code-light by design: the product is validated data shapes and
two worksheets.

## What landed

| commit | |
|---|---|
| `2bb9648` | JSON shapes, `tolerance_stack/` fold module, 34 tests, four `tests/debug_*.py` tools, inbox copy + provenance |
| `720df27` | `docs/tolerance_stacks/` README + two worksheets |

- `data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx` — copied, sha256
  recorded in a committed `PROVENANCE.md`; **contents gitignored** (same rule as
  `data/inbox/drawings/`, per the forge data convention). The forge attachment
  stays immutable.
- `docs/tolerance_stacks/` — three stack definitions, one hardware-entries file,
  README, two worksheets. All committed: design artifacts, not run data.
- `tolerance_stack/` — a new top-level package. Nothing in `parser/`,
  `pipeline/`, `webui/` or `scoring/` was touched.
- `tests/test_tolerance_stack.py` — 34 tests, all green. Full suite:
  **542 passed, 13 skipped, 0 failed** (555 collected, 4:00 — corrected from
  "512 passed" by the review, which re-ran it post-merge). Worth noting for the next
  session: the three baseline failures earlier sessions flagged (2
  `test_extractor`, 1 `test_crop`) did **not** reproduce here.

**All 27 result cells** the workbook computes re-derive from the transcribed
element values alone, largest delta **6.4e-15**. Zero arithmetic discrepancies:
every finding is a modelling or design-drift finding.

## The final schemas

Three shapes, all versioned `.../v0`:

**`stack_definition`** — ordered `elements`, named `paths` through the joint,
`checks` over them. The load-bearing decision:

> **Store `nominal`/`min`/`max` *lengths*, and keep `lmc`/`mmc` beside them as
> transcribed.**

LMC/MMC are *material* conditions, not extremes. In this very workbook the
bushing chamfer has **LMC 0.889 > MMC 0.635**, because a bigger chamfer removes
more material — and the chamfer is subtracted. Any code that folds "MMC → max"
gets that element backwards and still produces plausible-looking totals. Jeff
had it right; a naive ingester would not have.

Second decision: **paths and checks are the same thing** — a list of
`{element|path, sign}`. So one `fold()` produces worst-case and RSS for both,
and there is exactly one place a sign can be wrong. Worked example:

```json
{"id": "bore_min_grip", "terms": [
  {"element": "straight_bushing"}, {"element": "spherical_bearing"},
  {"element": "flange_bushing_flange"}, {"element": "flange_bushing_L"},
  {"element": "bushing_chamfer", "sign": -1}]}
```
```
bore_min_grip   nominal 20.4850   WC 19.9218 .. 20.7368   RSS 20.3293 ± 0.2028
threads_in_bore__13 = fastener_grip_13 - bore_min_grip
                nominal  0.1398   WC -0.3660 .. 0.9570    verdict: marginal
```

**`source_ref`** — `document / revision / sheet / zone / view / callout` (what a
human needs to re-find it) + `confidence: traced | inferred | untraced` +
**`element_id` / `run_id`, both `None` everywhere**. That is the feature-identity
slot the strategy layer asked for. A test asserts they stay `None` in slice 1,
so a later consumer can distinguish "not yet wired" from "wired to nothing".

**`hardware_entry`** — `values_status: inline`, `library_ref: null`, plus
`assembly_status` (present/absent in the parts list, find no., balloons) and a
per-entry `gaps` list. When the fastener library exists, `library_ref` fills in,
`values_status` becomes `library`, and the inline numbers demote to a
cross-check. The `gaps` lists are already the library's intake queue.

**`check_result`** — produced, not stored. Verdicts `pass | marginal | fail`,
where **`marginal` = nominal passes, worst case does not**. That vocabulary is
what lets the output say "no clean analytical answer" honestly instead of
picking a side.

## Discrepancy summary

Full detail and numbering in the two worksheets. Headlines:

| # | finding | kind |
|---|---|---|
| F6 | **Every check the workbook evaluated uses a .063 washer that is absent from the 217755 parts list.** DETAIL B balloons a .032 washer; the sheet's thin-washer block is blank. Re-derived here (both fail or go marginal — the thin washer removes 0.787 mm of stack). | drift |
| F7 | The drawing selects the **-14** bolt, which the workbook rates as failing shank-out. The **-13** is in the parts list at qty 3 with **no balloon on any of nine sheets**. | drift |
| F8 / F16 | Both joints are retained by **slotted / castellated nuts + cotter pins**. The governing constraint is slot-vs-cotter-hole alignment, which *quantises* acceptable grip. The workbook models a plain nut and a continuous grip. Take 2 starts a castellation model (rows 45–47) and abandons it — those cells feed nothing. | model |
| F11 | The VPA stack **fails at nominal** (−0.0824) — and the workbook only ever filled the two worst-case columns, whose ±0.65 range reads as unremarkable. | slip |
| F2 | **RSS was never computed.** Row 50 is a label with no formula. It matters: `threads_in_bore__13` is −0.366 worst-case but −0.0295 at RSS. | slip |
| F1 | The "nominal" column is not a midpoint and is twice *outside its own limits* (rounding). The thread-transition "nominal" is its **maximum**, so nominal shank-out is pessimistic by up to 0.794. | slip |
| F13 | `NAS77A4-015` is absent from the assembly; the drawn bushing is Joby `214943-002`. | drift |
| F14 | DETAIL X balloons the VPA against the **tangential link mount (215175-002)**, not the pitch plate — so a stack called "VPA Output to Pitch Plate" may not touch the pitch plate. | drift |

Two findings were **my** misreadings, resolved and recorded because an automated
transcriber would hit both:

- **F3** — take 1's `E16 = E13+E14-E15` with `E13` blank looks like a dangling
  reference. It is a deliberate de-duplication (the flange is already counted at
  row 9); take 2 folds it in explicitly and lands on the identical total. "Fix"
  the dangling reference and you double-count 1.575 mm.
- **F12** — in the VPA block the `comments` column is a **loose hardware list,
  not row-aligned**. `MS21299C4K` sits beside `spherical bearing` but is a
  countersunk washer whose `.063 ±.006` matches the row-67 washer to the digit.
  Row-aligned ingestion would have attached a washer part number to a bearing.

Also: the tan-link ±0.08 and VPA ±0.10 pitch-plate flanges are **both real** —
215197 carries three distinct 4.06 callouts. My first read of them as an
inconsistency in Jeff's sheet was wrong.

## Source gaps — what the fastener library must ingest first

Ranked, from both worksheets:

1. **NAS6403 and NAS6404** (.190-32 / .250-28 hex bolts) — grip ±.010, thread
   run-out length (the entire `thread_transition` allowance is an uncited rule
   of thumb), and **cotter-hole position**. Used by every check in every stack.
2. **MS9363** slotted/castellated nuts — castellation slot count and depth.
   Together with (1) this is the *only* way to answer either joint, because
   both are cotter-retained.
3. **NAS1149** flat washer — the parts list says `.032" MIN`, the workbook
   models `.032 ±.004`. These disagree and nothing here can settle it.
4. **MS21299** countersunk washer — thickness band and the countersink geometry
   that "under head chamfer" actually refers to.
5. Joby part drawings (**214936-002**, **214820-002**, **214943-002** bushings;
   **212956-005** link assy and **208510-007** VPA assy for the two spherical
   bearing widths; **215175** for F14). These are part-level harvesting
   (groundwork item 4), not the fastener library.

**Traced, out of 17 element instances across three stacks: one.** The pitch-plate
flange, `3X 4.06 ±0.08`, 215197 sheet 2 zone B4. Five more are `inferred` from
the assembly parts list — part present and nominal consistent, tolerance band
still from the workbook. That ratio is the real result of the slice.

## Where should stacks and the fastener library live? (input to strategy, not a decision)

**Recommendation: split them.**

- **Fastener library → its own repo/stream, and soon.** It is the binding
  constraint on every check in both joints, its inputs (NAS/MS standards PDFs)
  have nothing to do with Joby drawings, its ingestion is vision-heavy and
  format-varied, and its licensing/redistribution posture differs. Nothing about
  it wants to live next to a CATIA parser. `hardware_entries.json` is a seed
  deliberately shaped so a `library_ref` can supersede it without touching the
  stacks.
- **Stacks → forge stream + projection, *not* a permanent drawing-checker
  directory.** A stack is a derived, cited, rebuildable artifact joining across
  drawing levels and a fastener library — exactly forge's shape. It should not
  live inside the tool that supplies only one of its inputs.
- **But keep the authoring loop here for now.** Slice 1's real dependency is
  drawing-checker's extracted JSON, its runs, and the drawings themselves. Every
  cross-check that produced a finding above used a `data/runs/` artifact.
  Moving before the schema settles buys nothing.

Concretely: leave `docs/tolerance_stacks/` where it is through phase 2, and
promote the fastener library to its own stream *now* — it is on the critical
path and it is the piece with the least coupling to this repo. The README states
the not-locked caveat.

## Notes for the next agent

- **No new dependency.** `venv-win` has no `openpyxl`; `tests/debug_dump_tol_stack_xlsx.py`
  reads the sheet from the zip with stdlib instead. That turned out *better*
  than openpyxl for this job: the raw XML carries the formula **and** the cached
  result on every cell in one pass, and seeing both is what let the
  re-derivation compare like for like. Watch for **shared formulas** —
  `H69` is `<f t="shared" si="1"/>` with no text; a naive reader sees an empty
  formula. Also: the workbook embeds a CAD cross-section screenshot at
  `xl/media/image1.png`, which is the only picture of the intended stack order.
- **Printed zone ≠ `pipeline.zone_mapper` zone.** ZoneMapper addresses a
  synthetic 16×12 grid for vision prompts. Jeff's "sheet 5, zone C10" and any
  human-facing citation mean the grid *printed in the sheet border* (217755 is
  A–L × 2–15). `tests/debug_trace_stack_values.py` reads those border ticks off
  the PDF and labels hits with them; use it, don't compute percentages.
- **`data/runs/.../*_balloons.json` keys the parts-list row as `item_no` in
  `balloons` but `find_no` in `parts_list`.** Joining on the wrong one silently
  yields "0 balloons" for every part, which reads as a real finding. Cost me a
  wrong conclusion before I checked the keys.
- The extracted `parts_list` in the 20260723_163810 run has a junk row also
  carrying `find_no: 25` (`part_number: "SCALE 1:20"`), colliding with the real
  MS9363-10 row. Read-only run (Jeff mid-review) — observed, not touched.
- `find 95 NAS6403U13H`, qty 3, is ballooned nowhere across nine sheets.
  Balloon-coverage signal, outside this handoff's scope.

## Decisions made that the handoff left open

- Read the xlsx with **stdlib**, not by adding `openpyxl` to `requirements.txt`
  (reason above).
- The xlsx copy is **gitignored** like every other `data/inbox/` stream, with a
  committed `PROVENANCE.md` carrying the sha256 and the re-copy command. The
  handoff said "present under `data/inbox/tolerance_stacks/`"; it is present on
  disk, and `data/` absence from git is not data loss per `CLAUDE.md`.
- The math module went to a **new top-level `tolerance_stack/` package** rather
  than under `docs/` or `data/` — both of those are forbidden code homes by the
  repo's own convention.
- Added **two checks the workbook does not contain** (`shank_out__*_thin`),
  because the .032 washer is the one actually drawn. They carry
  `workbook_cells: null` and `[NOT IN WORKBOOK]` in the label, and a test
  asserts both, so they can never be read back as Jeff's numbers.
- Transcribed take 2's unused nut-geometry rows (45–47) rather than dropping
  them; a test asserts they are referenced by nothing. They are the visible stub
  of the castellation model that F8/F16 say is the check that matters.
