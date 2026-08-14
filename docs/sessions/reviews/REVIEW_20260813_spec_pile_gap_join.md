---
type: review
handoff: docs/sessions/active/HANDOFF_20260813_spec_pile_gap_join.md
reviewer: review agent (review/spec_pile_gap_join)
date: 2026-08-13
verdict: APPROVE
blockers: 0
---

# Review — spec_pile_gap_join

Two commits on `handoff/spec_pile_gap_join` (`69169cc` phase 1, `b23b6ed` phase 2):
a new report-only join tool (`tests/debug_report_spec_pile_gaps.py`, 763 lines),
43 value-level tests, and the gap-prose backlog it found — four
`hardware_entries.json` gaps, one stack `source_ref.note`, three worksheets, the
issue closed, PROVENANCE amended.

**Verdict: APPROVE.** No unsourced number, no invented tolerance, no arithmetic
touched. Four should-fix items were fixed inline on the review branch (below);
none of them was a blocker and none changed a value, a band, a `confidence` or a
decision.

---

## The seven mandatory checks

This work is **not a stack**. It authored no element and no check; the one stack
file it touched (`stack_vpa_output_to_pitch_plate.json`) gained prose in a single
`source_ref.note`. Checks 2, 2b, 3, 4, 5 and 6 have no new subject, so what I
verified instead is that they *stayed* true — mechanically, in both directions.

### 1. Every tolerance traces to a specification or drawing callout — **PASS, and this is the check the work is about**

The interesting property is that **no value was re-labelled at all**, in either
direction, and that is the correct outcome. I re-read every document the session
claims to have read:

| claim | where I checked it | verdict |
|---|---|---|
| MS9363 sheet 1 TABLE I row `-09`: `H .178/.198`, `G .084/.104`, `S .073/.088` | rendered sheet 1 at zoom 2.5 and read the table | **exact** |
| row `-10`: identical `H`/`G`/`S`, thread `.250-28` | same render | **exact** |
| row registration (`-09` vs `-10` are indistinguishable in `H`/`G`/`S`) | `A` `367-376` vs `430-439`, `⌀C` `190-210` vs `250-270`, mass `0.37` vs `0.51` — all four discriminate, all four match the library | **confirmed** |
| slot count `6 PLACES` | hex-face view, `⊕ .005 (I) 6 PLACES` | **exact** |
| requirement 10 relates slots to each other and to the thread **PD** axis, never to the thread start | rendered sheet 2, read requirement 10 verbatim | **confirmed** |
| NAS6403-NAS6420 sheet 1, NAS6404 row: `M = .180/.160`, `P = .086/.076` | rendered sheet 1 | **exact** |
| NAS6403 row `M = .174/.154`, `P = .080/.070`, `T (Ref) = .323` | same | **exact** |
| NAS77 is the unlined **flanged** series; `L ±.005`; dash rule "Length in .010 increments (ex: -025 = .25 in.)" | text layer of `RBC - Plain bearings (NAS77 p92).pdf` p94 and `JB_NAS77.pdf` | **exact** |
| NAS76 is the straight series; `L +.000/-.005`; dash rule "First digit in whole inches, last two in 32nds (ex: -025 = .7813 in.)" | same catalogue, p93 | **exact** |
| ⇒ `NAS77A4-015` is .150 in, `NAS76A4-015` is .46875 in, neither is the .1875 in folded | arithmetic on the printed rules | **holds** |

The `NAS77` decision is the strongest thing in this handoff and it is right: the
pile **answered in the negative**, the element stayed `kind: workbook` /
`untraced` with the value unchanged, and the finding went into the note. Re-citing
would have swapped an untraced number for a wrong one. That is the SOP's one rule
working.

One correction, fixed inline — see should-fix #2: the *page addresses* for the
second RBC catalogue were wrong (see below). The readings themselves were not.

### 2 / 2b / 3 — Signs, coherent corners, LMC/MMC — **PASS (unchanged, verified mechanically)**

