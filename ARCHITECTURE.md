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
scripts/
  build_viewer_projection.py   fold() -> data/projections/viewer/results.json
  build_viewer_crops.py        source_ref -> a crop PNG + crops.json (needs PyMuPDF)
  run_viewer_browser_tests.mjs the browser test tier (test tooling, not app code)
apps/
  viewer/           the static stack/check review surface (see its README)
```

`stack.py` is deliberately the whole stack implementation. Its contents:

| name | what it is |
|---|---|
| `SourceRef` | where a value came from; `confidence`, plus `element_id`/`run_id` held open for feature identity |
| `StackElement` | one ordered element: `nominal`/`min`/`max` lengths, `lmc`/`mmc` as transcribed, `hardware_ref`, `source_ref` |
| `Term` | an element and a sign (`+1`/`-1`), validated |
| `Interval` | a fold result: nominal, worst-case min/max, RSS center/half |
| `fold(terms)` | **the only arithmetic in the repo** |
| `CheckResult` | a check outcome + the `verdict` property |
| `StackDefinition` | elements + paths + checks; `path()`, `check()`, `all_checks()` |
| `load_stack(path)` | read + schema-check a stack-definition JSON |

There is no pipeline and no service. A stack is authored by hand (by an agent
following the SOP) into JSON, and the module makes that JSON *executable* so
tests can pin the numbers. Nothing generates a stack automatically yet.

The one executable entry point is `python -m tolerance_stack`, which rebuilds
the spec-library projection. A projection needs a rebuild command by the forge
data convention; a stack does not.

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
own terms with every sign flipped, so nesting never changes the arithmetic.

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
                                  (stack_definition + hardware_entry — COMMITTED)
                                       |                     |
                       tolerance_stack.fold                  |  build_viewer_crops.py
                       (via load_stack/path/check)           |  (+ drawing-checker
                                       |                     |   exports, PyMuPDF)
                                       v                     v
                          check_result/v0         data/projections/viewer/crops.json
                             |      |                    + crops/*.png
                             |      |  build_viewer_projection.py    |
                             |      v                                |
                             |  data/projections/viewer/results.json |
                             |      |                                |
                             |      +------> apps/viewer/ <----------+
                             v               (renders, computes nothing)
                    docs/tolerance_stacks/WORKSHEET_*.md
                             \______________ read live by apps/viewer
```

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
  `String(n)` and never decides how a number reads. A test pins the embedded
  stack byte-identical to the authored file.
- `scripts/build_viewer_crops.py` resolves each `source_ref` to a page of a real
  PDF and renders a crop, or records **why not**. The viewer cannot roam the
  filesystem or reach drawing-checker, so hovers read pre-rendered PNGs.

Resolution never guesses: the spec pile by filename; a drawing through
`joint.assembly_export`'s run (sha256 verified against `run_meta.json`); else a
single unambiguous `provenance.sources_used` entry. Anything else is
`unresolvable` **with a reason**, and the reasons are design input — see
`docs/sessions/lessons/LESSONS_20260805_stack_viewer_v0.md`.

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
fastener-spec library**: 1 of 17 element instances across the three seeded
stacks was `traced`. That library now exists (`docs/spec_library/`), holds the
two bolts and both nuts, and carries its own intake queue — the per-entry `gaps`
lists in `hardware_entries.json` are being superseded by it one entry at a time,
starting with `NAS6403U11D`.
