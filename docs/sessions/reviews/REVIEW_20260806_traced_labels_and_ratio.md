---
type: review
handoff: docs/sessions/active/HANDOFF_20260806_traced_labels_and_ratio.md
reviewer: review agent (dispatch), branch review/traced_labels_and_ratio
date: 2026-08-06
verdict: APPROVE
blockers: 1 (fixed inline — PROVENANCE.md rows, see B1); plus 1 cross-branch test failure from a sibling handoff, resolved on the review branch (M1)
---

# REVIEW — traced_labels_and_ratio (2026-08-06)

Work reviewed: `handoff/traced_labels_and_ratio` @ `455b210` (3 commits), merged
fast-forward into `review/traced_labels_and_ratio` from `master` @ `2097d59`.

**Then master moved.** `citation_export_provenance` landed while I was reviewing
(11 commits, including its own review's fixes) and `viewer_generated_checks` went
active. So there are two test runs in this report and only the second one counts:

| tree | result |
|---|---|
| `handoff/traced_labels_and_ratio` on `master` @ `2097d59` | 252 passed, 1 skipped |
| the same work merged with `master` @ `c339c3a` — **the tree that ships** | **277 passed, 1 skipped** |

Getting to the second number took resolving five conflicts and **fixing one real
cross-branch failure that neither branch's suite could see** — see M1 below. This
is the checklist's *"a sibling handoff landed on master while you were reviewing"*
item paying for itself; I had checked `git log --oneline HEAD..master` at the start
of the review and it was empty, which is exactly how you get caught.

This is a **provenance-hygiene** handoff, not a new stack: it relabels three
`confidence` fields and corrects a headline ratio. So the audit below is mostly
"did the label move to the truth, and did the arithmetic stay put" — plus one
genuinely new document reading, which I re-read from the scan myself.

---

## The seven mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — **PASS, verified from the document**

The handoff's fix table came from a review rather than from the page, and the
handoff said so and told the author to verify by crop. They did, and **so did I**
— independently, from drawing-checker's venv against the main checkout's copy
(`C:\workspace\tolstack\data\inbox\specs\NAS6403-NAS6420 Rev 4.pdf`, a scan with
no text layer):

```powershell
$PY  = "C:\workspace\drawing-checker\venv-win\Scripts\python.exe"
$PDF = "C:\workspace\tolstack\data\inbox\specs\NAS6403-NAS6420 Rev 4.pdf"
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,140,190,70"  --zoom 8   # dash rows
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,150,110,60"  --zoom 8   # left headers
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,300,120,140" --zoom 5   # LENGTH header block
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,305.5,700,150" --zoom 5 # closing note
& $PY tests\debug_trace_stack_values.py $PDF --crop "2,305.5,421,421" --zoom 2.4
```

What the page actually says, read by me:

- Sheet 3 (title block confirms `Sheet 3`, so the `sheet: 3` address is right) is
  one table for the family. Columns left to right: `Grip Dash No.` |
  **`Grip ±.010`** | then, under a merged header reading
  **`LENGTH ±.015 (See Note Below)`** / `BASIC NUMBER AND THREAD SIZE`, one column
  per basic number — `NAS6403 .1900-32`, `NAS6404 .2500-28`, `NAS6405 .3125-24`, …
- **Dash 14 → grip `.875`**, NAS6403 length `1.198`, NAS6404 `1.245`.
  **Dash 13 → grip `.812`**, NAS6403 `1.135`, **NAS6404 `1.182`**.
  Dash 11 → `.688` / `1.011`, which re-confirms `pitch_link_stack`'s reading a
  third time.
- The band is in the **column header**, not in a cell. That is the whole
  justification for `traced` here — value and tolerance on one page — and it is
  true.
- Sheet 3's closing note: *"Nominal grip … number times .0625 (rounded to 3
  decimal places). Nominal length equals nominal grip …"* — so `.812` for dash 13
  (not `.8125`) is the document's own rounding, not the author's.
- Sheet 2 corroborates every decode claim in the notes: CODE block *"Dash number
  indicates grip in .0625 increments. See Sheet 3…"*, `"U"` after the basic number
  = unplated, `"D"` after the dash number = drilled shank, `"H"` = drilled head;
  note (a) *"Grip-length of bolts shall be measured from the underside of head to
  the end of the full cylindrical portion of the shank."*; and the EXAMPLE OF PART
  NUMBER block is indeed written against **NAS6404**.

