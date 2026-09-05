# Lesson — endstop_retrace_acquired_docs (worked 2026-09-04)

Handoff `HANDOFF_20260904_endstop_retrace_acquired_docs.md`, branch
`handoff/endstop_retrace_acquired_docs`, cut from `integration`. Deliverable:
re-trace the 23 rows `WORKSHEET_endstop_vision_baseline.md` scored blocked on
document acquisition (§4b, class B + class F), against seven newly-exported
drawing-checker drawings and two specs Jeff dropped into
`data/inbox/specs/`. Result lives in that worksheet's new §8, not in a new
file — this is a continuation of the 2026-09-01 baseline, not a fresh
experiment, so it extends the existing worksheet per the handoff's own
instruction ("update in place with dated correction blockquotes... or a
successor section").

## What changed

- `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`: new §8
  (re-trace, per-row disposition table, two new findings F8–F10, traced-ratio
  accounting, 3D-annotation evidence count), plus two short pointer
  blockquotes at §3a and §4b so a reader does not stop at the stale
  2026-09-01 figures.
- `docs/tolerance_stacks/README.md`: the worksheet's Contents-table row
  updated (4→5 traced, 2→3 distinct callouts, pointer to §8).
- `PROVENANCE.md`: that row's cell amended to match (insert-only — appended,
  nothing removed).
- `docs/spec_library/events/0004_nas1151_nas1158_2012_agent_manual_v0.json`
  and `0005_trelleborg_aerospace_2011_agent_manual_v0.json`: new `full` parse
  events for the two specs, subject-keyed (NAS1154 dash only; Trelleborg's
  Turcon Slydring piston/rod bearing section only) per the library's
  demand-driven design — not exhaustive reads of either document.
- `tests/test_spec_library.py`: `ALL_EVENT_FILES` extended; the library
  rebuild test's `events`/`subjects` sets extended; six new value-level tests
  for the two new events (NAS1154 shank vs. gage column, the family
  facts, Trelleborg identification, the deliberate non-trace of the 0.18 mm
  figure).
- `tests/test_spec_library_review.py`: the hardcoded document-set assertion
  extended with the two new filenames.

