# Lessons — spec_library_v0 (worked 2026-08-05)

Handoff: `docs/sessions/completed/HANDOFF_20260805_spec_library_v0.md`.
Branch: `handoff/spec_library_v0`, cut from `master`.

Build the event-sourced structured spec library, and seed it from the standards
this repo had already read by hand — plus `MS9363 Rev C.pdf`, which Jeff dropped
into the pile the same morning.

## What landed

| commit | |
|---|---|
| `a69757b` | `tolerance_stack/spec_library.py` — the `spec-parse/v0` shapes, the fold, the intake-queue shapes |
| `74db4c8` | three parse events, `intake_queue.json`, `docs/spec_library/README.md` |
| `6a0e17c` | 44 value-level tests, the correction fixtures, the `NAS6403U11D` consumer seam |
| *(this one)* | README/ARCHITECTURE, this lesson, handoff → `completed/` |

**11 library subjects from 3 documents; 95 tests green** (51 in the stack suite,
44 new in `test_spec_library.py`). The
library holds `NAS6403U11D`, `NAS6404U13D`, `MS9363-09`, `MS9363-10`, two family
subjects and five quoted JPS00094 criteria.

## The schema decisions the draft left open

### Per-document extraction, keyed by subject — not per-family tables

An **event** covers one document, because that is the unit of work, of
provenance, and of re-reading. An **entry** inside it covers one `subject`, and
a subject is deliberately *the string a stack already cites*: `NAS6403U11D`,
`MS9363-09`, `JPS00094 5.9.7`.

