# LESSONS 2026-09-02 — doc_coverage_sets_derived

Two guards whose coverage set was a hand-kept literal, so an unlisted document
or passage was **invisible** rather than unpaired. Both are derived now, one of
them only half — and the half that stayed curated is the interesting finding.

## Before / after, in numbers

| set | before | after |
|---|---|---|
| traced-ratio **stale** half (`asserted_stale`) | 11 documents, hand-kept literal | **44** — `live_documents()`, derived |
| traced-ratio **missing** half | same 11-entry literal | **11** — `traced_ratio_publishers()`, still curated, argued, size-asserted |
| one-fold rule passages | **3** — `RULE_PASSAGES`, hand-kept dict | **15** found by `rule_statements()`, of which **3** carry the anchor and are paired |
| absolute-form passages corrected | — | **3** (all in `tolerance_stack/stack.py`) |
| tests | 570 passed / 1 skipped | **576 passed / 1 skipped** |

The 44 is the same in the worktree and the main checkout, which was not obvious
and is worth knowing: the only documents under `data/` that `live_documents()`
would see are two `PROVENANCE.md`s, and `_HISTORICAL_NAMES` already drops them.
So a count over this walk is stable across checkouts — a floor over it more so.

## Feasibility, per deliverable 1

**`live_documents()` was never the hand-kept thing.** The issue's title says the
traced-ratio doc scan walks a hand-kept list, and it does — but the list was the
scan's own five-entry `live_docs` literal, two hundred lines *above* a perfectly
good `os.walk` in the same file that two other scans already used. The fix was
not to write a derivation; it was to notice the derivation already existed and
that definition order had hidden it. `live_documents()`, `_prose_blocks()` and
the `_HISTORICAL_*` constants moved up to sit above their first caller, which is
exactly the move `_quoted_spans` made on 2026-08-17 for the same reason.

**Deriving the rule passages was feasible, and the qualifier is the whole
design.** Searching for the rule's own words is easy; deciding what a hit has to
prove is not. Three candidate rules, in the order I tried them:

1. *Every hit must carry the anchor phrase `declared exception list`.* Too
   strict — it would demand that `topology.py`'s "No element values are combined
   here. See ARCHITECTURE.md, 'Where computation may live'" restate the list,
   when deferring is the better prose and the module inventory row has never
   been wrong precisely because it defers.
2. *Restrict the detection to the absolute form* (`only place`, `never`,
   `nowhere`). Fails on sentence boundaries: ARCHITECTURE.md's topology
   paragraph contains "only" three clauses away from the hit, joined by em
   dashes, and no cheap splitter tells the two apart.
3. **What shipped:** detect broadly, and require the *passage* to mention its
   exceptions in any inflection, **or** defer by name to the rule's section.
   That is the issue's own criterion — *"the defect is 'this passage never
   mentions exceptions at all', which reads as a stronger claim"* — and it
   lands cleanly: 15 passages, 12 already qualified, 3 bare, all 3 real.

Two scoping decisions inside that:

