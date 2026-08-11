# LESSONS 2026-08-10 — provenance_byte_identical_test

Handoff: `docs/sessions/active/HANDOFF_20260810_provenance_byte_identical_test.md`.
Baseline `master` @ `900a73d` (the triage sweep) — merge-base `900a73d`; the board
move `b37248d` is on this branch's line but not its parent.

## The `docs/reference/` decision, and the argument

**Insert-only**, not verbatim and not "no edits". Written into `ARCHITECTURE.md`,
new section *"Imported material — what may change, and how it is recorded"*, which
is now the single statement of both this rule and the PROVENANCE-row rule.
`README.md`, `docs/prompts/REVIEW_AGENT.md` (two items), `PROVENANCE.md` and the
imported file's own header block all point there instead of restating it.

The rule: *imported text is never edited, reworded or deleted; a dated correction
blockquote may be inserted after the passage it corrects, leaving the original
standing; record the insertion in `PROVENANCE.md`.*

Four reasons, the third of which is the one I would lead with to Jeff:

1. **Reverting a true correction to satisfy a freeze is the wrong trade.** The
   2026-08-06 `CORRECTION` block fixed the "1 of 17" ratio at its origin. "No
   edits" makes that block a violation and the wrong number the compliant state.
2. **`docs/reference/` is a *source*.** PROVENANCE says it is the primary source
   behind the SOP and the review checklist. A reader who follows a pointer in and
   finds a figure the repo has since corrected is misled by the very rule meant to
   protect them.
3. **Correct-in-place, leave-the-old-visible is already the house pattern** for a
   superseded number — that is exactly what
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
   enforces everywhere else, and what `data/inbox/specs/`'s append-only rule says
   about imported *files*. "No edits" would have made this directory the one place
   in the repo where the house pattern is forbidden.
4. **Insert-only is mechanically checkable and the freeze never was.** The freeze's
   one real benefit is being able to tell at a glance that nobody rewrote history;
   `test_docs_reference_imports_are_insert_only` gives that as a measurement, by
   diffing the file against drawing-checker's blob at `0743640` and failing on any
   opcode that is not `insert`. That is **stronger** than the handoff's suggested
   "the original text is a contiguous subsequence": a reworded line inside an
   otherwise-intact file is a `replace` opcode and fails, where a
   subsequence check on characters could let it through.

The current file is two insertions and nothing else (`insert` at original line 1 →
the 28-line import header; `insert` at original line 139 → the 30-line correction).
Each insertion must additionally be a **blockquote carrying an ISO date** — that is
what distinguishes a sanctioned annotation from a paragraph someone wrote into an
import.

One thing to know before you touch that file: **editing the import header is not
an edit to the import.** I rewrote the header's *"verbatim, do not edit"* — the
sentence that made the 2026-08-06 insertion an open question — and the insert-only
test still passes, because the header is itself an inserted block and the check is
against the *original's* lines. The PROVENANCE section records that edit anyway, on
the principle that the row moves whenever the file does.

## Yes, the PROVENANCE table format is now load-bearing — but I did not have to bend it

I expected to normalise em dashes or cell wording and did not have to. What the
parse relies on, all of it already true:

- Rows live in tables whose header row contains a cell `destination`; the
  claim-bearing ones also have `amended`. Key/value tables (`| Source repo | … |`)
  have neither and are skipped, so you can keep adding those freely.
- **The Amended cell's first word is the claim**, and there are exactly three:
  `no…` (still what was imported), `yes…` (changed — say when and why),
  `not imported` (authored here). Everything after the first word is free prose,
  including the em dash and every parenthesised variant. `no — empty, both`
  (`tests/__init__.py`) classifies as an identity claim without containing the
  phrase "byte-identical" at all, which is why the parse keys on the word and not
  on the phrase.
- **A row's watched paths are the backticked, `/`-containing tokens** in its
  destination cell, or in its source cell when the destination is `same path`.

Two things that would break it, so they are asserted rather than assumed:
`test_every_amended_cell_uses_the_documented_vocabulary` fails on a cell it cannot
classify (rather than skipping it, which would silently unwatch that file) and on
a row with no backticked path, and it pins that ≥4 `Copied` sections and ≥18 rows
were found. **That last assertion is the important one**: everything else here is
derived from the document, so a parse that quietly stopped matching would leave
every other test green while guarding nothing — the vacuous-check failure this repo
already had once (`ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth`).

`PROVENANCE.md` gained one key/value row the test needs: **`Import commit in this
repo` = `c157300`.** The document recorded drawing-checker's sha but never where in
*tolstack's* history the import landed, so there was no in-repo baseline to diff
against. It is git history; it does not move.

