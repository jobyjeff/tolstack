---
type: review
handoff: docs/sessions/active/HANDOFF_20260810_provenance_byte_identical_test.md
reviewer: review agent (dispatch)
date: 2026-08-10
verdict: APPROVE
blockers: 0
---

# REVIEW — provenance_byte_identical_test

Reviewed `handoff/provenance_byte_identical_test` (2 commits, `900a73d..fd25ce7`)
against `master` @ `a13601a`. `git log --oneline HEAD..master` before the merge
held only the two board commits (`b37248d`, `a13601a`, both `staged -> active`
moves of handoff files this branch does not otherwise touch); nothing conflicted
and the merged tree is the tree tested below.

This is a **test/plumbing handoff, not a tolerance stack**. It adds no element,
no path, no check and no number: `git diff master..HEAD --name-only` names only
`ARCHITECTURE.md`, `PROVENANCE.md`, `README.md`, one issue file, the review
overlay, one `docs/reference/` header, a lesson and the new `tests/test_provenance.py`.
The seven mandatory stack checks are addressed below in the only form they can
take here.

**One should-fix was found and fixed inline on the review branch** (finding S1) —
the grep's pointer heuristic was satisfied by the enclosing `def test_...` line,
so it did **not** catch sighting 3, the sighting it was written for. Verified
against the real blob. Details and the two nits follow.

---

## The mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — **N/A, verified inert**

