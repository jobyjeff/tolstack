# LESSONS 2026-08-13 — spec_pile_gap_join

Handoff: `docs/sessions/active/HANDOFF_20260813_spec_pile_gap_join.md`.
Two phases: build the join tool (report-only), then clear the backlog it finds.

## The traced ratio: before and after

**Unchanged. 5 of 26 element instances across the three seeded stacks are
`traced` (3 `inferred`, 18 `untraced`); 21 of 48 across all stacks.** Same
before and after this session, verified with
`tests\debug_report_tolerance_stacks.py --ratio`, which is the one command any
document quoting the ratio points at.

The handoff expected it to move, and it is worth being precise about why it did
not, because "the number did not move" is the finding:

* the brief's eight-row table was **already closed** — every row of it was
  re-cited by `pitch_link_stack` (08-04), `traced_labels_and_ratio` (08-06) or
  `fastener_citations_and_confidence` (08-10). The brief was describing a debt
  that its own third handoff had paid off the week before;
* of what the join found still open, the two `MS9363` entries were closable in
  the **spec library** sense only — the numbers were read on 08-05 and live at
  library subjects `MS9363-09`/`-10`, but neither entry has an element citing it
  (`used_by` is empty), so nothing in a stack changes and no instance is
  relabelled; and
* the two `NAS77` rows went the other way entirely: the document was there, was
  read, and **falsified the part number** rather than sourcing the value.

So the ratio was never understated by this mechanism. It was understated by the
*labelling* mechanism the 08-06 correction fixed, and that is a different bug.
A tool that finds nothing is doing its job as long as you can see it looked —
which is why sections 2, 3 and 4 of the report exist.

## The allowlist seed — and the second category nobody predicted

`KNOWN_NON_MATCHES` in `tests/debug_report_spec_pile_gaps.py` is the list a
failing check would need first. It ended the session with rows in **two**
categories, and the second was not anticipated by the brief:

**(a) Read, does not close the gap.** The handoff named the first entry:

* `tan_link:thread_transition` × **NAS6403** — NAS6403 is in the pile and does
  not dimension the thread run-out (sheet 1's `T (Ref)` is the whole thread
  region; `X`/`Y` are locking-element pitch counts). Decided 08-10, value
  unchanged. **MIL-S-8879 closes it and is not in the pile.**
* `vpa:straight_bushing` × **NAS77**, and the same for
  `hardware_entries.json:NAS77A4-015` — new this session, and the sharper shape:
  the pile answered **in the negative**. NAS77 is the unlined *flanged* series;
  the as-drawn part is a plain bushing; and the dash rule printed on the page
  ("Length in .010 increments") makes `NAS77A4-015` **.150 in** long where the
  workbook folds .1875 in. Its length tolerance is `L ±.005 in`, not the ±.002
  in that 4.71/4.81 mm implies.
* the same pair × **NAS76** — the straight series, the page before NAS77 in the
  same catalogues, checked because it is the shape the part actually is. It decodes
  its dash in **32nds** (`-025 = .7813 in`) and controls length `+.000/−.005`,
  so it does not source the value either. (.1875 in is 6/32, i.e. a `-006`
  dash — an observation, not an identification.)

**(b) Already cited.** Eleven of the sixteen allowlist keys. A well-written
closed gap **keeps naming the
document that closed it**, so the join keeps offering it. Writing this session's
corrections *created five new candidate keys — seven new rows — in the tool's own
next run* (11 keys / 15 rows against the pre-work prose, 16 / 22 after; corrected
in review 2026-08-13, where it said "three"). The
better the prose, the noisier the report. This is the single most important
input to the enforcement decision below, and nothing in the brief predicted it.
Re-derive it rather than quoting it: run the join with `KNOWN_NON_MATCHES`
cleared against `git show master:docs/tolerance_stacks/` and against the working
tree, and diff the `(gap id, designator)` key sets.

## Should the tool graduate to a failing check? Evidence, not a recommendation

Strategy deferred this. What the session learned that bears on it:

* **The join is trustworthy.** Range parse pinned from both sides on real pile
  filenames, plus the near-misses that must not parse as ranges (a dash number,
  a revision letter, a year). No false positive survived to the report.
* **But "gap names a document that is in the pile" is not a defect predicate.**
  Of the 22 pairs the join finds today, **zero** are work. A check on that
  predicate would fail the suite on all 22 until every one was allowlisted, and
  would then fail again every time somebody wrote a good correction — category
  (b) grows monotonically with the quality of the gap prose.
* **A better predicate exists but needs a field this repo does not have.** The
  honest question is not "is the document present" but "has anyone *looked* at
  it for this gap". That is a per-(gap, document) reading event. The spec
  library already stores reading events per document; nothing stores the
  negative result — "read it for this gap, it does not give it" — except, now,
  `KNOWN_NON_MATCHES`, which is a Python dict in a debug tool.