So both re-citations are real, the callout strings match the printed cells, and
the two elements' mm values are the printed inches × 25.4 exactly
(`22.225 = .875 × 25.4`, `20.6248 = .812 × 25.4`, `±0.254 = ±.010 × 25.4`). The
new citations also copy the *shape* `pitch_link_stack` established for this
document (`kind: spec`, `view: "grip/length table"`, `cell: "row 'Grip Dash No. N'"`),
which is the right call.

**The third element was correctly refused.** MS21299 is not in the pile — I
counted it myself: **64 files / 249,106,379 bytes**, matching PROVENANCE's
2026-08-05 recount exactly, no renames, no additions, nothing removed. No
`MS21299`, no `NAS1149`, no `MS24665`. `under_head_chamfer_washer` → `inferred`
with the band still on the gap list is the honest outcome, and the SOP's new
"no exception" rule is what makes it non-negotiable rather than a judgement call.

**Invented numbers: none found.** Every value in the two edited files is
byte-unchanged (see check 2); no new number entered the repo.

### 2. Signs on every path term — **PASS, vacuously and provably**

No arithmetic changed, and I did not take that on trust. Stripping `source_ref`
and `note` from both edited JSONs and diffing against `master` gives
**structurally identical** documents, and `paths` / `checks` are byte-identical
including their notes. The re-derivation table re-runs at **27 cells, largest
delta 6.439e-15** — the same figure PROVENANCE records for the coefficient change
on 2026-08-05. Neither stack is a `thermal_fit`, so the checks are in the JSON and
were readable; they were also untouched.

Prose direction: no check verdict, requirement sentence or interval was rewritten
— the worksheet edits are confined to the element table's source/conf columns, the
gaps table, the ratio section, and dated notes.

### 2b. Coherent material corners — **N/A**

No re-derivation delta arose (no value moved), so there is no delta to
misattribute.

### 3. LMC/MMC direction, per element — **PASS, unchanged**

No `lmc`/`mmc` field was touched in either file. The tan-link bushing chamfer
keeps LMC 0.889 > MMC 0.635 subtracted, and the take-2 nut minor diameter keeps
MMC 4.05 < LMC 4.25 internal; take-2 was not edited at all. `fold()` is untouched
and the test that reads its source for `.lmc`/`.mmc` still passes.

### 4. RSS actually computed — **PASS, unchanged**

No results section, verdict or RSS column was edited. The relabelling cannot reach
them: `check_result` is produced, not stored, which the author correctly cites as
the reason no arithmetic moved.

### 5. Nominal inside its own min/max — **PASS, unchanged**

Every `nominal`/`min`/`max` is byte-identical to `master`. The two known
rounding cases and the thread-transition "nominal is its maximum" case are
untouched, and no transcribed nominal was quietly adjusted to make an invariant
hold — provable here in the strongest possible way, since *no numeric field
changed at all*. `under_head_chamfer_washer`'s pre-existing recorded finding
("nominal is the midpoint — the workbook computes it as such") survives, and the
element note was strengthened rather than softened.

### 6. Quantised constraints (cotter / castellation) — **PASS, preserved**

Both joints are cotter-and-castellated-nut retained and both worksheets keep their
MS9363 caveat next to the numbers; gap 2 (MS9363 slot count + depth) stays at
priority **1 — blocks F8/F16** in both. The tan-link gap 1 (NAS6403) correctly
drops to priority 2 now that the document is in the pile — F8 remains blocked by
gap 2, so nothing was un-blocked by sleight of hand. Transcribed-but-unused nut
geometry in take 2 is untouched, as it should be.

### 7. The traced / inferred / untraced ratio — **PASS; computed by me, not copied**