No term, sign, coefficient, `lmc`/`mmc` or path moved. Verified two ways rather
than by reading the diff: stripping `source_ref`/`note`/`gaps`/`description` from
both changed JSONs and comparing structures against `master` gives **identical**,
and `debug_report_tolerance_stacks.py` prints **byte-identical** output before and
after (the only diff in my capture was my own terminal's `±` encoding).

### 4. RSS actually computed — **PASS (unchanged)**

Same evidence: every check row in the report is byte-for-byte the same.

### 5. Nominal inside its own min/max — **PASS (unchanged)**

No `nominal`, `min` or `max` field changed anywhere on the branch.

### 6. Quantised constraints where cotter/castellation hardware appears — **PASS, and strengthened**

This is the check the handoff moved. It did **not** weaken the caveat by closing
the acquisition: `WORKSHEET_pitch_link`'s F8 correction, the tan-link gap row 2
and the VPA gap row 2 all keep the governing conclusion and sharpen its reason —
the joint needs the *thread-start-to-castellation phase*, MS9363 requirement 10
does not control it, so it was never an intake item and the remedy is JPS00094
§5.9.7. I checked the placement clause (the trap from
`fastener_citations_and_confidence`): the tan-link worksheet's blockquote under
the Checks table is untouched and still carries the caveat, and the pitch-link
correction sits **inside** the F8 section it corrects rather than in a gaps list.
A reader standing at the numbers still sees it.

### 7. The traced / inferred / untraced ratio — **PASS, re-derived by me**

Run from the merged tree with `tests\debug_report_tolerance_stacks.py --ratio`:

> **5 of 26 element instances across the three seeded stacks are `traced`;
> 3 are `inferred` and 18 are `untraced`. 21 traced / 7 inferred / 20 untraced
> out of 48 across all stacks.**

**Unchanged by this handoff**, which is what the lesson says and is the honest
result: nothing in the pile closed a still-open gap. Non-element values are
unchanged too (no material, temperature or stiffness value was touched).

Every `untraced` value still appears in its stack's listed gaps — and this
handoff is the first work here that made that checkable by machine rather than by
eye. Report section 4 ("names no document") lists the **ten** gaps that name no
closing document at all; the lesson flags them as the largest remaining block.
That is a finding about gap prose, correctly not fixed here.

---

## Did the new thing actually work? — **yes, observed biting**

The deliverable is a reporter, so "green" proves nothing. Three probes:

1. **Against the pre-work tree.** Running the join over
   `git show master:docs/tolerance_stacks/` with `KNOWN_NON_MATCHES` cleared
   surfaces **15 candidate pairs** — including every row this handoff then went
   and cleared (`MS9363-09`/`-10` × MS9363, `NAS77A4-015` and
   `vpa:straight_bushing` × NAS77, `MS24665-229` × NAS6404). The tool finds the
   thing it was written to find, on the data that had it.
2. **Against the merged tree**: 0 candidates, 22 checked non-matches, 16
   designators with nothing in the pile, 10 gaps naming no document. Backlog
   genuinely clear.
3. **The worktree skip is loud**, and I got it from a real worktree: `pile is
   None`, the banner, the main-checkout path and two working commands. Running
   it from the main checkout prints the join. DoD met.

The range parse is sound on live data: I dumped what each of the 62 pile
documents parses to and every one is right, and probed the designator reader with
15 adversarial strings (`"6 PLACES"`, `"3 places"`, `"within .005 of thread PD
axis"`, `"an 8 mm bolt"` → nothing; `"NAS6403 thru NAS6420"` → one document, not
two). No false positive reaches the report.

---

## Also verified

- **Tests.** `420 passed, 1 skipped` in this review worktree after my inline
  fixes (`418 passed, 1 skipped` as the branch arrived; the 2 are tests I added).
  Re-run in the **main checkout** after the merge — see the integration note at
  the end. `tests/test_spec_pile_gap_join.py` alone: 45 (43 as delivered).
- **JS suite with the `[real]` tier running**: `122/122` via
  `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`, against a
  freshly rebuilt projection.
- **Projections rebuilt** (`build_viewer_projection.py --data-root
  C:/workspace/tolstack/data` and `python -m tolerance_stack --data-root ...`)
  and diffed key by key. The only differences are `built_at`, the `provenance`
  block, and the four prose strings this handoff changed. **No other stack
  regressed and no number moved.** Note for whoever comes next: the handoff's own
  build stamped `branch: master @ 8121368`, so the committed projection predated
  the work — the ancestry gate did not object because that commit *is* an
  ancestor. Rebuild after merging.
- **A sibling handoff landed on `master` mid-review** (`97afc04`, a review-report
  edit only). Merged into the review branch and the suite re-run there, per the
  overlay. No conflict.
- **PROVENANCE.** `test_provenance.py` green. I read the four amended cells
  against the actual diff rather than trusting them: the "no numeric field
  changed" claims on `stack_vpa_output_to_pitch_plate.json` and
  `hardware_entries.json` are **true**, verified by the structural strip and the
  byte-identical report above. My own four inline edits are recorded in the same
  rows.
- **`data/inbox/specs/` untouched** — 64 entries, no rename, no deletion, nothing
  added; no `data/` or `.gitignore` change on the branch at all.
- **Nothing written into drawing-checker.** The handoff recorded **no snapshot**
  (nit #5). I reconstructed it: the only 2026-08-13 activity there is run
  `20260813_131929_217755_A.1...` (`ts` 20:19:48Z, `purpose: "user"`) and the
  inbox drawing it consumed, both **~3¼ hours before this session's first commit**
  (23:34:53Z) — so neither can be its output, and both are Jeff's. My own
  before/after snapshot over the review window is **EMPTY**.
- **Counts in the new prose.** `hardware_entries.json`'s description gains a
  clause but no digit; every count it states is unmoved and
  `test_hardware_entry_values_source_counts_match_the_description` and
  `test_no_live_document_states_an_unguarded_hardware_entry_count` are green. The
  lesson's *"64 entries, 62 documents"* is exact. *"Eleven of the sixteen
  allowlist keys"* is exact. *"22 pairs, zero are work"* is exact. One count was
  wrong — should-fix #1.
- **No harness artifacts** (`</invoke>`, `</content>`, `<parameter`) and no NUL
  bytes in the created files; `tail` on each is clean.
- **`docs/reference/` untouched; `CLAUDE.md` unchanged; no `{{` placeholders.**

---

## Findings

### Should-fix — all four fixed inline on `review/spec_pile_gap_join`

**1. `LESSONS_…md`:60 — the lesson's own headline count does not reproduce.**
*"Writing this session's corrections created **three** new candidate rows in the
tool's own next run."* Re-derived by running the join with `KNOWN_NON_MATCHES`
cleared against the pre-work tree and against the working tree: **11 keys / 15
rows → 16 keys / 22 rows**, i.e. **five** new `(gap, designator)` keys and
**seven** new rows. Neither reading gives three. It sits in the sentence the
lesson calls "the single most important input to the enforcement decision", and
it is a figure one command re-derives — the sixth sighting of this repo's
stale-count class, and the first where the stale number was about the handoff's
*own reporter*. **Fixed:** corrected to five/seven with both figures and the
reproducing recipe written beside it.

**2. Six places cite a page that exists in one copy of the document and not the
other.** The pile holds the RBC plain-bearing catalogue **twice**:
`RBC - Plain bearings (NAS77 p92).pdf` (© 2008, 2011, 2016) and
`RBC_Aerospace_Plain_Bearings_Web.pdf` (© 2008). The same NAS76/NAS77 tables are
printed pages **91/92** in the first and **97/98** in the second — six pages
apart. The handoff wrote *"page 92 of both RBC plain-bearing catalogues"* and
*"NAS76 … page 91 of the same catalogue"* into `EXTRA_COVERAGE`, four
`KNOWN_NON_MATCHES` reasons, `hardware_entries.json`'s corrected `NAS77A4-015`
gap, `stack_vpa_output_to_pitch_plate.json`'s note, the VPA worksheet's F13
blockquote and its gap row 7, and the lesson. It is right about the file that was
opened first and wrong about the other two. (`JB_NAS77.pdf` is a one-page extract
of the 2008 edition's printed **p98** — the lesson gets that one right, which is
what made the mismatch findable.) **Nothing about the readings is affected**; this
is a citation address that does not lead there, which check 1 grades harshly on
purpose. **Fixed:** `EXTRA_COVERAGE` now carries the true per-file pages with a
comment saying the editions do not paginate alike; every other site now names the
*table* rather than a page number borrowed from the sibling edition. PROVENANCE
rows amended.

**3. `_as_range`'s digit-count guard is documentation — deleting it leaves all 43
tests green.** Two tests name it as the rule that rejects their input and neither
is true: `MS9363-09` dies on `hi > lo` (9 is not above 9363), and
`MIL-STD-889D-2021` **never matches `_RANGE` at all** because the revision letter
`D` sits between `889` and the dash, so no guard runs. The guard's real case — a
*wider* low end, `MS9363-99999` — was untested. **Fixed:** both docstrings
corrected to say which rule actually fires, `_as_range`'s docstring rewritten,
and a test added that exercises the digit-count rule at `_as_range` (where the
rule lives) rather than at `parse_coverage` (which would pass for the wrong
reason).

*And what the surviving guards still let through, reported not fixed:*
**`NAS1121-2025` parses as the 905-wide range NAS1121–NAS2025.** A four-digit
basic number and a four-digit year, ascending, satisfies all three rules. No file
in the pile hits it today (I checked all 62), but `NAS1121 THRU 1128_REV_14.pdf`
shows the pile carries year-and-revision suffixes, so one re-export away it
would — and the tool's own docstring says a range matching too much is worse than
no range. Rejecting it needs a rule nobody has chosen (a span cap? a year test?),
which is a design call rather than a review fix. **Pinned** by
`test_a_four_digit_year_after_a_four_digit_basic_number_is_a_known_hole` and
recorded in `_as_range`'s docstring, so whoever picks the rule sees the line go
red instead of finding the hole a third time.

**4. The tool is named nowhere a future agent would look.** Every other
`debug_report_*` tool is in `docs/tolerance_stacks/README.md`'s Regenerating
block and/or the SOP; this one lived in its own docstring, a lesson and the closed
issue — the "a durable operational fact that dies with the session" class. Given
the whole issue was *"nothing sweeps the pile"*, a sweeper nobody is told to run
is a partial fix. **Fixed:** added to the Regenerating block with the two
occasions to run it (a document lands; before writing a gap that calls a standard
absent) and the main-checkout caveat. PROVENANCE row amended.

### Nits (not fixed)

1. **The two catalogues print *different* dash-decode examples.** The 2016
   reprint says *"Length in .010 increments (ex: -025 = .25 in.)"*; the 2008 web
   edition says *"… (ex: -025 = **.025** in.)"*, which contradicts its own
   ".010 increments". The handoff quotes the 2016 text, which is the
   self-consistent one and gives the .150 in that carries the argument — so the
   conclusion is unaffected, but the prose says "the rule printed on the page" as
   if there were one page and one wording.
2. **Two pile documents parse to nothing and nobody has opened them** —
   `GAELQIAAAAAAAAAA.pdf` and `PXJHJBAAAAAAAAAA.pdf`. Exactly the
   `EXTRA_COVERAGE` case the lesson names for the RBC web catalogue, and the
   lesson does not name these two. Whoever opens them should add rows.
3. **A silent miss in the designator reader: an underscore separator.**
   `SAE_AS_5857_Gland_Design_Rev_A.pdf` parses to no designator because
   `_DESIGNATOR` allows `[-\s]?` and not `_`, while `SAE_AS4716_Glands_RevC (2).pdf`
   parses fine. No gap names AS5857 today, so nothing is wrong now — but a miss
   is the silent direction.
4. **`_DESIGNATOR` is case-sensitive while `_RANGE` is `IGNORECASE`.** Lowercase
   `nas6403` in a gap note is invisible to the first and visible to the second.
   The repo's prose is uppercase throughout, so this is latent.
5. **No drawing-checker snapshot was taken or reported.** SOP Steps 0/8 and the
   overlay call an absent diff a finding because it cannot be reconstructed
   afterwards. I reconstructed enough to close it (see above) and it came out
   clean, but that only worked because the session cited no new run.
6. **`MS24665` and `NASM24665` appear as two intake-queue rows for one gap.** The
   `-153` entry's prose names both spellings of one standard; the join has no
   synonym table. Cosmetic, but the intake queue is what someone reads to decide
   what to buy.
7. The `MS9363-10` prose says the dash number "carries only the thread size
   (requirement 11)". Requirement 11 says the dash comes from TABLE I; the dash
   does also select `A`, `B`, `⌀C`, `⌀D`. The load-bearing claim (`H`/`G`/`S` are
   identical on `-09` and `-10`) is read straight off the table and is correct.
   Same wording shipped in the 08-05 library event.

---

## Note for the next reviewer

- **The allowlist grows with the quality of the prose, and that is the finding.**
  A well-written closed gap keeps naming the document that closed it, so it keeps
  reappearing as a candidate. The lesson's evidence for deferring enforcement is
  sound and I agree with it: today **zero** of 22 pairs are work, so a check on
  "gap names a document that is in the pile" would fail the suite on all 22 and
  then fail again on every good correction. If strategy wants the check, the
  lesson's suggested shape (promote `KNOWN_NON_MATCHES`/`EXTRA_COVERAGE` into
  data beside `intake_queue.json`, with an event id and date per row, and fail on
  "candidate pair with no row") is the right predicate — *nobody has looked at
  this document for this gap*, rather than *this filename matches*.
- **`intake_queue.json` still has no row for `214943-002`**, now the sole closing
  document for two open questions. The lesson flags it as left undone for
  whoever owns the queue; it is a one-row change to a guarded file.
- **The tool cannot see the worksheets.** Three of this session's four false
  claims lived in `WORKSHEET_*.md` gap tables and were found by grep, not by the
  tool. A clean report is not clean prose.