* **Suggested shape if strategy wants the check**: promote `KNOWN_NON_MATCHES`
  and `EXTRA_COVERAGE` out of the tool into data (`docs/spec_library/`, beside
  `intake_queue.json`, where `in_pile` already lives), give each row an event
  id and a date, and *then* fail on "candidate pair with no row". At that point
  the check is asserting something real: **nobody has looked at this document
  for this gap**. Before that it asserts a filename match.

## Gotchas the next agent cannot derive from the code

* **`data/inbox/specs/` holds 64 entries, 62 of them documents the join reads**
  (it skips the tracked `README.md` and `desktop.ini`) — not the 42 that
  `data/inbox/specs/README.md` records as moved in at founding. That is a
  founding fact, and `intake_queue.json`'s provenance block already warns about
  it. Count from the filesystem.
* **Three RBC catalogue PDFs, two of which lie in their filenames — and they do
  not paginate alike.** `RBC - Plain bearings (NAS77 p92).pdf` (© 2008, 2011,
  2016) carries NAS76 on pdf page 93 / printed 91 and NAS77 on pdf 94 / printed
  92, plus MS14237, MS14238, AS81934 and the EN series;
  `RBC_Aerospace_Plain_Bearings_Web.pdf` (© 2008) names **no** standard at all
  and carries the same two tables six printed pages later — NAS76 on pdf 99 /
  printed **97**, NAS77 on pdf 100 / printed **98**, which is the page
  `JB_NAS77.pdf` is a one-page extract of. This session's prose said "p91/p92 of
  both catalogues" throughout and was wrong about the second one; corrected in
  review 2026-08-13. Address a page by its *table*, not by a number copied from
  its sibling edition. The tool's
  first run duly reported "NAS76: nothing in the pile" on the afternoon NAS76
  was read out of that file. `EXTRA_COVERAGE` exists because of that hour; add
  a row whenever you open a pile document and find a standard its name does not
  admit to.
* **The RBC catalogues and `JB_NAS77.pdf` have real text layers.** They are
  born-digital vendor catalogues, not the photocopied MIL scans the SOP's crop
  recipe was written for. `page.get_text()` gives the whole dimension table.
  The renders were still read by eye before citing (the SOP's rule is about
  what you may claim, not about which extraction you ran), but do not budget
  crop-reading time for these three.
* **PyMuPDF is not in tolstack's `venv-win`** and deliberately so
  (`requirements.txt`). Render with drawing-checker's:
  `C:\workspace\drawing-checker\venv-win\Scripts\python.exe`.
* **Worksheet gap tables are the tool's blind spot.** The join reads the stack
  JSONs and `hardware_entries.json`. It does **not** read
  `WORKSHEET_*.md`, and three of this session's four false claims lived there —
  `WORKSHEET_pitch_link` said *"MS9363 ... (absent from `data/inbox/specs/`)"*
  and *"MS9363 is not in the pile"* in two places, and the tan-link and VPA
  worksheets both still listed MS9363 as intake row 2. Found by grep, not by
  the tool. Either teach the tool to read the worksheets' source-gap tables or
  keep grepping; do not assume a clean report means clean prose.
* **`MS9363-09`/`-10` are deliberately *not* promoted to `values_status:
  "library"`.** The reason is recorded in
  `tests/test_spec_library.py::test_only_the_one_entry_was_promoted`'s
  docstring: no stack consumes them. It is easy to read the corrected gap prose
  ("the numbers are in the library") and conclude the promotion was forgotten.
  It was declined, twice.
* **`MS9363`'s real remaining gap is a non-acquisition.** The stale clause
  equated the missing nut geometry with "the thread-start-to-castellation
  spacing". Those are two different things: the geometry is printed on sheet 1;
  the *phase* is controlled by nothing (requirement 10 relates slots to each
  other and to the thread PD axis, never to the thread start), so no scan and no
  further document closes it. `ARCHITECTURE.md` already said this correctly —
  the entry prose had simply not caught up.

## Left undone (for strategy, not for me)

* **`intake_queue.json` has no row for `214943-002`**, which is now the sole
  closing document for two open questions (`vpa:straight_bushing` and
  `hardware_entries.json:NAS77A4-015`) and is the only thing standing between
  them and a traced value. Ranks 5 and 6 cover the *other* two bushings. Adding
  it is a one-row change to a guarded file and belongs to whoever owns the
  queue.
* **The queue's `in_pile` flags are all correct** as of today, checked against
  the join. Its rank-10 row (`NAS6403-NAS6420 sheet 5 of 5`) is `in_pile: false`
  about a document that *is* in the pile, which is right — the absence is at
  **sheet** granularity and the join only works at document granularity. A
  check would need to know that distinction exists.
* **Ten gaps name no document at all** (report section 4) — six bushing/nut
  geometry terms in the take-2 stack among them. They cannot enter the intake
  queue because nobody has said what would close them. That is a gap-prose
  problem, not a pile problem, and it is the largest single block of
  `untraced` instances left in the repo.