Why not per-family tables: NAS6403–6420 is 18 basic numbers × 96 grip dash
numbers ≈ 1700 rows. Transcribing all of them by hand to get the two this repo
uses is the kind of completeness that never actually gets done, and doing it
badly would put 1698 unreviewed numbers behind a `confidence: "traced"` label.
Subject-keyed extraction is demand-driven — you enter the part the drawing calls
out. The cost of the decision is that family-wide facts (the CODE block, note
(a)'s definition of grip, MS9363 requirement 10) live one lookup away under a
`subject_kind: "family"` subject rather than on the part. That is the right side
of the trade: duplicating note (a) onto every part number is how two copies
drift.

If parser v1 (automated vision) ever does read a whole family table, it lands as
a **new event against the same document** — which is exactly why events are keyed
by (document, parser-version) and not by document alone.

### Three outcomes, not two: value / absence / unreadable

The single most useful thing in the schema, and it was not in the draft. A field
that is not in the library is not one thing:

- a **value**, with its `at` location;
- an **absence** — the document was read and genuinely does not contain it.
  NAS6403 never dimensions thread run-out. Recording that is what stops the next
  agent re-opening the same PDF, and `closed_by` names the document that would
  supply it;
- an **unreadable** — it is on the page and the photocopy will not give it up.
  Carries the `crop` that was tried and the scan's own resolution ceiling. An
  illegible scan is an **acquisition** gap, never a licence to infer.

And a fourth thing fell out of MS9363 that I did not expect: **an absence that
closes nothing**. `thread_start_to_castellation_spacing` has `closed_by: null`
with a reason, because no document controls it. Without that distinction the
intake queue would spend forever hunting a file that does not exist.

### Corrections overlay, they do not restate

`mode: "full"` replaces everything previously known for a document; `mode:
"correction"` overlays only the values it names, field by field, and must carry
`supersedes` and `reason`. The displaced value stays on the winner's
`superseded` list. A one-line fix should not have to restate a 4-sheet standard,
and the wrong number has to stay visible — a library that quietly swaps a value
is no better than the workbook this repo exists to get away from.

**The committed log holds no correction event.** I re-read every value the
pitch_link session had transcribed from NAS6403 by hand — all seventeen — and
every one agreed. Rather than author a fabricated wrong reading into an
immutable log to demonstrate the mechanism, the correction path is pinned by
synthetic fixtures (`tests/fixtures/spec_events/`, which say in their own
`document_meta` that they are synthetic) exercising the real `build_library`:
the correction wins, keeps what it displaced with the reason, leaves untouched
values crediting the earlier event, and **withdraws an absence it fills** — that
last case is the one that is easy to get wrong, because the library would
otherwise report a value and its own absence at once.

### The intake queue derives its status

`intake_queue.json` stores rank, kind, `in_pile`, what the row unblocks, and
`closes`: the library subjects that mark it done. It does **not** store status.
`IntakeQueue.status()` computes `entered` / `in pile` / `missing` from the
library, so a row cannot claim to be entered while the library holds nothing it
promised. `in_pile` is stored, because `data/inbox/specs/` is gitignored and
holds only its README from a worktree — it is a human assertion about the main
checkout.

## Time per document — calibration for whether automated vision is worth it

The handoff asked for this explicitly. Wall-clock is not meaningful for an agent
session, so here is the unit that is: **renders spent**.

| document | pages | scan | renders | outcome |
|---|---|---|---|---|
| `MS9363 Rev C.pdf` | 2 | 300 dpi bitonal, clean | **11** (2 full-page, 9 crops — 2 of those wasted on the illegible token, 1 on a mis-aimed crop rect) | complete; one value unreadable |
| `NAS6403-NAS6420 Rev 4.pdf` | 4 | 200 dpi, grey, skewed | **8** (4 full-page, 4 crops) | complete for two part numbers |
| `JPS00094 ... Rev C.pdf` | 37 | **has a text layer** | **0** | five criteria quoted verbatim |

Eight to eleven renders per photocopied standard, against the pitch_link
estimate of "about six for a 4-page standard" — that estimate holds for the
NAS6403 half if you exclude the two crops spent confirming `M`, which was a
deliberate second-reader check rather than a first read. Two observations that
bear on the automated-vision question:

1. **The renders are not the expensive part.** Deciding *which* crop to take is,
   and that decision needs the notes sheet read first. On MS9363 the whole
   question "is `G` the slot depth or the height below the slot?" — on which
   every derived number depends — was settled by one crop of the axial section,
   and no amount of table OCR would have answered it. An automated extractor
   that reads TABLE I perfectly and does not know what `G` measures produces
   confident garbage.
2. **Check the scan's resolution ceiling before choosing a zoom.**
   `doc.extract_image(xref)["width"] / page.rect.width` gives it: MS9363 is
   4.16, NAS6403 is 2.78. I burned two renders at zoom 16 and 30 on a token that
   was never going to resolve. This is the cheapest thing to know in the whole
   recipe and it is now in `docs/spec_library/README.md`.

Verdict, held loosely: automated vision is worth building for the **table rows**
of a family once a family is worth entering wholesale, and is not worth building
for the notes sheet or the figures, which is where all the meaning lives and all
the errors would be.

## What I could not read

Exactly one value, and it is not load-bearing:

**MS9363 sheet 2 requirement 1**, the first of two alternative material
specifications. It reads `CORROSION AND HEAT RESISTANT STEEL IN ACCORDANCE WITH
AMS <this> OR AMS 5737`. The token resolves to `AM` + gap + `5` + two characters
that fuse into one blob + a final digit. **AMS 5735 and AMS 5731 are both A-286
bar specifications and both fit the ink.** Recorded as `unreadable` with the
crop (`pdf_page 2, rect [315,178,380,189], zoom 16`), the ceiling note, and the
resolution (a fresh pull from assist.dla.mil; this copy was downloaded
2018-10-23). Not guessed. Both candidates are A-286, which is what 217755's
parts-list nomenclature already says, so nothing downstream is blocked.

Two further values are recorded with `confidence: "inferred"` because the number
is legible and the **meaning** is not: NAS6403/6404 column `U` (no definition in
words, no extension lines that settle it) and MS9363's unlabelled `.026/.006`
dimension at the bearing-face end. Both are flagged for another reader. Columns
`J` and `N` on NAS6403 sheet 1 were **not extracted at all** — undefined in
words, and `N` is printed with the smaller value on top, the opposite of every
other two-value column on that sheet, which is a second reason not to assume.

## Does MS9363 complete the pitch_link stack's `INCOMPLETE` checks?

**No. Neither of them — and one of them was never blocked on MS9363 at all.**
Stating this plainly because the handoff asked, and because the pitch_link
lesson's ranking implied otherwise.

- **`shank_out__11_sourced_only`** is blocked *solely* by the **pitch-link eye /
  spherical-bearing width** (intake row 2). MS9363 does not appear in that check.
  The binding requirement stands unchanged at **eye ≥ 8.1939 mm**. Rank 2 is now
  effectively rank 1 for that stack, and the queue says so.
- **`cotter_hole_clear_of_sourced_stack`** budgets for *pitch-link eye **plus**
  the nut's thread-start-to-castellation distance*. MS9363 closes the **axial**
  half of the nut term: the cotter hole must fall between `G` (.084/.104 in from
  the bearing face, the slot root) and `H` (.178/.198 in, the far face), and both
  are now sourced. The eye width still blocks it.

And the more consequential finding: **MS9363 does not supply the alignment
quantity at all, and nothing will.** The pitch_link lesson called it "the
governing check on every cotter-retained joint here" and ranked the document 1
for it. What MS9363 actually controls is slot-to-slot coincidence (within .005)
and slot axis to thread PD axis (within .005). It never relates a slot to where
the **thread starts** — and JPS00094 Rev C §5.9.7 footnote (a) says in as many
words that different nuts have different manufactured thread-start-to-
castellation spacing. So the phase is *uncontrolled*, not undocumented. No
acquisition closes it.

What that means for the repo: a cotter-retained joint can never be settled
analytically from documents. A stack can bound the window (grip such that the
cotter hole lands between `G` and `H`), and must then defer to the assembly
procedure §5.9.7 prescribes — try, and if it does not line up, change or add a
washer, capped at three by §5.5.3.a. **That is a design conclusion, and it
should be written into the SOP's castellated-nut caveat**, which currently
implies the gap is an acquisition problem.

What MS9363 *did* deliver, all three of the values the lesson asked for:

| | -09 (.190-32) | -10 (.250-28) |
|---|---|---|
| nut height `H` | .188 ±.010 in | .188 ±.010 in |
| slot count | 6 (indexing every 60°) | 6 |
| slot depth `H − G` | .094 in nominal | .094 in nominal |

`-09` and `-10` share `G`, `H` and `S` **exactly** — the .250-28 nut is no taller
than the .190-32 one, only wider across the flats. That is also a trap: a row
mis-registration between two adjacent rows is invisible in precisely the three
columns the document was acquired for. Both rows were re-read against the
table's block boundary.

## Surprises worth recording

- **Jeff's warning was wrong, and that is worth as much as if it were right.**
  "Another awful photocopy, good luck" — MS9363 is a clean 300 dpi bitonal scan
  and TABLE I read first time at `Matrix(8)`. The genuinely awful scan in this
  pair is `NAS6403-NAS6420 Rev 4.pdf` at 200 dpi, grey and skewed. Both
  calibrate the next estimate; only one of them was expected to.
- **MS9363 requirement 2 invokes MIL-S-8879**, the same standard NAS6403 sheet 1
  invokes for the bolt. One acquisition closes the thread form on **both halves**
  of every cotter-retained joint in this repo, and it is the only queued document
  that closes a recorded absence. Promoted in the queue on that basis; it was
  rank 4 as "the bolt's thread spec" and it is worth more than that ranking.
- **Sheet 3's footnote states the grip/length relation in words**: "Nominal
  length equals nominal grip plus 'T'". The pitch_link session inferred the
  relation from arithmetic (worksheet F5) and did not have the sentence. It is
  now a library value, which turns F5 from an observation into a citation.
- **Dimension `M`'s meaning is confirmed.** The pitch_link entry's highest-value
  open item — "read off the figure's extension lines, not from any text… for a
  second reader to confirm". A `Matrix(14)` crop of the pt rect `[340,108,400,185]`
  separates `M` from the neighbouring `X`, `Y` and `U` extension lines: `M`'s
  left terminus is the long vertical that runs down through the shank to the
  cotter hole's centerline, its right terminus is the point end face. Confirmed;
  the gap entry is closed and points at `U` as the next thing to confirm.
- **`JPS00094 §5.5.4` is a "should", not a "shall"** — "should have at least one
  thread of the bolt protruding through the nut". §5.5.5 next to it is a "shall".
  A protrusion check needs to know which it is quoting. Not previously recorded.

## Decisions and boundaries

- **Events are committed, the projection is not.** This inverts the usual `data/`
  placement and follows the same rule as the stack JSONs: hand-authored artifacts
  whose loss is unrecoverable get committed; `data/` contents are gitignored;
  the projection is a pure function of the events.
- **PyMuPDF stays out of `requirements.txt`**, per the existing precedent. All
  renders ran from drawing-checker's `venv-win`. Nothing was written into that
  repo.
- **`data/inbox/specs/` was not touched** — nothing renamed, moved, deduplicated
  or cleaned up. Read-only. Worth noting in passing: the directory now holds
  **64 entries** (52 PDF, 8 DOCX, plus an XLSX, a PPTX, the tracked `README.md`
  and `desktop.ini`), against the **42 files** that README records as having
  been moved in at founding. Append-only is working as designed; the README's
  count is a founding fact, not a current one, and should not be read as an
  inventory.
- **Out of scope and not touched**: `docs/SOP_TOLERANCE_STACK.md`,
  `docs/prompts/REVIEW_AGENT.md`, and the other twelve `hardware_entries.json`
  entries — all `sop_edits_apply`'s, which is running in parallel. The two
  existing tests in `test_tolerance_stack.py` that asserted `library_ref is None`
  on every entry had to change; one is now the general invariant (a filled ref
  means `values_status == "library"`, a null ref means it does not) rather than a
  blanket null.
- **Stack JSONs were not touched.** Completing `pitch_link` is a follow-up, and
  this lesson is what triggers it.

## What should happen next

1. **Acquire the pitch-link assembly drawing** (intake rank 2; part number
   unknown, candidates 215177 / 214849-003 / 216231-001). It is the single
   document standing between the repo and a complete `pitch_link` verdict.
2. **Acquire MIL-S-8879** (rank 4, promoted). It closes the thread-run-out
   absence on both bolts *and* the thread form on both nuts, and it is what makes
   JPS00094 §5.5.5 checkable rather than merely quotable.
3. **Amend the SOP's castellated-nut caveat** to say that the alignment phase is
   uncontrolled by MS9363 and by everything else, so the remedy is procedural.
   Right now the caveat reads as though a document would fix it. `sop_edits_apply`
   is mid-flight; this is a 15th edit for whoever picks it up next, not a
   late addition to that handoff.
4. **A follow-up handoff to rewrite `cotter_hole_clear_of_sourced_stack`** with
   the now-sourced nut window, and to promote the `MS9363-09`/`MS9363-10`
   hardware entries to `library_ref`. Both were deliberately left alone: stack
   JSONs are out of scope here, and the two nut entries have empty `used_by`
   lists, so promoting them would claim a consumer that does not exist.