Counted directly from `docs/tolerance_stacks/*.json` with my own script (not the
author's `_counts`), over the three seeded stacks:

> **3 traced / 7 inferred / 16 untraced, out of 26 element instances.**
> (18 distinct element ids; 10 instances carry a `hardware_ref`.)
> Per stack: `tan_link` 2/3/6 of 11 · `take2` 0/2/7 of 9 · `vpa` 1/2/3 of 6.
> All six stacks: 19 / 11 / 18 of 48.

That agrees with `--ratio`, with the test's asserted tuple, with every document on
the branch, and with the viewer projection's `provenance_counts`
(`tan_link 2/3/6`, `vpa 1/2/3` — so the DoD's "scoreboard rebuilt so it agrees
with the prose" is genuinely satisfied; `results.json` in the main checkout is
built at 2026-08-06T22:43Z and already carries `under_head_chamfer_washer:
inferred`).

Every `untraced` value remains on an explicitly-listed gap, and the one
*downgraded* value was added to a gap entry rather than dropped (`vpa` gap 3, with
"confirmed absent 2026-08-06").

**Per the checklist's own instruction, the improved ratio got more scrutiny, not
less** — which is why check 1 above is a re-read of the scan rather than a
citation-shape check. Non-element values: the three seeded stacks hold none (no
materials, no temperature scenarios, no stiffness ratios), so for these stacks the
element ratio is the whole story, and the `--ratio` footer plus the thermal
worksheet's correction both say so explicitly. Good.

---

## Also verified

- **Tests.** Re-run by me, green, and the new tests are the right shape.
  `test_no_traced_element_cites_a_parts_list` is parametrized over every stack
  (a shape test, not a spot check) and has a twin over `hardware_entries.json`,
  closing the trap-17 laundering route. `test_the_two_re_cited_fastener_grips_trace_to_nas6403_sheet_3`
  pins the **printed inch cells** and derives the mm separately, so a
  unit-conversion slip can't hide behind a matching label — that is a better test
  than the handoff asked for. The doc-level test is unusual and worth keeping: it
  requires the current figure in every live doc and permits the superseded one
  **only inside a blockquote**, which encodes the repo's correct-in-place rule
  mechanically. It caught my own checklist edit mid-review; I reworded rather than
  weakened it.
- **The definition lives in one place.** `docs/SOP_TOLERANCE_STACK.md` § "The
  traced ratio"; `ARCHITECTURE.md`, `REVIEW_AGENT.md`, all four worksheets and the
  specs README quote the number and point at that section for the rule. Counting
  lives in one place too, and the test *imports* `_counts` rather than
  re-implementing it. This is the structural fix, not a number swap — exactly what
  the handoff asked for and the part that stops the next divergence.
- **`grep -rn "of 17"`.** No live document asserts the old figure. What remains:
  correction blockquotes (legal, and the test enforces it), the two closed issue
  files, a completed handoff, two prior review reports, and one live assertion in
  `docs/reference/` — see nit 3.
- **The `parts_list` question was decided, not deferred.** No exception, with the
  reasoning written down (two citations, one `source_ref`) and two worked examples.
  The handoff explicitly asked for a decision; it got one.
- **`data/inbox/specs/` not reorganised** — 64 files / 249,106,379 bytes, only the
  tracked `README.md` edited, no renames.
- **Nothing written into drawing-checker.** Its `data/inbox/specs/` holds only the
  2026-08-04 `MOVED_TO_TOLSTACK.txt` breadcrumb; newest run dir is 2026-08-04, i.e.
  nothing from this session. (The overlay is right that `git status` there proves
  nothing — I checked mtimes.)
- **Tests don't pollute production data** (universal check). Suite run in the
  worktree leaves `git status` clean and `data/` holding only its tracked
  `.gitkeep`/`README`/`PROVENANCE` files. Nothing wrote to
  `data/projections/` during the run.
- **Scope respected.** No `export`/`joint` provenance field touched
  (`citation_export_provenance`), no `scripts/build_viewer_projection.py` and no
  `apps/viewer/` change (`viewer_generated_checks`). No second combiner anywhere;
  no JS touched.
- **Schema hygiene.** `element_id`/`run_id` null on the new refs, `kind: "spec"` is
  in the whitelist, `confidence` in the vocabulary, `hardware_ref` unchanged and
  still resolving. `cell` used for a table row label follows the precedent
  `pitch_link_stack` set for this same document.
- **`forge check`** — OK in the review **worktree** (not just the main checkout).
- **`ARCHITECTURE.md`'s duplicated 18-line block was real**, not a
  misreading: `git show master:ARCHITECTURE.md | Select-String "The binding
  constraint"` returns 2, HEAD returns 1. Deleting it was the right call and the
  lesson records the merge-conflict cause.
- **The follow-up issues are honest about what was left.** Both new issues are
  well-scoped, and the reason for deferring — "sourcing extra values would move
  the number a reviewer was told to expect, for a reason they were not told about"
  — is the correct instinct. Both source issues are closed with `closed`/`closed_by`.
- **The lesson** is unusually good: it records the clobbered parallel-session
  artifact against its own interest, names the mechanism by which the error
  survived three reviews (including that *this checklist* supplied the stale
  constant), and explains why the moved test specimen moved.

---

## Findings

### Merge findings — the sibling handoff (resolved on the review branch)

**M1. A hard-coded cross-stack total broke on the merge, and it was a real
coupling, not a mechanical clash.** (`tests/test_tolerance_stack.py`,
`test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in`.)
`citation_export_provenance` backfilled `source_ref.export` onto 25
`drawing`/`parts_list` citations and asserted that total. This handoff re-cited two
of them to `kind: "spec"` — which that same handoff's
`test_every_drawing_citation_says_which_export_it_was_read_from` **exempts** from
the export requirement, because `data/inbox/specs/` is append-only so the filename
already identifies the bytes. So the true count on the merged tree is **23**: two
export blocks correctly dropped, not lost.

Resolved: count updated to 23, with the reasoning in the docstring and a note that
**a hard-coded total over all stacks is a cross-handoff coupling** — it moves
whenever any handoff changes a citation's `kind`, in either direction — and that
the invariant test already covers what matters. Each affected element's
`source_ref.note` now records that the sha256 was dropped deliberately and where
to find it (the sibling handoff's commit, and the same block still live on
`fastener_grip_13` / `under_head_chamfer_washer`). **Neither branch's suite could
have caught this.** `handoff/traced_labels_and_ratio` was green; `master` was
green; the merge was red.

**M2. Four other conflicts, resolved additively.**
- `PROVENANCE.md` — **both reviews had independently amended the same rows.**
  Merged into one row per file telling both stories in order, and the
  `test_tolerance_stack.py` row now carries the merged-tree counts, which are the
  only ones measured on a tree where both sets of tests exist.
- `docs/prompts/REVIEW_AGENT.md` — **both reviews independently wrote "Fourth
  sighting" of the byte-identical bug, for different handoffs, on the same day,
  neither knowing about the other.** Merged as fourth (`citation_export_provenance`)
  and fifth (this one). See B1.
- Both stack JSONs — the semantic conflict above; `under_head_chamfer_washer`
  keeps its parts-list export (still a parts-list citation, only the confidence
  claim changed) while both re-cited grips drop theirs.
- `tests/test_viewer_crops.py` — master rewrote this module wholesale around the
  new `resolve_pdf` API and deleted the test this handoff had patched
  (`test_a_stack_whose_joint_names_no_export_cannot_be_crop_resolved`). Took
  master's version entirely: the patch is obsolete, and master's replacement uses
  synthetic fixtures rather than reaching into real data by element id — which is
  the better fix for the coupling this handoff's lesson complains about.

Re-verified after resolution: **277 passed, 1 skipped**; ratio still 3 of 26;
re-derivation still 27 cells / 6.439e-15; `ARCHITECTURE.md` still has exactly one
copy of the binding-constraint paragraph.

### Blocker — fixed inline on the review branch

**B1. `PROVENANCE.md` was not amended for four files this branch changed —
fourth sighting of this repo's named recurring bug, in the handoff least able to
afford it.** (`PROVENANCE.md`, the `docs/tolerance_stacks/` and tests tables, and
the "Copied — the slice-1 lesson" section.)

A handoff whose entire purpose is to correct a false provenance claim left the
repo's provenance record making four new ones:

| row | claimed | actually |
|---|---|---|
| `stack_tan_link_to_pitch_plate.json` | `no — byte-identical` | changed (re-citation) |
| `stack_vpa_output_to_pitch_plate.json` | `no — byte-identical` | changed (re-citation + downgrade) |
| `WORKSHEET_tan_link_to_pitch_plate.md` | `no — byte-identical` | changed |
| `WORKSHEET_vpa_output_to_pitch_plate.md` | `no — byte-identical` | changed |
| `tests/debug_report_tolerance_stacks.py` | `yes — import note` | +69 **executable** lines (`--ratio`) |
| `tests/test_tolerance_stack.py` | Amended column stops at 71 tests / 193 suite | 82 in file, 252+1 in suite |
| `docs/reference/LESSONS_20260729_…` | "Verbatim apart from a prepended header" | +30-line correction block |

The overlay's entry for this bug is at three sightings and says *"the three
SOP-mandated files get remembered; the package files do not"*. This handoff
extends the pattern: the rows that go false are **whichever rows had never moved
before**. Nobody had ever edited a seeded stack JSON.

**Fixed inline** (precedent: `review/spec_library_v0` corrected the
`__init__.py` row the same way), because the content is fully determined by a diff
I had already read line by line, and leaving the record false was the larger risk.
Each amended row says it was amended during this review, states *"`source_ref` and
`note` only; no numeric field, path or check changed"* for the JSONs, and cites the
verification. I also replaced the intro paragraph's stale "three files have since
changed" count with the check that actually works
(`git diff master..HEAD --name-only` against the tables) and noted that every one
of these has been caught by a reviewer rather than an author. **If it recurs a
fifth time, mechanise it** — a test greping the byte-identical rows against
`git diff` is ~15 lines; I did not write it because it is out of this handoff's
scope.

**And it did recur a fifth time — in parallel.** Merging master revealed that
`review/citation_export_provenance` found the *same bug on the same two rows the
same day*, and both reviews independently wrote "Fourth sighting" into the
checklist without knowing about the other. That is five sightings, five inline
reviewer fixes, **zero author catches** — and two of the five were on handoffs
whose own subject was provenance. A human-executed check demonstrably does not
compose across concurrent work. The escalation trigger has therefore fired, and
per file-don't-fix I filed rather than built it:
`docs/issues/ISSUE_20260806_mechanise_the_byte_identical_provenance_check.md`,
priority high, with the five-sighting table and the five things the test must get
right (each one learned from a different sighting).

### Should-fix — for the next session, not a merge blocker

**S1. `docs/reference/` was edited, and the rule says it shouldn't be.**
(`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md:161`.) Both
`ARCHITECTURE.md` and this repo's review overlay state that `docs/reference/` is
verbatim imports — *"no edits beyond the import header. If imported reference and
this repo's docs disagree, the repo's docs change and the divergence goes in a
lesson."* The author inserted a dated `CORRECTION` blockquote there, deliberately,
and the lesson explains why (it is the paragraph the wrong number came from). The
handoff arguably authorised it: *"amend the same sentence everywhere it appears …
both lessons"*.

I let it stand rather than reverting, because the edit is purely **additive**,
dated, clearly marked, deletes and rewords nothing, and diffs cleanly against
drawing-checker's original — so the rule's *purpose* (imported reference stays the
authority) is not defeated. But the rule as written still says otherwise and that
is not a reviewer's call to make silently. **Recorded in `PROVENANCE.md` and
flagged in the overlay as an undecided question.** Someone should rule: either
(a) amend `ARCHITECTURE.md` and the overlay to sanction "an additive, dated
correction block, original text intact", or (b) revert the block and let the
correction live only in this repo's own docs, where all nine other copies of it
already are. I'd take (a) — but it's a rule change, so it's Jeff's.

**S2. `inferred` on a `kind: "workbook"` citation — the same defect one notch
down, and the same bolt is labelled two ways in two stacks.** Filed as
`docs/issues/ISSUE_20260806_inferred_on_a_workbook_only_citation_is_the_same_defect_one_notch_down.md`
(out of scope: this handoff was scoped to the three `traced` elements). Three
instances: `tan_link:washer_thin` (whose own note ends *"the +/-.004 is
untraced"*), `take2:straight_bushing`, `take2:fastener_grip_13`. The SOP says
workbook-only support is `untraced`; if something outside the workbook
corroborates it, the `kind` is wrong. Sharpest case: `fastener_grip_13` is
`parts_list`/`inferred` in `tan_link` and `workbook`/`inferred` in `take2` — the
same bolt in a restatement of the same joint, so one of the two is wrong about
where the number came from. The new test guards only the `traced` + `parts_list`
corner. This overlaps `ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`
and the two should be worked together.

### Nits

1. **`revision` lost the per-sheet detail.** Both new refs record
   `revision: "Rev 4"`, where `pitch_link_stack`'s `bolt_grip_11` records
   `"Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4 rev 2)"`. Sheet 3 —
   the sheet both new citations read — is per-sheet revision **NEW**. Not wrong
   (the document *is* Rev 4), but the fuller form is more useful and already
   established for this exact document.
2. **The tan-link gap table's columns changed meaning.** Gap 1's "what it would
   resolve" cell now holds status prose ("Element 11's grip … is now `traced`.
   **Still open:** …") while the priority cell holds a bare `2`. Readable, but the
   table's contract shifted for one row only. Also, unlike the vpa worksheet's
   equivalent, it doesn't mention that cotter-hole position `M` is now available on
   sheet 1 — harmless here (F8 is still blocked by gap 2 at priority 1) but the two
   worksheets now say slightly different things about the same document.
3. **One live non-blockquote assertion of the old ratio survives**, at
   `docs/reference/LESSONS_20260729_tolerance_stack_slice1.md:157` — a **bold**
   sentence stating the superseded figure, with its correction 4 lines below. It is
   outside the doc-test's `live_docs` list (that list excludes `docs/reference/`),
   so nothing catches it, and a skimmer can lift the bold sentence without meeting
   the correction. If S1 resolves as "keep the block", consider prefixing that
   paragraph with `**Superseded — see the correction below.**` so the claim can't
   travel alone.
4. `tests/debug_report_tolerance_stacks.py --ratio` lists all six stacks and marks
   the seeded three with `*`, which is right — but the `*`/space prefix lands
   inside the markdown table cell, so a pasted table shows a stray asterisk before
   the stack name. Cosmetic.

---

## Note for the next reviewer

- **The new tests do a lot of your check-7 work, so spend the time you save on
  check 1.** `--ratio` plus the doc-level test means a stale ratio now fails the
  suite. What they *cannot* check is whether a `traced` label is deserved. The
  ratio moving up is the signal to re-read the document, and this repo's document
  of record for both bolts is now `NAS6403-NAS6420 Rev 4.pdf` sheet 3 — a scan
  with no text layer, so `--pattern` finds nothing and finding nothing proves
  nothing. The crop commands are in check 1 above and in the lesson; three
  independent readings now agree on dash 11 / 13 / 14, so a fourth reader disagreeing
  should suspect their own crop first.
- **`hardware_entries.json` now disagrees with the stacks it serves** —
  `NAS6403U14D` and `NAS6404U13D` still carry
  `values_source: {kind: "workbook", confidence: "untraced"}` while the elements
  citing them are `traced` to the standard. Known, filed, deliberately deferred
  (`ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`) —
  don't re-report it as new, and expect the ratio to move to 5 of 26 when it lands.
- **Before rebuilding anything under `data/projections/`, check
  `git worktree list`.** That directory is shared by every worktree and written by
  absolute `--data-root`; this session clobbered a parallel session's `crops.json`
  and restored it. Read `built_by`/`built_at` in the file you're about to
  overwrite. Filed as
  `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`.
  I inspected the projection rather than rebuilding it, for exactly that reason —
  `citation_export_provenance` is still live.

## Verdict

**APPROVE.** One blocker (B1, PROVENANCE rows), fixed inline on the review branch
per the checklist's trivial-fix allowance and the precedent set in
`review/spec_library_v0`. Two merge findings from the sibling handoff (M1, M2),
resolved on the review branch — M1 was a genuine cross-branch test failure, so the
merged tree was red before it was green. Two should-fixes, neither a merge blocker:
S1 needs a rule decision from Jeff and is recorded rather than resolved; S2 is out
of scope and filed as an issue. Suite green on the merged tree, **277 passed, 1
skipped**, which is the only run that describes the tree that ships.

The substance is right, and the part that matters most is right for the right
reason: the two `traced` labels this handoff *kept* are backed by a page I read
myself, and the one it could not back it downgraded rather than argued for.
Correcting a repo's own headline calibration figure downward-in-honesty while
moving it upward-in-value, with the old number left visible everywhere, is the
behaviour this checklist exists to produce.