- **`tests/` is out of the corpus.** Including it adds five hits that are prose
  *about* the detector ("`sleeve_bore + 2 * wall` is two element values
  combined"), each needing an exemption that explains how the scan works. The
  rule's readers land on documents and on the package's docstrings.
- **A markdown table is split row by row**, not read as one block.
  `ARCHITECTURE.md`'s `fold(terms)` inventory row is one of the passages this
  scan exists to see, and a qualified row two lines away would otherwise cover
  an absolute one. `test_the_rule_statement_scan_can_fail` pins that case.

## The one set that stayed curated, and why

`traced_ratio_publishers()` — the `missing` half's set. The argument, in one
line: **a presence check cannot derive its own subject.** "Which documents must
publish the ratio?" is not a property of the documents, because the evidence is
absent from exactly the file you need to catch — a scan of "documents that
mention the ratio" stops looking at a document the moment someone deletes the
sentence, which is the deletion the half exists to see. So it is curated, but
not un-checked: `exact=True` on its size, no dead entries, and the seven
worksheets (the part that *is* derivable, since a worksheet publishes its own
stack's ratio by construction) come from a glob.

Feeding it `live_documents()` instead fails instantly on every file with no
business quoting a ratio — `CLAUDE.md` most of all, which deliberately points at
the SOP rather than restating the figure. The issue predicted this; it is true.

## Floor vs. exact count — this bit the design twice

Deliverable 2 says "assert its size". For a **derived** set an exact count is
the hand-kept list back again, one indirection along: `== 44` on
`live_documents()` would make the next `docs/strategy/` brief redden a suite it
has nothing to do with, and the whole point of the walk is that a document added
tomorrow is scanned without an edit. So `assert_coverage_set()` takes a floor by
default and `exact=True` only for a curated set, where the number *is* the
curation. `RULE_STATEMENT_FLOOR` is then set deliberately **at** today's count,
which gives the asymmetry you actually want: a new passage costs nobody a test
fix, a passage deleted rather than corrected reddens.

## `stack.py` — a scope call I made, not one the handoff made

The handoff named four absolute-form sentences to fix. All four had already been
corrected during `review/thermal_exception_declared`; I confirmed each and
registered it (they qualify as written, no edit). What the derived scan *found*
instead was three more, all in `tolerance_stack/stack.py`, including `fold()`'s
own docstring — **"The only place element values are combined."** — which
`ISSUE_20260902` deliberately left alone as outside the previous handoff's
scope.

I fixed all three (docstrings only; `fold()`'s body is untouched and still reads
no `lmc`/`mmc`). The reason not to exempt them: registering a statement that the
repo decided on 2026-09-01 is false, as a *deliberate exemption*, is the
prose-only exception this guard exists to end. If a reviewer disagrees, the
revert is three docstring hunks and three exemption entries — but the exemption
table would then need to exist, and today there is none, which is a better
place to be.

## What a future session should know

- **`workbook_corner`'s own docstring is excluded from the anchor pairing**, by
  a derived exclusion (`_exception_docstring_lines()`), because it says "this
  function" rather than naming itself in backticks. It is not unguarded — it is
  paired from the other end by
  `test_every_declared_exception_argues_its_case_in_its_own_docstring`. A second
  declared exception gets the same treatment automatically.
- **`PROVENANCE.md` is exempt explicitly**, as the issue demanded, and the
  exemption is *checked from both sides*: the file is outside the corpus, and
  `test_the_rule_scan_exempts_dated_history_on_purpose` asserts the 2026-08-05
  amendment's absolute sentence is still there. An exemption nobody can see
  failing is indistinguishable from a glob that never reached the file. (I first
  wrote that half as "PROVENANCE.md states the absolute *unqualified*" and it
  failed: the `stack.py` row is one enormous table cell that happens to contain
  the word "exception" elsewhere, so the qualifier rule passed vacuously. Pin
  the sentence, not the classification.)
- **`docs/strategy/` is inside `live_documents()`**, so a consumed brief is in
  both scans' corpus. `BRIEF_20260826_thermal_never_combines_invariant.md`
  passes today (blockquoted or qualified). A future brief quoting a retired
  ratio in a live sentence will redden the stale half; blockquote it, which is
  the house convention anyway.
- **`CLAUDE.md` needed no edit.** Its header's claim — "the repo's doc-scan
  guards read it as a live document" — was true of two scans of three when it
  was written and is true of all of them now. The fix made the sentence correct
  rather than the sentence needing correction.
- **Both guards were watched failing on the real defect, not only synthetically**:
  appending `3 of 26 element instances are traced` to `CLAUDE.md` (the exact
  injection `review/claude_md_tracked` made, which left the suite green) now
  fails naming `CLAUDE.md:140`, and appending an absolute sentence to
  `docs/DAG_TOPOLOGY.md` fails naming its line.
