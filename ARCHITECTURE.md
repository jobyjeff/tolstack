# tolstack — architecture

Tolerance-stack authoring + review, and the spec/datasheet inbox. For the
platform-wide design and the data contracts this repo builds on, see forge's
`DESIGN.md` and `CONVENTIONS.md`. This repo follows the forge standard repo
layout: data in `data/`, code at the top level, projections rebuilt from the
event log.

Founded 2026-08-03 by handoff `tolstack_founding`, importing the
`tolerance_stack_slice1` material from drawing-checker (`PROVENANCE.md`).

## Package layout

```
tolerance_stack/
  __init__.py       re-exports the public names
  __main__.py       `python -m tolerance_stack` -- rebuild the spec projection
  stack.py          the stack shapes + the fold. ~330 lines, stdlib only.
  spec_library.py   the parse-event shapes + the library fold. stdlib only.
  thermal.py        the thermal-fit archetype: materials + the check generator.
                    stdlib only, and no arithmetic of its own beyond
                    thermal_factor(). Added 2026-08-05.
scripts/
  build_viewer_projection.py   fold() -> data/projections/viewer/results.json
  build_viewer_crops.py        source_ref -> a crop PNG + crops.json (needs PyMuPDF)
  projection_provenance.py     which tree built a projection, + the ancestry gate
                               that refuses an older tree's rebuild. Added
                               2026-08-10; stdlib only, both builders import it.
  snapshot_drawing_checker.py  before/after listing of drawing-checker's data/,
                               the evidence for "nothing was written there"
  run_viewer_browser_tests.mjs the browser test tier (test tooling, not app code)
apps/
  viewer/           the static stack/check review surface (see its README)
```

`stack.py` is deliberately the whole stack implementation. Its contents:

| name | what it is |
|---|---|
| `SourceRef` | where a value came from; `confidence`, plus `element_id`/`run_id` held open for feature identity |
| `StackElement` | one ordered element: `nominal`/`min`/`max` lengths, `lmc`/`mmc` as transcribed, `hardware_ref`, `source_ref` |
| `Term` | an element, a sign (`+1`/`-1`), and a positive `coefficient` (default `1.0`), all validated |
| `Interval` | a fold result: nominal, worst-case min/max, RSS center/half |
| `fold(terms)` | **the only place element values are combined** |
| `CheckResult` | a check outcome + the `verdict` property |
| `StackDefinition` | elements + paths + checks; `path()`, `check()`, `all_checks()` |
| `load_stack(path)` | read + schema-check a stack-definition JSON |

There is no pipeline and no service. A stack is authored by hand (by an agent
following the SOP) into JSON, and the module makes that JSON *executable* so
tests can pin the numbers. Nothing generates a stack automatically yet — though
since 2026-08-05 one archetype generates its own **checks** from a declared
`thermal_fit` block, which is not the same thing and is discussed below.

The one executable entry point is `python -m tolerance_stack`, which rebuilds
the spec-library projection. A projection needs a rebuild command by the forge
data convention; a stack does not.

### The thermal-fit archetype (`thermal.py`)

The repo's **second** archetype, added 2026-08-05 by `hub_bearing_thermal_stack`:
isothermal heat soak over a chained diametral interference fit, evaluated at every
corner of (fit condition × temperature). Full statement of inputs, arithmetic and
caveats in `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`.

| name | what it is |
|---|---|
| `MaterialEntry` | one material + condition, its CTE, a `values_source`-shaped citation, a separate `designation_source`, and a non-empty `gaps` list |
| `load_materials(path)` | read + schema-check `docs/tolerance_stacks/materials.json` (`material_entry/v0`) |
| `thermal_factor(cte, dT)` | `1 + dT * cte * 1e-6` — the archetype's **one** new arithmetic primitive |
| `ThermalFitChain` | one seat: hub bore, sleeve bore + wall, bearing OD, and the stiffness ratio that splits stage 1's interference |
| `ThermalFitSpec` | the whole `thermal_fit` block: shared temperature scenarios plus one or more chains |
| `build_checks(spec, materials)` | chains × 2 stages × N temperatures, as term lists whose coefficients carry the weights |
| `load_thermal_fit_stack(path)` | `load_stack()` + generated checks, returning an ordinary `StackDefinition` |
| `expanded_terms_table(stack)` | every generated term flattened, so the signs and weights can be read on a page |
| `workbook_corner(...)` | a source spreadsheet's **coherent material corner**, for comparison only — the one function in the repo that reads `lmc`/`mmc`, and deliberately not routed through `fold()` |

