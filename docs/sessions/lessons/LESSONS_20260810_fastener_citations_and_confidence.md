# LESSONS 2026-08-10 — fastener_citations_and_confidence

Handoff: `docs/sessions/active/HANDOFF_20260810_fastener_citations_and_confidence.md`.
Baseline `master` @ `d08b1ea`, i.e. `provenance_byte_identical_test` merged, as
`depends_on` required. Suite before: **318 passed / 1 skipped**. After: **325 / 1**.

> **Both figures are branch-only** (added by review, 2026-08-10). They were
> measured in the tactical worktree against baseline `d08b1ea`, and
> `viewer_projection_provenance` merged to `master` while this handoff was
> active. The tree that ships — `master` + this branch — reports **340 passed /
> 1 skipped** in a worktree and **341 passed / 0 skipped** in the main checkout
> (one test is data-dependent and skips where `data/` is gitignored-empty), both
> re-derived by the reviewer. Nothing conflicted and nothing failed; the counts
> above are simply true of a tree that no longer exists. Fourth sighting of the
> overlay's *"a sibling handoff landed on `master` while you were reviewing"* —
> and, as the third sighting predicted, the only symptom was a number.

## The five decisions, and the reasoning behind each

The handoff asked for decisions, not relabelling. Here they are with the
argument, because the argument is the part that does not survive in a diff.

### 1–2. Both `fastener_grip_13` instances → `kind: spec` / `traced`

Free, and the crop below is what makes it free rather than plausible. Sheet 3 of
`NAS6403-NAS6420 Rev 4.pdf` is one table for the whole NAS6403–NAS6420 family:
`Grip Dash No.` | `Grip ±.010` | then one `LENGTH ±.015` column per basic number.
**Both the value and the band come off the same page** — the value in the column,
the band in that column's own header — which is the thing a parts list can never
do and the whole reason these can be `traced`.

Row 13 → grip **.812**, NAS6403 length **1.135**, NAS6404 **1.182**.
Row 14 → grip **.875**, NAS6403 **1.198**.

Take 1's instance was `kind: parts_list` / `inferred` on 217755 find 95; take 2's
was `kind: workbook` / `inferred` on cell E52. Same bolt, same joint, take 2
being an explicit restatement of take 1 — so one of the two was necessarily wrong
about where the number came from and neither said which. Re-citing both to the
standard dissolves the question rather than picking a winner, which is why the
two source issues were merged.

`tan_link:fastener_grip_13`'s `source_ref.export` block was **dropped**, not
lost — exactly as `fastener_grip_14`'s was on 08-06, and for the same reason
(`kind: "spec"` is exempt; `data/inbox/specs/` is append-only so the filename
identifies the bytes). The same sha256 is still live on this stack's
`straight_bushing`, so nothing had to be preserved by hand.

### 3. `tan_link:washer_thin` → `untraced`

Its own note ended *"the +/-.004 is untraced"* while the field said `inferred`.
The handoff's "either parts_list or untraced, do not split the difference" test
resolves cleanly here: the parts list says `.032" MIN` — a **minimum**, not a
nominal with a band — so it supports neither number the stack folds. Only the
workbook says `.032 ±.004`. `untraced`, on the gap list, NAS1149 closes it.

### 4. `take2:straight_bushing` → `untraced`, and **deliberately not** matched to take 1

This is the decision most likely to be questioned in review, so the argument in
full. Take 1's instance of this same bushing is `kind: parts_list` / `inferred`
and **stays that way** — that is the SOP's sanctioned row-3 shape (parts list
gives the part and the nominal, band came from elsewhere, say so in the note),
and take 1's note does say so.

Take 2's is not the same object. It cites a workbook cell and nothing else: no
callout, no find number, no export block. Promoting it to `parts_list` to match
take 1 would mean **adding** a citation to a document that prints neither the
band nor even this nominal — `.1875 × 25.4 = 4.7625`, and the element carries the
workbook's hand-typed `4.762`. That is manufacturing corroboration to improve a
label, which is the failure this whole line of work exists to prevent.

