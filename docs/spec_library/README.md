# docs/spec_library — the structured spec library

What a standard *says*, extracted once, with every value carrying the place it
was read from. Built by handoff `spec_library_v0` (2026-08-05) from
`dispatch/docs/strategy/drafts/DRAFT_spec_sheet_pipeline.md`.

```
docs/spec_library/
  events/*.json        spec-parse/v0 -- COMMITTED, immutable, append-only
  intake_queue.json    spec_intake/v0 -- which document closes which gap
data/projections/spec_library/library.json
                       the fold. Derived, gitignored, disposable -- and SHARED:
                       data/ exists only in the main checkout.
```

Rebuild, from the main checkout:

```
venv-win\Scripts\python.exe -m tolerance_stack
```

From a worktree, `data/` is that worktree's own throwaway copy, so name the main
checkout's or the rebuild lands nowhere anybody reads:

```
C:\workspace\tolstack\venv-win\Scripts\python.exe -m tolerance_stack ^
    --data-root C:\workspace\tolstack\data
```

That output directory is shared by every live worktree, so the rebuild **stamps
which tree it built from** (`provenance`: branch, HEAD sha, dirty, distance from
trunk, and the events dir resolved absolute) and **refuses** to overwrite a
projection built from a tree this one does not contain — the same gate the two
viewer projections use, `scripts/projection_provenance.py`, with
`--allow-older-tree` to override it loudly.

Why the file exists at all, given that the fold is a pure function of committed
events: nothing in the repo *reads* it — every code consumer calls
`build_library(load_events(...))` in process. It is there for the **reader** who
has to turn a `library_ref` into numbers and would otherwise fold the event log
by hand, which is exactly the path a stale value takes into a stack claiming
`confidence: "traced"`. Kept, and therefore stamped
(`spec_library_projection_provenance`, 2026-08-12).

## Parses are events, not edits

One `spec-parse/v0` event per **(document, parser-version)**. An event is never
edited; a later event against the same document supersedes it, and the
projection folds latest-per-document. That is the same disposition culture the
stacks run on, and it exists because the two questions this repo actually asks —
*who read this number, off which sheet* and *what did it say before somebody
changed it* — are the two a hand-maintained `fastener_library.json` cannot
answer.

Corrections come in two shapes:

| mode | what it does |
|---|---|
| `full` | replaces everything previously known for that document. A fresh read, or a re-read by a new parser version. |
| `correction` | overlays only the values it names, field by field. Must carry `supersedes` and `reason`. The value it displaced is kept on the winner's `superseded` list. |

A one-line fix does not have to restate a whole standard, and the wrong number
stays visible. A library that quietly swaps a value is no better than the
workbook this repo exists to get away from.

**The log currently holds no correction event**, because re-reading every value
the pitch_link session had transcribed by hand found no error. The mechanism is
pinned by fixture events in `tests/fixtures/spec_events/` and by
`test_a_correction_event_wins_the_fold_and_keeps_what_it_displaced`, so the
first real correction lands on a tested path rather than an untried one.

## Parser v0 is an agent, not a pipeline

`parser.name == "agent-manual"` means an agent read page renders. These are
photocopies with no text layer — `page.get_text()` returns empty, grep is
useless. The working recipe, from the pitch_link lesson:

- PyMuPDF (`fitz`) is **deliberately not in this repo's `requirements.txt`**.
  Run renders from drawing-checker's venv, per the `debug_trace_stack_values.py`
  precedent: `C:\workspace\drawing-checker\venv-win\Scripts\python.exe`.
- `get_pixmap(Matrix(2.2))` per page to find the tables, then `Matrix(6..12)`
  with a `clip=fitz.Rect(...)` on the specific row or figure region.
- **Read the notes sheet before the dimension table.** Sheet 2 is what tells you
  what the letters in the table mean, and which column the part number selects.
- **Check the embedded scan's own resolution before choosing a zoom**:
  `doc.extract_image(xref)["width"]` against `page.rect.width` gives the
  ceiling. MS9363 is ~300 dpi (ceiling 4.16); NAS6403 is ~200 dpi (ceiling
  2.78). Rendering above the ceiling is interpolation and buys nothing — this
  is the single cheapest thing to know before burning renders on an illegible
  token.

Automated vision extraction is **parser v1** and is not built. When it is, its
events land against the same documents, side by side with v0's — which is the
whole reason events are keyed by (document, parser-version) rather than by
document alone.

## Every extracted value is reviewed like a stack

The second-agent review (dispatch review flow) checks values against the
renders. A library that launders misreads is worse than no library, because a
stack citing it shows `confidence: "traced"` and passes every mechanical check
in the repo — the same trap the SOP's transitive-workbook ban exists to close.

## Three outcomes, not two

A field that is not in the library is not one thing:

| | what it means | what closes it |
|---|---|---|
| **value** | read off the document, with its `at` location | — |
| **absence** | the document was read and genuinely does not contain it | usually another document, named in `closed_by` |
| **unreadable** | it is on the page and the scan will not give it up; the `crop` that was tried is attached | a better scan |

Recording absences is what stops the next agent re-opening the same PDF to look
for something that was never there, and it is what the SOP's gap discipline
consumes. An unreadable is an **acquisition** gap, not a licence to infer.

Some absences close *nothing*: MS9363's `thread_start_to_castellation_spacing`
has `closed_by: null` with a reason, because the standard does not control it
and no other document does either. An absence that cannot be closed is a
different fact from one that is merely waiting on a document, and the queue
must not go looking for a file that does not exist.

## The schema decision the draft left open: per-document, subject-keyed

The draft did not settle whether to model extraction *per family table* (one
record per standard, holding its whole dash-number table) or *per document*
(whatever this read pulled out). This library is **per document, keyed by
subject**:

- an **event** covers one document, because that is the unit of work, of
  provenance, and of re-reading;
- an **entry** inside it covers one `subject`, and a subject is deliberately
  *the string a stack already cites*: a full part number (`NAS6403U11D`,
  `MS9363-09`) or a cited criterion (`JPS00094 5.9.7`).

Why not per-family tables: NAS6403-6420's sheet-3 table is 13 basic numbers ×
64 tabulated grip dash rows ≈ 830 cells (dash numbers run 1-32, then evens to
96), and transcribing all of them by hand to get two is the kind of
completeness that never gets done. Subject-keyed extraction is
demand-driven — you enter the part the drawing actually calls out — and the
addition of `NAS6404U13D` beside `NAS6403U11D` cost one render, because the
second row was in a table already open.

Family-wide facts (the CODE block, note (a)'s definition of grip, MS9363's
requirement 10) do not belong on a part number, so they get their own subject
with `subject_kind: "family"` or `"criterion"`. A consumer reading
`NAS6403U11D` gets the dimensions; the rules that make those dimensions mean
something sit one lookup away under `NAS6403 thru NAS6420`. That split is the
cost of the decision, and it is the right side of the trade: duplicating note
(a) onto every part number is how the two copies drift.

## The intake queue is derived state

`intake_queue.json` stores what a human knows — rank, kind, `in_pile`, what the
document unblocks, and `closes`: the library subjects that mark it done. It
does **not** store status. `IntakeQueue.status()` computes `entered` / `in pile`
/ `missing` from the library, so a row cannot claim to be entered while the
library holds nothing it promised.

`in_pile` is stored rather than checked, because `data/inbox/specs/` is
gitignored and holds only its README from a worktree. It is a human assertion
about the main checkout at `C:\workspace\tolstack\data\inbox\specs\`.