## Decisions the handoff left open

- **The branch check is not "changed a byte-identical file" but "changed an
  imported file and did not move its row".** Both failure shapes in one assertion,
  because the sightings had both: a `no` row going false, and a `yes` row whose
  Amended clause the branch made stale (sighting 4's "three Amended rows stale"
  were `stack.py`, `__init__.py` and `test_tolerance_stack.py`, none of which
  claimed byte-identity). A row counts as amended if its Amended cell text differs
  at all from its text at the merge-base. That is the cheapest rule that catches
  every recorded sighting, and it is honest about its limit: **the test asserts the
  cell moved, never that what it says is true.** That judgement stayed on the
  review checklist deliberately.
- **The comparison is against the *working tree*, not `..HEAD`.** `git diff <base>`
  with no second revision covers the branch's commits *and* the edit that is still
  uncommitted, in one command, so the test goes red while the author is still in
  the file rather than after they have pushed. On `master` the merge-base is `HEAD`
  and there is nothing to check.
- **Three baselines, not the handoff's two.** Merge-base (catches the author in the
  act), this repo's import commit `c157300` (catches drift that merged without
  being caught), and — new — **drawing-checker's blob at `0743640`**, which is the
  claim itself. Blob-hash equality *is* byte equality, so that one line of
  plumbing replaces the manual `sha256sum` step the review checklist has been
  asking reviewers to perform since founding. Both rows that claim byte-identity
  today (`stack_tan_link_to_pitch_plate_take2.json` and `tests/__init__.py`) do
  hold, and until now nothing in this repo had ever verified that.
- **The cross-repo test skips rather than passes when drawing-checker is absent.**
  An "empty diff" against a repo that is not there is the vacuous check in a new
  costume — the same reason `snapshot_drawing_checker.py` warns on a missing root.