So the two instances now cite two different documents and are each graded for the
document they cite. That is *not* the `fastener_grip_13` defect recurring: there,
both instances told inconsistent stories about one value and neither was right.
Here both stories are true. Unlike the bolt, there is no document that would make
both `traced` — 214820-002 is a Joby detail part whose drawing is not in the repo.

### 5. `thread_transition` — decided, and left exactly as it was

**The standard does not give this quantity.** The value stays 1.5875 mm,
`kind: assumed`, `untraced`, and stays a listed gap. What sheet 1 gives:

- `T (Ref)` = **.323 in** for NAS6403, which is **length minus grip**
  (1.135 − .812 = .323, exactly, from the sheet-3 dash-13 row). That is the whole
  region from the end of the full cylindrical shank to the point — thread,
  run-out and point chamfer together. The 1/16 in modelled here is the run-out
  *inside* that region. Taking `T` would have replaced a 1.6 mm allowance with an
  8.2 mm one on no better authority.
- Sheet 2 note (b): *"Reference dimensions are for design purposes only, not an
  inspection requirement."* `T` is a reference dimension.
- The only other sheet-1 candidates are ruled out **by arithmetic, not by
  reading**: `X (g)` = .156 in and `Y (h)` = .094 in, and sheet 2 defines them as
  "5 thread pitches" and "3 thread pitches" of locking-element engagement. At the
  .1900-**32** pitch of 1/32 in: 5/32 = .15625 and 3/32 = .09375. They are
  locking-element regions measured from the threaded end, not run-outs, and the
  pitch arithmetic confirms the note rather than the note being taken on trust.

The document that would close it is **MIL-S-8879**, which sheet 1 invokes for the
UNJF-3A threads and which is not in `data/inbox/specs/` — the same gap
`hardware_entries.json:NAS6403U11D` already recorded. All of this is written into
the element's own `note`.

**Before/after on the shank-out checks: identical, to the last digit.** Verified
by diffing the whole `debug_report_tolerance_stacks.py` output across the change:

```
shank_out__13_thick  | F30/H30 |  0.8849 |  0.0893 | 2.9566 |  0.6668 | 2.3791 | pass
shank_out__14_thick  | F31/H31 | -0.7153 | -1.5109 | 1.3564 | -0.9334 | 0.7789 | fail
shank_out__13_thin   | **new** |  0.0975 | -0.6473 | 2.1184 | -0.1131 | 1.5842 | marginal
shank_out__14_thin   | **new** | -1.5027 | -2.2475 | 0.5182 | -1.7133 | -0.0160 | fail
```

Not one check row anywhere in the repo moved. The whole session is a
provenance-label change.

## The crops that verified it

`NAS6403-NAS6420 Rev 4.pdf` is a **scan with no text layer**, so `--pattern`
finds nothing and finding nothing proves nothing. Everything above was read by
vision off a rendered crop. PyMuPDF is deliberately not in tolstack's
`requirements.txt`; run the tool from drawing-checker's venv.

```powershell
$PY  = "C:\workspace\drawing-checker\venv-win\Scripts\python.exe"
$PDF = "C:\workspace\tolstack\data\inbox\specs\NAS6403-NAS6420 Rev 4.pdf"

# sheet 3, the dash-number rows -- rows 1-21, grip + both length columns
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,140,190,70"    --zoom 8   --out s3_rows.png
# sheet 3, wide -- proves `LENGTH ±.015` and `BASIC NUMBER AND THREAD SIZE`
# are COLUMN GROUP HEADERS spanning every basic number. This is the crop the
# 08-06 lesson did not have; it is what makes "the band is in the header"
# checkable rather than a claim about a cropped-off row.
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,300,120,180"   --zoom 5   --out s3_head_wide.png
# sheet 1 whole page -- the side-elevation figure and the dimension table
& $PY tests\debug_trace_stack_values.py $PDF --crop "1,305.5,421,421" --zoom 2.2 --out s1.png
# sheet 1, the figure alone -- what Grip, Length, T, M, X, Y actually span
& $PY tests\debug_trace_stack_values.py $PDF --crop "1,300,140,130"   --zoom 7   --out s1_fig.png
# sheet 1, the M / N / P columns legibly
& $PY tests\debug_trace_stack_values.py $PDF --crop "1,410,290,60"    --zoom 12  --out s1_MP.png
# sheet 2 -- CODE block and notes (a) (b) (g) (h) (j)
& $PY tests\debug_trace_stack_values.py $PDF --crop "2,305.5,421,421" --zoom 2.2 --out s2.png
```