**Checks are generated, not authored**, and a `thermal_fit` stack file with a
hand-written check is refused. That buys correctness — no coefficient can go stale
in a data file — at the cost of the term lists not existing in the JSON for a
reviewer to read. `tests/debug_report_thermal_fit.py --terms` and the worksheet's
appendix are how that cost is paid back, and it is a compromise rather than a
solution. Noted as such in the archetype doc's registry-input section.

### The spec library (`spec_library.py`)

| name | what it is |
|---|---|
| `ValueLocation` | the re-findable address of ONE value: sheet, table, row, column, note, figure |
| `SpecValue` | one extracted value + its `at` location and `confidence` |
| `Absence` | a value the document was read for and demonstrably does not contain |
| `Unreadable` | a value the scan will not give up, carrying the crop that was tried |
| `SpecEntry` | everything one event says about one `subject` |
| `ParseEvent` | one immutable read of one document by one parser version |
| `build_library(events)` | **the fold**: latest-per-document, corrections overlaid field by field |
| `IntakeQueue` | which document closes which gap; `status()` is DERIVED from the library |
| `rebuild()` | wipe-and-rebuild `data/projections/spec_library/library.json` |

Reading a standard is an **event, not an edit** — the same disposition culture
the stacks run on, and for the same reason: the two questions this repo asks are
*who read this number, off which sheet* and *what did it say before somebody
changed it*, and an append-only log answers both by construction.

Three outcomes rather than two: a **value**, an **absence** (read for, not
there — names the document that would close it), and an **unreadable** (on the
page, the photocopy will not give it up — an acquisition gap, never a licence to
infer). The SOP's gap discipline consumes those differently. Some absences close
nothing at all: MS9363 does not control thread-start-to-castellation spacing and
neither does any other document, so that absence carries `closed_by: null` and
the queue does not go looking.

Full detail, including the per-document-vs-per-family schema decision and the
render recipe for photocopied standards, is in `docs/spec_library/README.md`.

### Why one `fold()`