- **The grep fails, it does not merely report.** A file outside the historical
  record that *asserts* byte-identity must name what checks it — a `sha256`, a
  `git diff`, a blob, a `test_…`/`tests/` reference or `PROVENANCE.md` — somewhere
  in the same block of prose. A **denied** identity ("**Not** byte-identical: the
  comment column differs") is not a claim to verify and is only reported. Scope is
  `git ls-files` minus `docs/sessions/`, `docs/issues/`, `docs/reference/` and
  `apps/viewer/vendor/`: historical records are what someone believed on a date and
  rewriting them destroys the evidence this whole module rests on (the same scoping
  the traced-ratio doc test uses).
- **`tests/test_provenance.py` excludes itself from that grep, by exact path.** Its
  every occurrence of the phrase is a regex or a docstring. Excluding the *file*
  rather than a directory is deliberate: a directory-wide exclusion is somewhere a
  real claim could later hide.
- **"verbatim" is not in the grep's pattern.** It has too many legitimate uses here
  ("quoted verbatim", "printed verbatim", the viewer's embedded stack) to police as
  an identity claim. The one place it *was* an identity claim — `docs/reference/` —
  now has its own test instead. If a second directory ever carries a prose
  verbatim claim, that is the trigger to revisit.

## The two things I had to fix to make the grep green

Both are the finding, not friction — worth naming because they are what the rule
buys you:

1. `ARCHITECTURE.md` said *"A test pins the embedded stack byte-identical to the
   authored file."* Now names it:
   `tests/test_viewer_projection.py::test_stack_block_is_byte_identical`. "A test
   pins X" is unfalsifiable prose; a test name is a pointer someone can run.
2. My own new PROVENANCE row asserted byte-identity in a block with no pointer, and
   the test I had just written caught me. Which is the whole idea.

## Proof against the real sightings, not a synthetic one

Sightings 4 and 5 were parallel handoffs off the **same** master commit `2097d59`
and both merged, so their trees are permanent git history and the falsifying diff
is replayable rather than mimicked. `_SIGHTINGS` in the test records, per sighting,
the author's tip *before* the reviewer touched PROVENANCE and the review commit
that fixed it:

| sighting | base | author's tip | rows the check names | review fix |
|---|---|---|---|---|
| 4 `citation_export_provenance` | `2097d59` | `fbc9bab` | both seeded stack JSONs (`identical`) + `stack.py`, `__init__.py`, `test_tolerance_stack.py` (`amended`, i.e. stale) | `8a88b71` |
| 5 `traced_labels_and_ratio` | `2097d59` | `455b210` | the same two JSONs + both seeded worksheets (`identical`), the `docs/reference/` lesson (`section-prose`), `debug_report_tolerance_stacks.py` + `test_tolerance_stack.py` (stale) | `e6f8ef5` |

The assertion is on the **exact set**, and the second half — the review commit must
come back **clean** — is what makes the first half mean anything: a check that
fires on everything catches nothing. Neither author had touched `PROVENANCE.md` at
all, which is why the reconstruction is unambiguous.

Sighting 5's list includes `test_tolerance_stack.py`, which the handoff's table
omits; that is the check being *more* complete than the review was, not a
mis-reconstruction. Sightings 1–3 are not replayed: 1 and 2 predate rows the check
needs and 3 was the phrase escaping into prose, which is the grep's job, not the
row check's — and sighting 3's four files still carry their (correctly *denied*)
claims today, which the inventory below shows.

Making the check a **pure function** (`unamended_rows(before, after, changed)`) is
what makes that replay possible: the same function guards the live branch and eats
a historical diff. If you extend the check, keep it pure.

## The byte-identity inventory, as the DoD asks

23 occurrences in live tracked files, all now carrying a pointer;
`venv-win\Scripts\python.exe tests\test_provenance.py` reprints it.

| where | kind | pointer |
|---|---|---|
| `ARCHITECTURE.md` ×3 (256, 302, 312) | asserted | `tests/`, `blob` |
| `PROVENANCE.md` ×14 (14, 29, 31, 46, 57×2, 58, 60, 61, 62, 69×2, 70, 82) | asserted | `tests/`, `sha256` |
| `apps/viewer/README.md`:62 | asserted | `tests/test_viewer_projection.py` |
| `docs/prompts/REVIEW_AGENT.md`:531, 549 | asserted | `sha256` |
| `stack_hub_bearing_thermal_fit_m1.json`:50, `…m2.json`:405 | **denied** | `tests/` |
| `tests/test_hub_bearing_rederivation.py`:542 | **denied** | — (see the review's S1) |

The three denials are sighting 3's files after that review corrected them, and they
are the model for what a claim should look like: they say what *is* identical
(numeric cells over rows 31–44), what is not (the comment column), and which cell
the difference turns on (`O31`).

Out of scope by design: `docs/sessions/` (34 occurrences across handoffs, reviews
and lessons) and `docs/issues/` (2). Left alone on purpose.

## Should the review-checklist item be deleted? Replaced, and it lost 56 lines

**Delete the instruction, keep the judgement.** The item had grown to 56 lines of
escalating sighting history — an item that long is one nobody reads, and its
content was "run this command", which is now the suite's job. But the test does
not cover all of it, so deleting it outright would drop two real checks:

- **Is the amendment true?** The test sees the cell move; it cannot read whether
  "additive only" describes the diff. That is the next sighting's shape.
- **Does a claim's named verification actually check what the claim says?** Sighting
  3 in one line: the note said "byte-identical", the test compared numeric cells,
  and four cells differed. The grep now forces a pointer to *exist*; only a human
  can read what it points at.

So: 56 lines → 25, of which the history is compressed to one sentence and the rest
is those two questions, with **"do not re-add the diff to this list"** stated
explicitly so sighting seven does not arrive as a sixth manual amendment. Two
other items shrank the same way (`docs/reference/` verbatim-or-not, now settled;
"do not edit a file PROVENANCE claims is byte-identical", which also stopped
quoting a row count that had already gone stale twice).

## drawing-checker read-only — what I can and cannot claim

`before`/`after` snapshots in
`C:\workspace\tolstack\data\sessions\provenance_byte_identical_test\` bracket a
**full suite run**, i.e. every drawing-checker access the new test makes:

```
before.json  1628 entries at 2026-08-11T03:32:16Z
after.json   1628 entries at 2026-08-11T03:32:20Z
drawing-checker snapshot diff: EMPTY -- no entry added, removed or modified. (exit 0)
```

and `git -C C:\workspace\drawing-checker status --porcelain` identical at both
ends, `HEAD` `58d62a3`.

**Being honest about the window:** that is a suite-run window, not a session
window — I had already read drawing-checker before taking a `before.json`, so
there is no snapshot spanning the whole session. What I can say instead is exactly
which accesses happened: `git cat-file blob`, `git rev-parse`, `git log` and one
`git status`, all through `-C`, and nothing else — no filesystem read, no pipeline,
no write path. A future session doing the same should still take the snapshot at
step 0; the correct claim shape is the one the last lesson established, and a
narrower window is worth less.

One gotcha worth carrying, since this session's test reads another repo on every
run: **`git status` can write to the other repo's `.git/index`** (it refreshes the
stat cache), while `cat-file` and `rev-parse` do not. The test uses only the latter
two. If you extend it, do not reach for `status` or anything that stages.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q` → **317 passed, 1 skipped**, in the
  worktree (baseline `900a73d`: 308 passed, 1 skipped). The skip is unchanged —
  `test_viewer_js_suite.py`'s node-fs tier, which has no projection in a worktree.
  The nine new tests are checkout-independent: they read tracked files and git.
- Red where it must be red, checked by hand and then reverted: appending one byte
  to `stack_tan_link_to_pitch_plate_take2.json` fails all three baselines with the
  prescription; rewording one imported line in `docs/reference/` fails
  insert-only naming the `replace` opcode and quoting the original line.
- `forge check` OK on the worktree (with the standard linked-worktree warning) and
  on `C:\workspace\tolstack`. It is **not on `PATH`** in a dispatch shell — run
  `C:\workspace\forge\venv-win\Scripts\python.exe -m forge check <repo>` **from
  `C:\workspace\forge`** (the module is not installed, so cwd is the import path,
  and `check` takes the repo as a positional).
- `PROVENANCE.md` rows: this branch changed no path that carries a table row; the
  one imported file it did touch (`docs/reference/…`) has its section amended, and
  the test asserts that rather than my having remembered it.

## Left to do

- **Nothing asserts a `PROVENANCE.md` row is *accurate*.** The next sighting in
  this class will be a row that moved and says something false — most likely
  "additive only" over a diff that moved a value. Partly mechanisable: for a stack
  JSON, "additive only" is checkable by re-parsing both revisions and diffing the
  structures minus the added keys, which is what `traced_labels_and_ratio` did by
  hand. Not worth building until it happens once.
- **The `## Copied` prose paragraphs are not parsed.** The "The rule" paragraph
  still names three SOP-mandated files and describes which rows have gone false;
  that prose can go stale exactly like a row. The tables are guarded, the narrative
  around them is not.
- **`data/inbox/tolerance_stacks/PROVENANCE.md` and
  `data/inbox/drawings/PROVENANCE.md` record `sha256`s and are not checked by
  anything** — their contents are gitignored, so the check would only run in the
  main checkout and would have to skip in a worktree. Same claim class, different
  enforcement problem.
- The staged `fastener_citations_and_confidence` `depends_on` this handoff and will
  re-cite stack elements — it is the first branch this test will meet in anger, and
  `stack_tan_link_to_pitch_plate_take2.json` is one of the two rows still claiming
  byte-identity.

## Amended in review, 2026-08-10 (`review/provenance_byte_identical_test`)

See `docs/sessions/reviews/REVIEW_20260810_provenance_byte_identical_test.md`.
Verdict APPROVE, 0 blockers; three corrections landed here rather than being left
in a report nobody re-reads.

1. **"The grep fails, it does not merely report" was not true inside a `.py`
   file, and the file it was not true for is sighting 3's own.** `_POINTER_RE`
   contains `test_[a-z0-9_]+`, and a claim written in a test body sits in a block
   that contains that test's `def` line — so the claim cited **the very test whose
   comparison was in question** and came back backed. Replayed against the real
   blob: at `46a450a`, `tests/test_hub_bearing_rederivation.py:539` scanned as
   *asserted, pointer =
   `test_workbook_inputs_are_transcribed_consistently_on_both_sheets`*, which is
   the numeric-cells-only test. The whole tree at that commit produced **no** `.py`
   finding. Fixed in the review: `_DEFINITION_RE` excludes `def`/`class` lines from
   the pointer search (a definition line is not evidence), `claims_in(rel, text)`
   is extracted as a pure function per this lesson's own instruction, and
   `test_the_grep_catches_the_reconstructed_sighting_three` replays that blob so
   the exclusion cannot regress. Sighting 3 now has a replay alongside 4 and 5.
   The generalisation, which is the durable part: **when a test greps for
   evidence, ask what else its pattern can match — a check whose evidence pattern
   matches the thing under test is the vacuous check wearing a new costume.**
2. `PROVENANCE.md ×13` in the inventory table above → **×14** (the total of 23 was
   right and only adds up at 14).
3. "the 22-line import header" → **28**. 22 is the figure on `master`; this
   branch's own rewrite of that header added six lines, so the number went stale
   between being computed and being written down — the repo's number-one recurring
   class, landing inside the handoff that mechanised the neighbouring one.