No `source_ref`, no `confidence`, no `element`, no band, no hardware entry is
added, removed or relabelled. Confirmed mechanically rather than by reading the
handoff's promise: `git diff master..HEAD --name-only` names no file under
`docs/tolerance_stacks/` and no `hardware_entries.json`. The handoff explicitly
fences this off ("do **NOT** re-cite or relabel any stack element — the staged
`fastener_citations_and_confidence` owns that") and the branch honours it.

The one thing that *could* have moved a citation silently — the two rows still
claiming byte-identity — is now checked by machine rather than by me: see check 7.

### 2. Signs on every path term — **N/A**

No term list, path or check is added or edited. `tolerance_stack/` is untouched
(`git diff` names no file in the package), so `fold()` and every signed term list
are byte-for-byte what `master` shipped.

### 2b. Coherent material corners — **N/A**

No transcription, no re-derivation table, no `workbook_corner()` call.

### 3. LMC/MMC direction — **N/A**

No element carries or loses `lmc`/`mmc` on this branch. `fold()` unmodified, so
it still reads `min`/`max` only.

### 4. RSS actually computed — **N/A**

No check is added and no verdict is produced or stored.

### 5. Nominal inside its own min/max — **N/A**

No `nominal` is written, moved or "fixed".

### 6. Quantised constraints (cotter / castellation) — **N/A**

No joint is modelled. The archetype-caveat generalisation *does* apply and is
satisfied: the new test states its own limit next to its assertion rather than in
a footnote — `test_this_branch_amended_the_row_of_every_imported_file_it_changed`
asserts the Amended cell **moved**, never that what it now says is true, and the
overlay keeps exactly that question as a human check. That is the right shape.

### 7. Traced / inferred / untraced ratio — **unchanged, re-derived**

Re-derived rather than copied, per the checklist's own rule:

```
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --ratio
```

> **3 traced / 7 inferred / 16 untraced, out of 26 element instances** (the three
> seeded slice-1 stacks — the checklist's named set), and
> **19 / 11 / 18 out of 48** across all five stacks. Identical before and after
> the merge, as it must be for a branch that touches no stack.

Non-element values: unchanged too (the branch adds no material property,
temperature or stiffness ratio). No `untraced` value's gap listing moved.

The number this handoff *does* put on the record is a different inventory, and I
re-derived that one as well — see "The byte-identity inventory" below.

---

## Deliverables, against the DoD

| DoD item | verdict | evidence |
|---|---|---|
| Test green on `master` as it stands | **pass** | 318 passed, 1 skipped in the review worktree post-merge (317 + the one I added); 308 + 1 on the pre-merge baseline |
| Demonstrably red against reconstructed sightings | **pass, and extended** | sightings 4 and 5 replayed out of real git history (`_SIGHTINGS`), asserting the **exact** caught set *and* that the review commit that fixed each comes back clean. I added sighting 3 as a third replay (see S1) |
| `docs/reference/` rule stated in exactly one place, referenced from the other | **pass** | canonical statement is `ARCHITECTURE.md`, "Imported material"; `README.md`, the overlay (2 items), `PROVENANCE.md` and the imported file's own header all point there. The existing blockquote is **blessed**, not reverted |
| The byte-identical grep reported | **pass** | 23 occurrences in live tracked files, reprinted below; scope exclusions stated and defensible |
| Full suite green | **pass** | worktree **318 passed, 1 skipped**; main checkout **319 passed, 0 skipped** post-merge (the one skip is `test_viewer_js_suite.py`'s node-fs tier, which has no projection in a worktree — the known checkout-specific delta, so both numbers are stated with their checkout as the overlay requires) |
| Lesson written | **pass** | `docs/sessions/lessons/LESSONS_20260810_provenance_byte_identical_test.md`, 287 lines; unusually good on what the check *cannot* do |

### The design decisions, judged

- **Three baselines, not two.** Merge-base (catches the author in the act), the
  in-repo import commit `c157300` (catches merged drift) and — the author's
  addition — drawing-checker's **blob** at `0743640`, which is the claim itself.
  Blob equality *is* byte equality, so that third one retires a `sha256sum` step
  the checklist has asked reviewers to perform since founding and that, as far as
  I can tell from the reports in `docs/sessions/reviews/`, **no review had ever
  actually run**. Good call.
- **Diffing the working tree, not `base..HEAD`.** Right, and for the stated
  reason: the test goes red while the author is still in the file.
- **Derived from the document, never a watched-file list.** Verified: I deleted
  no row and hardcoded nothing to check this — `parse_rows` finds 18 rows across
  4 `Copied` sections, and `test_every_amended_cell_uses_the_documented_vocabulary`
  pins both counts so a parse that quietly stopped matching fails loudly instead
  of turning everything else green. That anti-vacuity assertion is the most
  important line in the file.
- **Skip, not pass, when drawing-checker is absent.** Correct, and the same
  reasoning `snapshot_drawing_checker.py` uses.
- **Insert-only over "no edits" for `docs/reference/`.** I agree, and the
  argument in the lesson is stronger than the one the handoff suggested: the
  implemented check (`difflib` opcodes, fail on anything that is not `insert`) is
  strictly stronger than the handoff's proposed "original text is a contiguous
  subsequence", because a reworded line is a `replace` and fails. Confirmed by
  experiment — see "Teeth" below.

---

## Teeth — I re-ran every claim of red

Trusting a new test's failure message is the same mistake as trusting a
provenance row. Each of these was tampered, run, and reverted:

| tamper | result |
|---|---|
| append a byte to `tests/__init__.py` (claims byte-identity) | **3 tests red** — branch check, import-commit check *and* the drawing-checker blob check, with the blob hashes printed |
| append a comment to `tolerance_stack/stack.py` (row `amended`, i.e. the stale-clause shape) | **1 red** — branch check, naming `PROVENANCE.md:70`, quoting the current cell and printing the exact clause to append, correctly slugged from the branch name |
| reword one imported line in `docs/reference/…` | **red** — names the `replace` opcode, the original line number and quotes the line |
| add "byte-identical to the source" to `README.md` with no pointer | **red** — names file, line and excerpt |
| add a claim comment inside a `def test_…` body | **passed before my fix, red after** — see S1 |

The failure messages are genuinely the deliverable the handoff asked for: each
names the row, quotes the cell, and writes the clause. No note.

Two more properties I checked rather than assumed:

- `test_every_file_claimed_byte_identical_matches_drawing_checkers_blob` really
  compares **2** pairs, not 0 or 1 — `zip(sources, dests)` truncating silently was
  the obvious way for it to go vacuous, and it does not here. (Worth knowing that
  one of the two is `tests/__init__.py`, the *empty* blob, so live coverage of
  that check is thinner than "two rows" sounds. Not a defect — a fact about the
  repo, and it grows as rows get added.)
- Deleting a row outright to escape the branch check does not work: the row-count
  floor (`>= 18`) fires.

---

## Findings

### S1 — should-fix, **fixed inline on the review branch**

**Location:** `tests/test_provenance.py`, `claim_inventory` / `_POINTER_RE`.

**What's wrong:** the "a byte-identity claim must name what checks it" grep
searched the enclosing block of prose for `test_[a-z0-9_]+`. Inside a Python test
module the block containing a claim almost always contains that claim's own
`def test_...` line, so **a claim written in a test body cites the very test whose
comparison is in question, and comes back backed.** That is sighting 3 exactly.
Replayed against the real blob rather than argued:

```
git show 46a450a:tests/test_hub_bearing_rederivation.py   # hub_bearing_thermal_stack, pre-review
  line 539: "# the upper bore is byte-identical between M1 and M2: ..."
  pointer found = 'test_workbook_inputs_are_transcribed_consistently_on_both_sheets'
                  ← matched on that test's own `def` line
```

So the scan reported that claim as **backed**, and the test it "named" is the one
that compared only the numeric cells while four cells differed, one of them the
hub part number the identity argument rested on. The check ran over the whole
tree at that commit and flagged nothing in a `.py` file. Sighting 3 is 2 of its 4
files, and it was the sighting whose *shape* this deliverable was written for.

This does not fail the DoD — the handoff's bar for the grep was "at minimum
report", and it does report. But the lesson states "**The grep fails, it does not
merely report**", and for the file type that matters most that was not true.

**Fix applied** (small, and disclosed here per the review process):

1. `_DEFINITION_RE` — a `def`/`class` line is excluded from the pointer search. A
   definition line is not evidence.
2. `claims_in(rel, text)` extracted as a **pure** function (the author's own
   instruction: *"If you extend the check, keep it pure"*), so the scan can be
   replayed against a blob.
3. `test_the_grep_catches_the_reconstructed_sighting_three` — replays
   `46a450a:tests/test_hub_bearing_rederivation.py` and asserts the claim comes
   back **asserted with no pointer**, pinning the exclusion against regression.
   Same shape as the file's existing `_SIGHTINGS` replays; `46a450a` is an
   ancestor of `master`, so it is permanent history.

Re-verified after the fix: full suite green (318/1 worktree, 319/0 main), the
live inventory is unchanged at 23 occurrences, and no currently-green claim lost
its pointer except `tests/test_hub_bearing_rederivation.py:542`, which is a
**denied** claim and therefore never had to have one.

### N1 — nit: the lesson's inventory table miscounts one cell

`LESSONS_20260810_…` says `PROVENANCE.md ×13`. The scan finds **14** occurrences
there (12 distinct lines; 57 and 69 each match twice, which the table itself notes
as `57×2` / `69×2`). The stated **total of 23 is correct** and re-derives exactly,
and the per-file rows add to 23 only if PROVENANCE contributes 14 — so this is the
label, not the measurement. Corrected in the lesson.

### N2 — nit: "the 22-line import header" is stale by this branch's own edit

The lesson describes the current `docs/reference/` file as *"`insert` at original
line 1 → the 22-line import header"*. 22 is the figure on `master`; this branch
rewrote that header (`verbatim, do not edit` → `insert-only`) and the block is now
**28** lines. Re-derived from the opcodes:

```
master : [('insert', 1, 22), ('insert', 139, 30)]
HEAD   : [('insert', 1, 28), ('insert', 139, 30)]
```

The 30-line correction block is exact. This is the repo's number-one recurring
class (stale inventory numbers) landing inside the handoff that mechanised the
neighbouring one, which is worth a smile and one line in the lesson. Corrected
there.

### Passing, but stated so the next reader knows it was checked

- **ARCHITECTURE.md's summary of the test is one baseline short.** *"diffs every
  claimed path against both baselines (this repo's import commit `c157300` and
  drawing-checker's blob at the recorded sha)"* omits the merge-base — which is
  the *primary* baseline and the one that catches the author. Not wrong about
  anything it says; incomplete about what the test does. Left as-is: it is prose
  summarising a test whose docstring is authoritative, and the sentence's job is
  "there is a test", which it does. Flagging so nobody later reads it as the
  spec.
- **The `_HISTORICAL` scope exclusions** (`docs/sessions/`, `docs/issues/`,
  `docs/reference/`, `apps/viewer/vendor/`) are argued in the lesson and I agree
  with the argument — rewriting historical records to satisfy a present-tense rule
  destroys the evidence. Note the consequence though: a **staged handoff** is a
  live instruction document that lives under `docs/sessions/`, so a handoff
  asserting byte-identity is unguarded. Acceptable today; the trigger to revisit
  is a handoff whose *instruction* rests on an identity claim.
- **`docs/inbox/*` PROVENANCE files** (`data/inbox/tolerance_stacks/`,
  `data/inbox/drawings/`) record `sha256`s that nothing checks. The lesson names
  this in "Left to do" with the right reason (gitignored ⇒ main-checkout-only ⇒
  would have to skip in a worktree). Correctly deferred, not missed.

---

## The byte-identity inventory — re-derived, not copied

`venv-win\Scripts\python.exe tests\test_provenance.py` reprints it. **23
occurrences in live tracked files**, every asserted one carrying a pointer:

| where | n | kind | pointer |
|---|---|---|---|
| `ARCHITECTURE.md` (256, 302, 312) | 3 | asserted | `tests/`, `blob` ×2 |
| `PROVENANCE.md` (14, 29, 31, 46, 57×2, 58, 60, 61, 62, 69×2, 70, 82) | 14 | asserted | `tests/` ×5, `sha256` ×9 |
| `apps/viewer/README.md`:62 | 1 | asserted | `tests/test_viewer_projection.py` |
| `docs/prompts/REVIEW_AGENT.md` (531, 549) | 2 | asserted | `sha256` |
| `stack_hub_bearing_thermal_fit_m1.json`:50, `…m2.json`:405 | 2 | **denied** | `tests/` |
| `tests/test_hub_bearing_rederivation.py`:542 | 1 | **denied** | — (after S1; a denied claim needs none) |

Out of scope by design: `docs/sessions/` (34) and `docs/issues/` (2).

---

## Also verified

- **Tests do not pollute production data.** `data/` in both checkouts is byte-for-byte
  unchanged across every suite run in this review; `git status` clean in the
  review worktree apart from my own fix, and the main checkout shows only an
  untracked `.dispatch.toml` that predates me.
- **PROVENANCE rows for this branch.** The branch changed exactly one path that
  carries a row (`docs/reference/LESSONS_20260729_…`), whose section prose is
  amended in the same commit — and the new test asserts that rather than the
  author having remembered it. **Sixth run, second clean author pass, and the
  first one that was clean because a machine said so.**
- **drawing-checker read-only.** Snapshot taken at the top of this review
  (1628 entries, 03:40:34Z); after the full review including three full suite runs
  and every blob read, 1628 entries at 03:48:01Z, **diff EMPTY**. Additionally
  diffed the *author's* `before.json` (03:32:16Z) against my `after.json` — also
  **EMPTY**, so one continuous window now covers the author's runs and mine.
  drawing-checker `HEAD` `58d62a3` and `git status --porcelain` identical at both
  ends. The lesson's caveat about `git status` refreshing another repo's
  `.git/index` is correct and worth keeping; the test itself uses only `cat-file`
  and `rev-parse`.
- **`data/inbox/specs/` untouched** — the diff names nothing under `data/`, and
  the filesystem listing in the main checkout is unchanged.
- **Projections.** Not rebuilt, and correctly so: the branch changes no stack, no
  citation and no script that feeds `data/projections/viewer/`, so a rebuild could
  only produce a new `built_at`. Verified by the diff rather than assumed.
- **`forge check`** OK on the review worktree (with the standard linked-worktree
  warning) and on `C:\workspace\tolstack`.
- **No `{{REPO_NAME}}`-class placeholders** anywhere in the diff.
- **Vocabulary drift.** The Amended column is now a documented three-word
  vocabulary living in **three** places — `PROVENANCE.md`'s prose, `claim_of`'s
  docstring and `test_every_amended_cell_uses_the_documented_vocabulary`. All
  three agree, and the test is the enforcing one. This is the shape the overlay's
  "a vocabulary lives in three places" item asks for, met first time.
- **Issue closure.** `ISSUE_20260806_mechanise_the_byte_identical_provenance_check.md`
  → `status: closed`, `closed: 2026-08-10`, with a closure blockquote that names
  what was built. Frontmatter intact.

---

## Verdict

**APPROVE** — 0 blockers. One should-fix, fixed inline on the review branch and
disclosed above; two nits corrected in the lesson.

This is the best-argued handoff I have reviewed in this repo. The thing that
raises it above "a test got written" is that the author replayed the *real*
falsifying diffs out of git instead of mimicking them, and asserted the **exact**
caught set plus a clean result on the review commits that fixed them — a check
that fires on everything catches nothing, and they tested for that. The one gap I
found is of the same species as the bug being fixed (a piece of evidence that
matched the thing under test), which is exactly where a second reader earns their
keep.

### Note for the next reviewer

**Do not re-add the byte-identical diff to the checklist.** It is `tests/test_provenance.py`
now. What is left for you is in the overlay and is two questions, both of which
the machine genuinely cannot answer: *is the amendment true?* and *does a claim's
named verification actually compare what the claim says?* S1 is the worked
example of the second one turning up inside the checking machinery itself — when
a test greps for evidence, ask what else its pattern can match.