A path through the joint ("bore min grip length") and a check over it ("fastener
grip minus that path") are the same object: a list of `{element|path, sign}`.
Modelling them identically means worst-case and RSS are computed in one place,
and **there is exactly one line where a sign can be wrong** — the single most
consequential arithmetic error a stack can contain, and the one an eyeball check
of plausible-looking totals will not catch.

Signs multiply through nesting: a `{"path": p, "sign": -1}` term expands to `p`'s
own terms with every sign flipped, so nesting never changes the arithmetic. The
same holds for coefficients, which multiply through.

### Where computation may live — and the coefficient

The rule that matters is not "no new code does arithmetic". It is **one place
where element values get combined**. A second combiner is what makes a sign error
undetectable; a per-term *weight* does not, because it is visible in the JSON next
to the sign it scales.

So when the two-stage thermal fit arrived (2026-08-05,
`hub_bearing_thermal_stack`) needing three things `fold()` could not express —
a diametral term worth twice a radial one, an isothermal soak that multiplies a
diameter by `1 + ΔT·α`, and an interference split across two members by a
stiffness ratio `k` — the answer was **not** a second engine. `Term` gained a
positive `coefficient` (default `1.0`), the effective weight is
`sign * coefficient`, and the whole archetype folds through the existing
primitive. Every stack authored before it folds to the same numbers; the seeded
three re-derive against the 260729 workbook with a largest delta of 6.4e-15,
unchanged.

Two consequences worth knowing:

- **Direction stays in `sign`.** `coefficient` must be `> 0` and a test enforces
  it. A term with a negative coefficient would have two places to be backwards,
  which is the property this design exists to remove.
- **A coefficient scales the RSS half-range linearly**, where duplicating a term
  scales it by √2. That difference is the reason a sleeve's two walls are
  `coefficient: 2` on one element rather than the element listed twice: the two
  walls are *one turned dimension*, perfectly correlated, and listing it twice
  understates the half-range by 29%.

`thermal.py` computes **weights** — thermal factors, `2k`, `1−k`. It never
combines two element values. That is the line, and it is the one to hold if a
third archetype wants its own layer.

### Material condition is not an extreme

`fold()` reads `min`/`max` **lengths** only. It never reads `lmc`/`mmc`. Those
are carried as transcribed so a worksheet can be checked against a source sheet
column-for-column, and because the mapping to min/max is not fixed: in the
seeded tan-link stack the bushing chamfer has **LMC 0.889 > MMC 0.635** (more
material removed = least material), and the chamfer is subtracted. Code that
derives `max` from `mmc` gets that element backwards and still totals plausibly.

### What RSS here does and does not claim

`fold()` combines each term's half-range in quadrature about the *midpoint* sum.
That treats every band as an independent, symmetric, equal-confidence variate.
Two element kinds in the seeded stacks are not:

- `role="allowance"` (the thread transition, min 0 / max 1.5875) is a
  deterministic geometric bias. RSS re-centers it at 0.794, which is most of why
  `shank_out__14_thick` reads nominal −0.7153 but RSS center −0.077.
- one-sided bands (the spherical bearing, −0.05/−0) are not symmetric about
  their midpoint.

So RSS is a **relative softening indicator**, not a probability statement, and
is not directly comparable to the worst-case columns. `CheckResult.verdict`
deliberately never reads RSS.

## Data flow

```
data/inbox/specs/         (append-only spec + datasheet pile — the trace targets)
data/inbox/drawings/      (part + assembly drawing PDFs; copies, never the originals)
data/inbox/tolerance_stacks/  (source workbooks; gitignored, provenance committed)
        |                              |
        |  an agent reads page renders  |  hand transcription, by an agent
        |  (parser agent-manual/v0)     |  following docs/SOP_TOLERANCE_STACK.md
        v                              |
docs/spec_library/events/*.json        |
  (spec-parse/v0 — COMMITTED, immutable, append-only)
        |                              |
        |  build_library  (latest-per-document; corrections overlay)
        v                              |
data/projections/spec_library/library.json   (derived, gitignored, disposable)
        |                              |
        |  hardware_entry.library_ref   v
        +---------------------> docs/tolerance_stacks/*.json
                                  (stack_definition + hardware_entry
                                   + material_entry — COMMITTED)
                                       |                     |
                    tolerance_stack.fold, via                |  build_viewer_crops.py
                    load_stack / path / check ...or,         |  (+ drawing-checker
                    for the thermal_fit archetype, via       |   exports, PyMuPDF)
                    thermal.load_thermal_fit_stack, which    |
                    GENERATES the checks from a thermal_fit  |
                    block and then folds them the same way   |
                                       v                     v
                          check_result/v0         data/projections/viewer/crops.json
                       (on demand, never stored)        + crops/*.png
                             |      |                          |
                             |      |  build_viewer_projection.py
                             |      v                          |
                             |  data/projections/viewer/results.json
                             |      |                          |
                             |      +------> apps/viewer/ <----+
                             v               (renders, combines nothing)
                    docs/tolerance_stacks/WORKSHEET_*.md
                             \______________ read live by apps/viewer
```

All three inbox streams are gitignored by design (forge data convention): the
filesystem is canonical, a tracked `PROVENANCE.md` / `README.md` is the skeleton,
and **from a worktree those directories are empty apart from the skeleton**. Read
the data in the main checkout at `C:\workspace\tolstack\data\`; cite it
repo-relative.

Nothing lands in `data/runs/` yet: no run-producing pipeline exists here. The
`data/runs/` skeleton is the standard-layout requirement, held for when a stack
synthesizer does produce runs for forge to ingest. `data/projections/` is now
live — it holds the spec library, rebuilt from the committed event log, and
`data/projections/viewer/`, wiped and rebuilt by the two viewer scripts.

The **events are committed and the projection is not**, which inverts the usual
`data/` placement. It follows from the same rule as the stack JSONs: the events
are hand-authored design artifacts whose loss would be unrecoverable, and
`data/` contents are gitignored by the forge convention. The projection is a
pure function of them, so it goes where derived things go.

### The viewer and the one-fold rule (2026-08-05, `stack_viewer_v0`)

`apps/viewer/` is a static, read-only review surface (forge `apps/` pattern:
classic scripts, no build, no npm, no daemon, File System Access grant at
`mode: "read"`). It exists because reviewing a stack meant reading JSON.

It renders **projections**, not the stacks, and the reason is the one-fold rule
above: the viewer must not contain a second arithmetic path. So

- `scripts/build_viewer_projection.py` calls `fold()` and writes `results.json`,
  which embeds each stack **verbatim** and carries the derived blocks
  (`paths`, `checks` with verdicts, per-element flags, provenance counts, gaps)
  beside them. Fold outputs are rounded there, in Python, so the browser prints
  `String(n)` and never decides how a number reads.
  `tests/test_viewer_projection.py::test_stack_block_is_byte_identical` pins the
  embedded stack byte-identical to the authored file.
- `scripts/build_viewer_crops.py` resolves each `source_ref` to a page of a real
  PDF and renders a crop, or records **why not**. The viewer cannot roam the
  filesystem or reach drawing-checker, so hovers read pre-rendered PNGs.

Resolution never guesses: `source_ref.export`, whose `sha256` is mandatory and
always verified; else the spec pile by filename; else the legacy free-text
`joint.assembly_export`'s run (sha256 verified against `run_meta.json`), kept only
so a stack written before 2026-08-06 still resolves. There is deliberately **no
prose fallback** — scanning `provenance.sources_used` for a `.pdf` path was a
rule until `citation_export_provenance` removed it, because a resolved count that
rises through a looser rule is a regression, not progress. Anything else is
`unresolvable` **with a reason**, and the reasons are design input — see
`docs/sessions/lessons/LESSONS_20260805_stack_viewer_v0.md` and
`LESSONS_20260806_citation_export_provenance.md`.

Derived flags worth knowing, because neither has a schema field:

- **zero-width band** = `min == max`, i.e. no document gives a tolerance, so
  every interval it feeds is a lower bound. Rendered as its own axis, not as a
  fourth confidence.
- **INCOMPLETE check** is detected from the word `INCOMPLETE` in the authored
  label/guidance. `check_result/v0` has no `complete` field; that is a gap
  (`docs/issues/ISSUE_20260805_check_result_has_no_complete_flag.md`).

## Cross-repo dependencies

Read-only, one way:

- **drawing-checker** — `data/runs/<run>/*_balloons.json` (parts list + balloons)
  and the drawing PDFs are how an element gets traced to a callout. Two of the
  imported debug tools take a drawing-checker path as an argument. Nothing here
  writes into that repo.
- **forge** — the atomic-notes attachment stream is the upstream of the source
  workbook (see `data/inbox/tolerance_stacks/PROVENANCE.md`). Forge attachments
  are immutable; treat copies as read-only.

## Imported material — what may change, and how it is recorded

`PROVENANCE.md` is the register of everything copied in at founding, one row per
file, with an Amended column saying whether it has changed since. That register
is **the single statement of this rule**; every other document points here or
there rather than restating it. Two rules, both enforced by
`tests/test_provenance.py` rather than by remembering:

- **Any imported file may change — the row must change with it, in the same
  commit.** A "byte-identical" row is a claim about the import, not a freeze:
  the SOP *requires* changing three of them for every new stack. A purely
  additive change still falsifies the row. The test parses the tables, diffs
  every claimed path against both baselines (this repo's import commit
  `c157300` and drawing-checker's blob at the recorded sha), and fails naming
  the row and what to write. That check went unrun by five authors in a row
  before it existed; do not re-add it to a checklist.
- **`docs/reference/` is insert-only.** It holds imported reference material —
  another repo's lesson, the primary source behind the SOP and the review
  checklist. Imported text is **never edited, reworded or deleted**, and the
  file is not required to stay byte-identical: a **dated, additive correction
  blockquote** may be inserted *after* the passage it corrects, leaving the
  original standing so the mistake stays legible. Record every such insertion in
  `PROVENANCE.md`.

  Settled 2026-08-10 (`provenance_byte_identical_test`), replacing a "no edits"
  rule that the repo had already broken for a good reason. Rationale: this
  directory is a *source*, so a reader who follows a pointer into it and finds a
  figure the repo has since corrected is misled by the rule that was supposed to
  protect them; and correct-in-place-leave-the-old-visible is already the house
  pattern for a superseded number everywhere else
  (`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`).
  Reverting a true correction to satisfy a freeze is the wrong trade. The
  freeze's one real benefit — you can tell at a glance that nobody rewrote
  history — is what the insert-only test now provides instead, and it is
  strictly stronger than reading the file and trusting it.

## Known modelling gaps

Both seeded joints are retained by a **slotted/castellated nut + cotter pin**.
The governing constraint there is castellation-slot vs cotter-hole alignment,
which *quantises* acceptable grip rather than bounding it. The stacks model a
plain nut and a continuous grip, so their shank-out numbers do not settle either
joint. This is stated, not hidden — see the SOP's castellated-nut caveat and
findings F8/F16 in `docs/reference/`.

**Reading MS9363 Rev C (2026-08-05) settled how far that gap can ever close.**
The standard controls slot-to-slot coincidence (within .005) and slot-axis to
thread-PD-axis (within .005), and gives nut height, slot count and slot width —
so the *axial window* a cotter hole must fall in is now sourced (`G` to `H` from
the nut bearing face). It says nothing about where a slot sits relative to the
**thread start**, and JPS00094 Rev C §5.9.7 footnote (a) confirms that spacing
varies between manufactured nuts. So the phase is not merely undocumented here,
it is uncontrolled — no acquisition closes it. A stack can bound the window and
must then defer to the assembly procedure §5.9.7 prescribes (change or add a
washer, capped at three by §5.5.3.a). Recorded as an absence with
`closed_by: null` on the `MS9363` library subject.

The binding constraint on nearly every value was the **absence of a
fastener-spec library**: **5 of 26 element instances across the three seeded
stacks are `traced`** (3 `inferred`, 18 `untraced`). That library now exists
(`docs/spec_library/`), holds the two bolts and both nuts, and carries its own
intake queue — the per-entry `gaps` lists in `hardware_entries.json` are being
superseded by it one entry at a time, starting with `NAS6403U11D`.

**What that ratio means and how to compute it is defined in exactly one place**
— `docs/SOP_TOLERANCE_STACK.md`, "The traced ratio" — and reproduced by
`tests\debug_report_tolerance_stacks.py --ratio`. This file quotes the number
and does not restate the rule.

> **Correction, 2026-08-06** (handoff `traced_labels_and_ratio`). This sentence
> read *"1 of 17 element instances … was `traced`"* from founding until
> 2026-08-06 and neither half reproduced from the stacks: the denominator
> silently omitted `tan_link_to_pitch_plate_take2` (11 + 6 = 17 of 26), and the
> numerator counted only the value traced to a *part drawing* while three more
> elements carried `confidence: "traced"` in the JSON — illegitimately, on
> parts-list citations whose own notes admitted the band was untraced. Two of
> those three were re-cited to `NAS6403-NAS6420 Rev 4.pdf` sheet 3 and are now
> properly `traced`; the third (MS21299C4K) was downgraded to `inferred`. So the
> repo understated its own sourcing 4x on the field count, and 3x against the
> corrected one, for its first month. The number is now pinned by a test.

> **Moved, 2026-08-10** (handoff `fastener_citations_and_confidence`). Not a
> correction — the figure above read **3 of 26** (7 `inferred`, 16 `untraced`)
> and was right when written. It moved because five slice-1 element instances
> were re-decided in one sitting, in two directions: both `fastener_grip_13`
> instances were re-cited to `NAS6403-NAS6420 Rev 4.pdf` sheet 3 (`inferred` →
> `traced`), and `tan_link:washer_thin` and `take2:straight_bushing` were
> downgraded `inferred` → `untraced` because their only support was the source
> workbook. `tan_link:thread_transition` was decided on the merits and left
> `untraced`: the standard gives `T (Ref)`, which is the whole thread region,
> not the run-out inside it. **No numeric value changed and no check result
> moved** — this is a provenance-label change end to end.

The thermal-fit stacks invert that picture and expose a **second** intake queue.
Their
*dimensions* are almost fully traced (12 of 16 element instances, because Jeff
supplied five released part drawings), while every **material property and every
scenario parameter** is untraced: three CTEs, two operating temperatures, two
stiffness ratios, 0 of 7. `materials.json`'s `cindas_request` fields are that
queue, and its upstream is **CINDAS**, not the spec pile — so unlike the fastener
gaps it cannot be closed by appending a PDF. Quoting a dimension-only traced ratio
for a thermal stack overstates it; the worksheet states both.

Two model-level gaps carried by the thermal archetype rather than by any one
stack, both stated in `ARCHETYPE_thermal_fit.md`: the soak is **isothermal and
free** (no gradient, no coupling between the pressing members' expansions), and a
**dimensional interference is not a torque capacity** — the check says the parts
touch, not that the joint can carry the torque that would spin the inner member.
That second one is the direct analogue of the castellated-nut caveat above, and
for the same reason: a correctly computed number that does not settle the
question, which must say so next to itself.