No `stack_*.json` touched — this worksheet still is not a stack (§0's
banner), and neither spec event is cited by any existing stack element, so
the SOP's actual traced-ratio headline (`debug_report_tolerance_stacks.py
--ratio`) is **unchanged**: 5/26 seeded, 30/59 all stacks, before and after.
What moved is the worksheet's own internal count (§8f): `located`
(`traced`+`convention-traced`+`mismatch`+`candidate`) from 15/43 (35%) to
**26/43 (60%)**; `traced` alone from 4/43 to **5/43**.

## Per-row disposition (the handoff's required table; full reasoning in §8b)

| rows | disposition |
|---|---|
| 41 | **traced** — resolved via an identity link (215176-002's parts list → 213668-002, already in hand) to a callout already read in the prior session |
| 38 | **convention-traced** — owner's own drawing carries both the general-tolerance block and the un-toleranced dimension |
| 23, 30, 33, 35, 49, 53, 55 | **mismatch** — identity established, drawing value disagrees with the workbook |
| 27, 39 | **candidate** — strong circumstantial match, identity not fully nailed down; not overclaimed |
| 31, 42, 45, 52, 59, 62 | **still blocked**, but with the owner refined one BOM level deeper (215198-001/-002, 214723-002, 213863-004) |
| 34, 36, 50, 54, 56 | **still blocked**, untouched — neither new document covers spherical-bearing (MS14101/MS14103) size |
| 63 | **identified, not traced** — "TB" confirmed as Trelleborg (page-number match, not a guess); the catalog gives a calculation method, not a single quotable clearance figure |

## 3D-annotation evidence count (deliverable 4): zero

Two of the newly-received drawings (215175-A, 212956-005-A) were read in
full and demonstrably don't carry a value six rows need — but that's a
measured absence against an **assembly** sheet one BOM level too shallow,
not against the correct final owner. Every piece-part drawing that plausibly
*is* a final owner (215071-C, 214700-002-A, and 213668-002 via the identity
link) carried an explicit, conventionally-toleranced callout for everything
this session looked for on it — right or wrong, but present. None of the six
new drawings uses the stronger "controlled by 3D DEFINITION" delegation
language `215735-A`/`212966-006` used in the prior session; only the routine
"used with model X" boilerplate every Joby release in this pipeline carries.
So this session's findings are acquisition findings, not 3D-surface ones —
worth stating plainly rather than inflating the 3D case with a session that
didn't add to it.

## Trelleborg identification verdict

Confirmed, not guessed. The workbook's row-63 comment says "based on TB
tolerances (catalog p~239)". `trelleborg_aerospace_gb_en.pdf` is 344 pages
with no printed-page-to-PDF-page correspondence given up front; its footer
runs exactly 2 behind the PDF page index (PDF page N → footer N−2, checked
against three consecutive pages). PDF page 241's footer reads "239", and
that exact page's heading is "Table I Turcon® Slydring® Piston and Rod
Bearing" — a piston/rod glide-ring bushing product line, which is what a
"gas spring bushing clearance" row would cite. The identification rests on
the page-number match plus the product-category match together, not on
either alone (a page-number match without a plausible product would be a
coincidence; a plausible product without the page match would be a guess).
The specific 0.18 mm figure was **not** recovered — the section gives a
bearing-exposure calculation formula (piston OD band, groove-diameter band,
bearing wall band → exposure band) and per-dash part tables, not a single
number, and reproducing 0.18 mm needs a dash/cross-section selection the
workbook doesn't state.

## Revision-drift findings

None. The handoff flagged that `215071` landed at rev **C** and `216231` at
rev **B.1**, not the `-001` the 2026-09-01 baseline's document list named by
part number alone. Both parts were previously **absent** (named but not in
hand) — there is no earlier-revision value on record to compare against, so
this is a citation-accuracy instruction (record C and B.1, which §8's
document table does) rather than a drift finding. Said explicitly here so
the next reader doesn't go looking for a comparison that doesn't exist.

## Surprises / things not obvious from the code or the handoff

- **Three of the seven "drawings" that arrived are BOM-level-too-shallow
  assemblies, dimensionless in exactly 217755's pattern (§2a of the prior
  session).** `215175-A` (tangential link mount) and `212956-005-A` (pitch
  anti-rotation link) both carry only parenthesized reference dimensions;
  their actual piece parts (`215198-001`/`-002` + `214723-002`; `213863-004`)
  are a level deeper and were **not** received. `215176-002-A` (lower gas
  spring body) is the same shape but resolved cleanly because its one piece
  part, `213668-002`, happened to already be in hand from the prior session.
  **If another acquisition pass happens, ask for the piece parts by their
  own numbers** (`215198-001`, `215198-002`, `214723-002`, `213863-004`) —
  asking again for "the tangential link mount" / "the anti-rotation link"
  would very likely return the same two assembly sheets already in hand.
- **A legitimate non-value-matching identity method: cross-reference a
  mating dimension.** `212956-005`'s spherical bearings are both called out
  `.1900 BORE ID` (= 4.826 mm exactly); `215071-C` has exactly one hole at
  that diameter. A pin through both is the only physical joint that explains
  an exact, non-round diameter shared between two independently-drawn parts
  — the same logic this repo already uses for NAS6403/MS9363, applied here
  for the first time to two *Joby* drawings rather than a bolt/nut pair. The
  value still didn't match (0.020 mm vs. the workbook's 0.01 mm) — identity
  and value agreement are separate questions, and conflating them is exactly
  what F6/F7 already warned against from the other direction.
- **A close-but-wrong number is a trap even when you're looking for it.**
  NAS1154's TABLE I has two candidate "size" columns: shank ⌀D (0.0254 mm
  band, functionally correct — it's what sits in the clearance hole) and
  gage ⌀C (0.0102 mm band, numerically far closer to the workbook's 0.01 mm).
  Picking the gage column because the number is closer would repeat F6/F7 in
  a new document. Recorded both, adopted neither by number — shank by
  function, with the rejected alternative kept visible in the event's own
  note field.
- **`data/inbox/specs/NAS1151- NAS1158.PDF`'s text layer is OCR garbage, not
  a clean digital layer.** Character-level extraction returns things like
  "Jj iASIC" for "BASIC" and misreads adjacent-row digits into the wrong
  cell. Every value in event 0004 was confirmed against a rendered crop of
  the actual TABLE I page, never against `--pattern` output on this
  document — the opposite of the Trelleborg catalog (`trelleborg_aerospace_
  gb_en.pdf`), which is a clean born-digital catalog where the text layer
  was trustworthy and no rendering was needed.
- **The Trelleborg catalog's printed page number runs exactly 2 behind its
  PDF page index** (checked on three consecutive pages: PDF 239→footer 237,
  PDF 241→footer 239, PDF 242→footer 240). A citation like the workbook's
  "catalog p~239" is a *printed* page number; resolve the offset before
  concluding a page reference is wrong.
- **Did not add rows to `docs/spec_library/intake_queue.json` for either new
  spec.** That queue's `stacks` field names the three actual SOP stacks
  (`pitch_link`, `tan_link`, `vpa`); neither NAS1154 nor the Trelleborg
  catalog closes a gap in any of those three today — they inform this
  worksheet, which is not a stack. Adding a row would also have required
  extending `test_the_queue_holds_every_row_the_pitch_link_lesson_ranked`'s
  hardcoded `range(1, 13)`, which is a real guard, not a formality, for a
  queue this session has no ranking basis to extend correctly. Left alone
  deliberately — flag if a future session gives NAS1154 or Trelleborg a
  reason to matter to one of those three stacks specifically.
- **A pre-existing intake-queue oddity, not touched or fixed:** rank-7's row
  (`212956-005 anti-rotation link assy`, for the `tan_link` stack) has
  `closes: ["212956-005"]`, which can only read `entered` once a
  `spec-parse/v0` event exists naming a library subject `"212956-005"`. But
  `spec_library`'s events are scoped to `data/inbox/specs/` (per its own
  README and module docstring); `212956-005-A.pdf` lives in
  drawing-checker's `data/inbox/drawings/`, a different pile entirely, read
  via `source_ref.kind: "drawing"`, never through the spec library. This
  session read that drawing (for the endstop worksheet's own rows 31/52,
  scored above) without writing a spec-library event for it, and the rank-7
  row stayed `missing` — which it already was before this session, for the
  same structural reason. Not filed as an issue: it may be an intentional
  gap (nobody has needed rank 7 to resolve yet) rather than a defect, and
  fixing "how does a Joby drawing's value get into the spec library" is a
  design question bigger than this handoff's scope.
- **`tests/debug_trace_stack_values.py --crop` renders the whole page cleanly
  when the requested half-width exceeds the page bounds** — clamped, not
  errored. Useful for a first look at an unfamiliar sheet before zooming into
  a specific feature; every drawing in this session was read that way first.
- **The `217755` find-number/BOM identity chain got one link stronger, for
  free.** `216231 B.1 HUB AND BLADE ASSEMBLY, PROPELLER.pdf`'s own parts list
  balloons `215071-001`/`215071-002` (the pitch arm) directly — the actual
  (non-bird-strike) assembly, not the `555786-001` lateral hop the prior
  session used. That removes the "identified only off-path" caveat for the
  pitch arm specifically (§2c / requirement 7). It does **not** balloon
  `212966-006` (the hub piece part) directly — it balloons a sub-assembly
  (`216135-001` through `-005`) one level short of the hub, so the hub's own
  off-path caveat is unchanged.

## Drawing-checker read-only invariant

`scripts/snapshot_drawing_checker.py`, before opening anything and after:

- before: **5651** entries, `2026-09-05T01:30:03Z`
- after: **5767** entries, `2026-09-05T01:58:10Z`
- **diff: 116 added, 0 removed, 0 modified** — not empty, and explained below
  rather than treated as automatically fine.

Every added entry is under `data/runs/`, in two run directories:
`20260904_184249_216231_B.1_HUB_AND_BLADE_ASSEMBLY,_PROPELLER/` and
`20260904_184440_217262-A/`. Both carry a `run_meta.json` with
`"purpose": "eager"` and a `pipeline_commit` — drawing-checker's own
automated eager-ingestion pass (`scripts/eager_pass.ps1` /
`install_eager_task.ps1`, both present in that repo's `scripts/`), which
picks up newly-dropped PDFs on its own schedule. Both run IDs' local
timestamps (2026-09-04 18:42–18:44) are the two PDFs *this handoff itself*
named as newly landed (`216231 B.1...` and `217262-A.pdf`) — nobody in this
session invoked drawing-checker's pipeline; `tests/debug_trace_stack_values.py`
is the only tool this session ran against that repo, and it only reads and
renders to a path the caller supplies (this session's own scratchpad,
every time). Zero entries under `data/inbox/drawings/` (the read-only PDFs
themselves) changed.

## Verification

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`:
  **581 passed, 1 skipped** (the pre-existing node-fs viewer skip) — after
  the two new spec events, the projection rebuild, the worksheet/README/
  PROVENANCE edits and the two hardcoded-list test updates
  (`test_spec_library.py`'s `ALL_EVENT_FILES` and library-subjects set,
  `test_spec_library_review.py`'s document-set assertion).
- `python -m tolerance_stack --data-root C:\workspace\tolstack\data`: rebuilt
  cleanly, 14 subjects from 5 events (up from 11/3).
- No `ARCHITECTURE.md` module-inventory row needed — no new module, only two
  data files and worksheet/doc prose.

## Left for the next session

- Acquire `215198-001`, `215198-002`, `214723-002` and `213863-004` by their
  own part numbers (§8d) — the cheapest remaining move on this stack.
- Rows 34/36/50/54/56 need the `MS14101`/`MS14103` spec sheets (spherical
  plain bearings), not Trelleborg — still entirely unacquired.
- Row 62's owner is a hypothesis (`214723-002`), not a confirmed identity —
  worth a second look once that part's own drawing exists to check against.
- F9 (row 30's 0.020 mm vs. the workbook's 0.01 mm, a plausible
  ±-vs-total-width transcription slip) and F10 (NAS1154's column choice) are
  **Jeff questions**, alongside the still-open F4/F5 from the prior session —
  none resolved by fiat here, per the same discipline.