Two gotchas for the next reader of this scan:

- **`--crop` is `page,cx,cy,halfwidth`** — a *square* centred on a point, not a
  rect. Getting the column you want takes one or two misses; `--crop
  "1,305.5,421,421" --zoom 2.2` renders a whole 611×842 pt sheet and is the
  cheapest way to find coordinates.
- **Sheet 1's `P` cell for NAS6404 is merged across the NAS6404 and NAS6405
  rows.** Read the row rules, not the vertical position. Anyone transcribing
  sheet 1 will hit more of these.

## `kind == "workbook"` ⟹ `untraced` is **false**, and that is the finding

Deliverable 5 asked me to prototype the rule the issue proposed. Prototyping it
is how I found it does not hold.

`hub_bearing_thermal_fit_m1`'s `hub_bore_lower` and `hub_bore_upper` cite the
260209 workbook and are `inferred`, and they are **right**. Their support is not
workbook-only: `212966-006 rev A` — a later revision of the same part drawing, in
hand — prints the identical value *and* the identical band at sheet 3 DETAIL E/D,
and both notes say exactly that, name the weakness (*"the bore could have changed
at -005 and changed back"*) and pre-authorise the downgrade if the inference is
rejected. That is a stated judgement resting on a second document, which is what
`inferred` is for.

The generalisation: **`kind` records which document the numbers were transcribed
*from*, and corroboration can arrive from a different document named only in the
`note`.** So the two fields are not in the implication relationship the issue
assumed.

Three ways to write the guard, and why the third won:

1. **The implication as stated.** Fails on two correct elements. Satisfying it
   would mean relabelling them to `untraced`, i.e. making the record worse to
   satisfy a test — the exact inversion this repo keeps catching.
2. **"unless the note names another document."** A grep, and a grep whose
   pattern matches the thing under test — precisely the vacuous-check costume the
   last session's review found in `_POINTER_RE`. Rejected on that precedent.
3. **An allowlist.** `_WORKBOOK_INFERRED_ALLOWED` holds `(stack_id, element_id)`
   pairs with the argument written above it. Adding a `workbook`/`inferred`
   element means editing the test and writing down why, which makes each
   exception a deliberate reviewed act. One line per exception.

Shipped as (3), plus `test_the_workbook_allowlist_has_no_dead_entries` — an
allowlist that outlives its exceptions silently unguards whatever inherits those
ids, which is the same class of bug as a vacuous check.

**What the test does NOT cover, stated so nobody assumes otherwise:** whether the
`note` agrees with the field. An element correctly marked `untraced` whose note
claims a standard supports it passes. And the test cannot tell whether a
registered exception's *argument* is still true. Both are in
`docs/prompts/REVIEW_AGENT.md` check 1, which now names the test and both of its
blind spots rather than just restating the rule.

## The ratio moved for two reasons in opposite directions

**3 of 26 → 5 of 26** across the three seeded stacks; 3 `inferred` (was 7),
18 `untraced` (was 16). All stacks: 19 → **21** of 48.

The numerator rose by two and the `inferred` column more than halved, because
two elements went up to `traced` and two went down to `untraced` in the same
commit. **`untraced` going up is the system working**, and the SOP now says so
in the ratio section: a ratio that only ever climbs is a ratio someone is
managing rather than counting.

Recomputed with `tests\debug_report_tolerance_stacks.py --ratio` (from a
worktree: `C:\workspace\tolstack\venv-win\Scripts\python.exe`), never copied.
Eight live documents quote it and all eight are updated; the doc-level test
enumerates them.

**One judgement call left undone deliberately:** the doc test's `superseded`
constant still only catches `"of 17"`, not the now-superseded `"3 of 26"`. I
considered extending it and did not, because the correction blockquotes this
handoff added quote `3 of 26` legitimately and a second superseded string starts
a list that grows on every future move. The `missing` half — every live doc must
state the *current* number — is what actually catches staleness, and it did:
it named all eight files.

`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md`'s 08-06 correction
block still says "3 traced of 26". **Left alone on purpose.** It is a *dated*
correction inside an insert-only import, and it was accurate on its date; the
insert-only rule allows appending another dated block but not editing that one,
and chaining a correction-to-a-correction into a frozen import for a number that
will move again is worse than leaving a dated statement dated. Anyone following a
pointer in lands on a block whose first word is a date.

## `hardware_entries.json` had gone false, not just stale

Three entries carried `values_source: {kind: "workbook", confidence: "untraced"}`
with `gaps` reading *"the NAS6403 standard, absent from this repo"* and *"NAS6404
standard absent"* — **claims about a file sitting in `data/inbox/specs/`**, in the
repo whose worst-defect class is a provenance record making a false claim. Two of
the three had also disagreed with the stack elements they serve since 08-06.

All three re-sourced to sheet 3. The false gap lines are rewritten as dated
`CLOSED` lines with the *true* remaining gap beside them, not deleted — the
remaining gap being the thread run-out, which NAS6403 does not dimension.

Counts moved with them (`eight of the fifteen` → `five`, `THREE entries are
traced` → `SIX`) and the test pinning the prose caught every one. One more stale
count was found in passing and fixed: `NAS6403U11D`'s `library_ref_note` said
*"The other twelve entries"*, written against a 13-entry file that became 15 when
`hub_bearing_thermal_stack` added the bearings.

Note the orthogonality that re-sourcing does **not** change: `values_status` stays
`inline`. `values_status` says who owns the numbers (the spec library owns
`NAS6403U11D`'s); `values_source` says where they came from. Being printed in the
standard is not the same fact as the library owning them. Promoting the three
bolts into the spec library is real follow-on work and is out of scope here.

## The byte-identical test's first real branch — it worked

The handoff predicted this and it is worth recording as evidence rather than
expectation. Six rows needed amending, and the suite named all six with the text
to append, on my machine, before any review:

`stack_tan_link_to_pitch_plate.json`, `stack_tan_link_to_pitch_plate_take2.json`,
`hardware_entries.json`, both tan-link/vpa worksheets, `test_tolerance_stack.py`.

**`take2`'s row was one of the two in the whole document still claiming
byte-identity**, and it went false here — which is exactly the sighting shape the
test was built from. `tests/__init__.py` (empty) is now the only remaining
byte-identical claim in `PROVENANCE.md`, and I recorded that in the document,
because it is the number that will move next.

The check's honest limit showed up too: it asserts the cell *moved*, never that
what it says is *true*. So I verified the "no numeric field changed" claim myself
before writing it, the same way `traced_labels_and_ratio` did — strip
`source_ref`/`note` from both revisions and compare the structures:

```powershell
# both seeded stacks: structurally identical minus source_ref/note -> True
```

plus the full report diff quoted above. That verification is what makes the row
true; the test only made me write a row.

## One pre-existing test told me how to fix it, and it was right

`test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in`
hard-coded **23** backfilled exports. Re-citing `fastener_grip_13` made it 22.
Its own docstring, written after the same thing happened on 08-06, said: *"A
hard-coded total over all stacks is a cross-handoff coupling… If it churns again,
assert the invariant rather than the total."*

It churned again, so I took the instruction: the total is gone and the test now
asserts the invariant in both directions (an `export` implies no `run_id`; no
`element_id`/`run_id` is filled anywhere), which is what the test was always
*about* and which the total never actually checked. **A docstring that names its
own replacement condition is worth writing** — it turned a five-minute "is this
count wrong or is my change wrong" into a decision already made by someone who
had the context.

## Read-only invariant — drawing-checker

`before.json` was taken at **step 0, before this session's first drawing-checker
access of any kind** (the earliest was `import fitz` against that repo's venv,
after the snapshot). So unlike the last session, this window spans the whole
session rather than a suite run.

```
before.json  1628 entries at 2026-08-11T04:07:44Z
after.json   1628 entries at 2026-08-11T04:34:53Z
drawing-checker snapshot diff: EMPTY -- no entry added, removed or modified.
```

`HEAD` `58d62a3`, unchanged. Accesses this session: `git cat-file blob` /
`git rev-parse` / `git log` via the test suite's cross-repo check, and running
`venv-win\Scripts\python.exe` from that repo for PyMuPDF. No file in it was
opened for writing and no pipeline was run.

**One thing I did that the last lesson said not to:** I ran
`git -C C:\workspace\drawing-checker status --porcelain` once at the end, and
that lesson had specifically flagged that `git status` can refresh the stat cache
in the other repo's `.git/index`. It reported the same three untracked paths that
repo has carried for days (`data/inbox/specs/`,
`data/projections/review_manifest_20260729.md`,
`pipeline/prompts/region_detection_nofs.md`). The snapshot is the evidence and it
is clean; the `git status` added nothing the snapshot did not already say, which
is the SOP's whole point about it. **Don't reach for it.**

## Left to do

- **`ISSUE_20260810_nothing_sweeps_the_spec_pile_against_open_gaps.md` — filed,
  and yes it is worth building.** The handoff asked me to say whether. The
  evidence is in the issue: `NAS6403-NAS6420 Rev 4.pdf` sat in the pile from
  founding and answered **ten citations across eight rows** of that issue's
  table, closed a couple at a time by three handoffs over seven days, each of
  which re-cited the elements its own scope named and left the identical question
  unasked one row down the same table. The join is worth writing for one specific
  reason: **it must match on the standard designator, not the filename.**
  `NAS6404U13D`'s gap said "NAS6404 absent" while the answering file is named
  `NAS6403-NAS6420 Rev 4.pdf` — a filename substring match finds nothing; a range
  match (`NAS<lo>-NAS<hi>`, test membership) finds it. Same shape for
  `MS9363 Rev C.pdf` vs `MS9363-09`/`-10`.
- **It must report, not enforce, and `thread_transition` is why.** Its gap names
  NAS6403; NAS6403 is in the pile; NAS6403 does **not** give the quantity. A test
  that failed on "gap names a document now present" would have demanded a
  re-citation that would be wrong. Present ≠ answers.
- **A live instance the sweep would already catch, left unfixed as out of
  scope:** `hardware_entries.json:MS9363-09`'s gap says nut height, slot count
  and slot depth are *"still missing"*. `MS9363 Rev C.pdf` landed 2026-08-05 and
  per `ARCHITECTURE.md` gives nut height, slot count and slot width. That gap has
  described a closed question for five days. Named in the issue.
- **Promoting `NAS6403U13H` / `NAS6403U14D` / `NAS6404U13D` into the spec
  library**, the way `spec_library_v0` promoted `NAS6403U11D`. They now cite the
  same document and the same sheet; the library subject already exists for the
  -11. Cheap, and it is the demonstration that the seam scales past one entry.
- **`data/projections/viewer/` was not rebuilt.** The re-citations make two more
  elements resolvable by the `spec_pile` rule (the 08-06 lesson observed the same
  for the -14), so the crops projection is now understated. Deliberately not
  regenerated: it is one directory shared by every worktree and clobbering it is
  a filed issue (`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`).
  Whoever rebuilds it next gets the improvement for free.
- **`take2:straight_bushing` vs `tan_link:straight_bushing`** now cite different
  documents at different confidences for the same part. Argued above and I stand
  by it, but it is the one call in this session a reviewer might reverse — and if
  it is reversed, the fix is to *downgrade take 1*, not to promote take 2.

## Coordination note for `sop_library_ref_pairing`

That staged handoff edits `docs/SOP_TOLERANCE_STACK.md` at the `library_ref`
sites (lines 66, 409, 442–445, 691, 743). This handoff edited the same file's
**§ "The traced ratio"** only — the figure `3 of 26` → `5 of 26`, `19 of 48` →
`21 of 48`, and one added paragraph about the ratio moving in both directions.
Different sections, no overlap. Whichever rebases second: check the ratio
paragraph survived, and note that `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
will catch it if it did not.
