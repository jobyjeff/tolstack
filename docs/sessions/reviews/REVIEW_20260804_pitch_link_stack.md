---
type: review
handoff: HANDOFF_20260803_pitch_link_stack
reviewer: review agent (claude, review/pitch_link_stack)
date: 2026-08-04
verdict: APPROVE
blockers: 1 (fixed inline)
---

# REVIEW — pitch_link_stack

Reviewed `master..handoff/pitch_link_stack` — 3 commits, 8 files, +1476/−28.
First subject of this repo's seven stack checks, and the SOP's first consumer.

**This was run as a provenance audit, not an arithmetic review.** I opened every
document the stack cites — the NAS6403 photocopy at 8× on three sheets, the
215197 part drawing, JPS00094, the 217755 parts list and the balloon layer — and
read the values off them myself before comparing. Method and result per check
below.

## Pre-work state, then the merge

On `master` the stack does not exist and the suite is **34 passed** (the SOP's
figure). I wrote eight provenance tests carrying **my own** readings of NAS6403
sheets 1 and 3, 215197 sheet 2, and the 217755 parts list; against `master` all
eight fail (7 errors + 1 failure). Merged `handoff/pitch_link_stack`, re-ran:
**all eight pass**, so the stack agrees with the documents as *I* read them, not
merely with itself. Full suite **50 passed** post-merge (51 with the test I added
— see finding 2). `git status --short` clean after every run: **no data
pollution**. `forge check` **OK on this worktree**, not just the main checkout.

The merge hit one conflict: `master` had moved the handoff to `active/` while the
branch moved it to `completed/`. Resolved in favour of `completed/` — the work is
done. (The branch also predates `9b155fd`, so `master..handoff` shows the
git-remote issue reverting to `open`; that is the branch being behind, not an
edit. The merge kept `master`'s version.)

---

## The seven mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — **PASS**, verified document by document

Six element instances, six `source_ref`s, every `confidence` valid. I opened all
four cited documents. **Every one exists and says what the stack says it says.**

| element | citation | what I read, independently | |
|---|---|---|---|
| `bolt_grip_11` | `NAS6403-NAS6420 Rev 4.pdf` sh3, row *Grip Dash No. 11* | rendered the row at 8×: `11 │ .688 │ 1.011` under headers `Grip ±.010` and `LENGTH ±.015 (See Note Below)` | ✓ `traced` |
| `bolt_length_11` | same row, column `NAS6403 .1900-32` | `1.011`; sheet-3 closing note reads *"Nominal length equals nominal grip plus 'T' (see Sheet 1)"* | ✓ `traced` |
| `cotter_hole_from_point` | same file sh1, table column `M`, NAS6403 row | `M = .174 / .154`, `P = .080/.070` | ✓ `traced` |
| `pitch_plate_flange` | `215197` sh2 zone **D10** `SECTION A-A` | text-extracted: **`5X 4.06 ±0.10 ⌖⌀0.2 A B C ⊥0.05 G 5X INDIVIDUALLY`** — the callout, the GD&T *and* the `5X INDIVIDUALLY` annotation all exactly as the element's note claims | ✓ `traced` |
| `bushing_214820` | `217755` sh4 parts list find 34 | `214820-002 BUSHING, PLAIN, ALUMINUM BRONZE, .1900" ID X .1875" LONG`, qty 8 | ✓ `inferred` |
| `washer_nas1149v0332` | `217755` sh4 parts list find 32 | `NAS1149V0332H WASHER, FLAT, 6Al-4V, .203" X .438" X .032"`, qty 9 | ✓ `inferred` |

Zone **D10** re-derived from the printed border ticks myself (letters A@y1100 →
H@y58, numbers 12@x60 → 1@x1609; the callout at x334/y607 lands in D10) — not
taken on trust, and not computed from percentages. The `1X` group is at sheet 1
D5 and the `3X` at sheet 2, both confirmed present and distinct; exactly three
`4.06` hits exist in the file, matching the stack's claim of three groups.

**The invented-number hunt, which is the point of this check.** The highest-risk
values in any stack are standard-part dimensions, and this stack has four of
them. All four are the *traced* ones, and all four are in
`data/inbox/specs/NAS6403-NAS6420 Rev 4.pdf`. I confirmed the supporting prose
verbatim too, because a decode claim is as falsifiable as a dimension:

- sheet 2 note (a): *"Grip-length of bolts shall be measured from the underside of
  head to the end of the full cylindrical portion of the shank."* ✓ exact
- sheet 2 CODE block: *"Dash number indicates grip in .0625 increments"*, *"Add
  'D' after dash number for drilled shank"*, *"Add 'U' after basic part number for
  unplated bolts"* ✓ exact — so `NAS6403U11D` really does decode to a
  cotter-retained drilled shank from the part number alone
- sheet 2 note (j): *"Cotter pin hole centerline: Within .010 and normal within 2°
  of bolt centerline."* ✓ exact
- sheet 2 note (b): *"Reference dimensions are for design purposes only, not an
  inspection requirement."* ✓ exact (this is what makes F5 correct)
- `JPS00094` Rev C 05/Sep/2024 — §5.5.5, §5.9.7 *Castle Nuts* (with the
  thread-start-to-castellation footnote), §5.5.3.a (three-washer cap) and §5.7.6.a
  (NASM24665) all quoted **verbatim**, on the document's own *"Page 3 of 14"* and
  *"Page 7 of 14"* (PDF pages 15 and 19 — the citation is to the printed page
  number, which is the right choice and is precise)

`.688` is also corroborated a second way: the 217755 nomenclature independently
reads `.190"-32 X .688" GRIP`. Two documents, one number.

**Nothing in this stack is unsourced or invented.** I went looking specifically
for the failure this checklist exists to catch and did not find it. What I found
instead is the opposite failure mode handled deliberately: the pitch-link eye
width, the one value with no document, is **not modelled at all** rather than
filled — see check 7 and the *Refused* table, which is the most valuable artifact
in the deliverable.

### 2. Signs on every path term — **PASS** on the terms; **one directional error in the prose** (finding 2)

Three paths, two checks, eleven terms, read one at a time. Two negative signs
exist in the file and both are correct: `cotter_hole_from_point` in
`head_to_cotter_hole` (`length − M` locates the hole from the head) and
`bolt_grip_11` in `thread_region_T` (`length − grip = T`). Nested `path` terms in
both checks expand with their signs multiplied through correctly — verified by
folding and matching against hand arithmetic to 4 dp on all five results. **No
element is double-counted**: `bolt_grip_11` appears in `thread_region_T` and in
`shank_out__11_sourced_only`, but that path is referenced by no check, so no fold
sees it twice. A test pins the exact list of negative terms, which is the right
instinct.

The sign error is **outside** the term list, in the sentence that interprets the
result — see finding 2. New failure class; appended to this check in the
checklist.

### 3. LMC/MMC direction, per element — **PASS**, and the `max == mmc` smell is legitimately explained

Three elements carry `lmc`/`mmc` and all three read `max == mmc`. That is the
smell §3 tells me to chase, so I chased it: **there is no subtracted material
feature in this joint** — no chamfer, no relief, no counterbore. I checked the
element list, the roles, and the sign structure: every element is an additive
external length or a hole location, and the only negative signs are whole-element
and whole-path subtractions, not material removal. `pitch_plate_flange`,
`bolt_grip_11` and `bolt_length_11` are all additive external lengths, so
MMC → longest → `max` is correct for each.

`cotter_hole_from_point` carries `lmc: null, mmc: null` **deliberately**, and the
reasoning is right and worth keeping: it is a *location*, and "most material" has
no meaning for where a hole sits. The two zero-width elements carry nulls too,
correctly — there is no transcribed material condition to record.

`fold()` was **not** modified to read `lmc`/`mmc`. The only change to
`tolerance_stack/stack.py` in the whole diff is one comment on `SourceRef.kind`
(see finding 1); `fold()` still reads `min`/`max` only, and `CheckResult.verdict`
still cannot see RSS.

§3 as written had no legal exit for this joint. I have added one to the
checklist — an *earned* exit that requires the author to state the absence and
the reviewer to confirm it, which is what happened here.

### 4. RSS actually computed — **PASS**, all three numbers present, verdicts blind to RSS

Not labelled: computed, with numbers in it. Recomputed from the JSON myself:

| check | nominal | WC min | WC max | RSS min | RSS max | verdict |
|---|---|---|---|---|---|---|
| `shank_out__11_sourced_only` | −7.8399 | −8.1939 | −7.4859 | −8.1129 | −7.5669 | fail |
| `cotter_hole_clear_of_sourced_stack` | 11.8785 | 11.1435 | 12.6135 | 11.4098 | 12.3472 | pass |

All three columns present as one set on both checks and on all three paths.
Neither verdict reads RSS (`fail` follows from nominal and WC min; `pass`
likewise). RSS half-ranges check out by hand: √(0.10² + 0.254²) = 0.27298 and
√(0.381² + 0.254² + 0.10²) = 0.46870.

The worksheet **does** state what RSS does not claim, in its own section, and it
found a third caveat the SOP does not list: **a zero-width band is an *unknown*
band, and RSS reads it as zero variance**, so these half-ranges are understated
rather than merely non-probabilistic. That is a genuine addition, not a
restatement. It also correctly notes that `bolt_length_11` and `bolt_grip_11` are
not independent (F5), and that `rss_center == nominal` throughout here precisely
because every nominal *is* its own midpoint — so slice 1's re-centering artefact
cannot occur. No `role: "allowance"` element and no one-sided band exists in this
stack, and the absence is explained rather than left silent.

### 5. Nominal inside its own min/max — **PASS**, and not by silent correction

Computed for all six: `min ≤ nominal ≤ max` holds everywhere. I checked the
harder half of this check too — that no transcription was quietly adjusted to make
it hold — by comparing against the source documents rather than against internal
consistency. Five of six nominals are stated basic sizes with a **symmetric
tolerance printed by the source** (`Grip ±.010`, `LENGTH ±.015`, `4.06 ±0.10`,
and two parts-list nominals with no band at all), so the symmetry is the
document's, not the author's. Nothing was nudged.

The sixth, `cotter_hole_from_point`, **is** a computed midpoint —
`.174/.154 → .164` — and the author flagged it themselves as F2 and as a case the
SOP's "transcribe, never compute" rule does not cover. That is the correct
handling: recorded as a finding, not hidden. A NAS dimension table has no nominal
column and the schema requires the field; there was no other legal move. The
proposed SOP edit 3 fixes the rule.

### 6. Quantised constraints where cotter/castellation hardware appears — **PASS**, and better than the SOP asks for

The joint is retained by **MS9363-09** (`NUT, SLOTTED, HEXAGON, SHEAR`, find 33)
plus **MS24665-153** cotter pin (find 36), through a drilled shank confirmed from
the part number itself. So this check applies in full, and:

- the quantised-grip statement is present, and it is **next to the numbers** — in
  the worksheet immediately after the Checks table, in the check's own `guidance`,
  and in the stack `notes`. Not buried in a gaps section;
- the closing documents are named: **MS9363** slot count, slot depth and nut
  height. The *bolt* half is now closed (`M = .174/.154`), which is stated;
- the "clean interval implies a resolved joint" failure is actively prevented: the
  passing check is labelled `INCOMPLETE`, and the worksheet says in a call-out box
  that neither verdict is a design conclusion.

Beyond the requirement: slice 1 had to assert the quantisation from first
principles (F8/F16). This session **traced it to a specification** — JPS00094 Rev
C §5.9.7 says in as many words that when hole and castellation do not align you
*"change/add a washer or a different nut, and try again"*, with a footnote that
nuts vary in manufactured thread-start-to-castellation spacing, and §5.5.3.a caps
the remedy at three washers. I read both passages in the PDF; both are verbatim.
That converts the repo's biggest standing assumption into a citation.

Transcribed-but-unused nut geometry: **none exists**, correctly — MS9363 is not in
the pile, so there is nothing to transcribe. The stub is the gap entry instead.

### 7. Traced / inferred / untraced ratio — **PASS**. My count, computed from the JSON:

> **4 traced / 2 inferred / 0 untraced, out of 6 element instances.**

Matching the worksheet's claim exactly. Plus **one element that does not exist
because it could not be sourced** (the pitch-link eye / spherical bearing) and
**two of the six carrying a zero-width band** because no document gives one.

`untraced` appears zero times, so the SOP's one rule is satisfied trivially — and
every gap is listed anyway, ranked, each naming the document that would close it.
I checked the inverse direction too: nothing missing from the gap list.

**A high traced ratio is a reason to audit harder, and I did** — that is what
check 1 above is. 4 of 6 survived opening every document. The worksheet's own
three caveats on the ratio are honest and I agree with all three, particularly
that three of the four traced values are one bolt standard that was sitting in
`data/inbox/specs/` the whole time: **this run is evidence the workflow works, not
that an agent can source values that are not there.**

Worth recording against the calibration figure: counted mechanically,
`confidence == "traced"` over the three *seeded* stacks is **4 of 26**, not the
"1 of 17" every document in this repo quotes. The quoted 1 is the count traced to
a part drawing or spec; three seeded elements carry `traced` on a parts-list ref
whose band their own note admits is untraced. Filed as
`ISSUE_20260804_three_seeded_elements_are_traced_but_their_bands_are_not.md` —
**not** a finding against this handoff, which labelled its own two parts-list
values `inferred`, i.e. applied the rule the seeded data breaks.

---

## Also verify

- **Tests.** Re-run, not trusted. **50 passed** post-merge, **51** after my added
  test. 14 new test functions plus 2 new parametrized cases (34 → 50), matching
  the lesson's "16 new tests". Every new numeric assertion carries the document
  and address in a comment (`# NAS6403 sh3 dash 11`, `# 215197 sh2 D10 "5X 4.06
  +-0.10"`) per Step 5b, so the suite is a provenance check rather than a
  self-consistency check. The `ALL_STACK_FILES` hoist plus
  `test_the_stack_file_list_is_complete` is a good structural addition: a future
  stack cannot be added without the hygiene tests applying to it.
- **Re-derivation table.** Correctly **omitted**, with a note saying why (no source
  workbook, so the fold is the only computation). This is Step 5b's instruction,
  followed exactly. `--compare` on the three seeded stacks is unchanged by this
  work.
- **Schema hygiene.** `element_id`/`run_id` null on all six; `library_ref` null on
  all 13 hardware entries; every entry's `gaps` non-empty; every `hardware_ref`
  resolves (`214820-002`, `NAS1149V0332`, `NAS6403U11D`); `values_status: "inline"`;
  `schema` string present and `/v0`. All pinned by tests. One additive extension —
  `values_source` — see finding 3.
- **Checks the source does not contain.** N/A by construction and handled
  correctly: every check is new, so `workbook_cells: null` and `[NOT IN WORKBOOK]`
  are dropped rather than stamped on everything, with a test asserting the absence
  and the worksheet saying the whole stack is original. `kind: "workbook"` appears
  zero times, as Step 5b requires.
- **Scope stated**, with exclusions and reasons: grip length along the bolt axis
  only; diameter/hole fits, bushing-to-bore interference (JPS00176), the pitch
  link's internal stack, the joint at the link's other end, torque and preload all
  named as decisions.
- **Diagnosis codes.** F1–F8 all tagged. **Two `[read]` findings are present** —
  F1 (dimension `M`'s meaning read off a figure) and F6 (balloon `nX` prefixes
  absent from the extraction). Their presence is what the checklist looks for, and
  both are real: I reproduced F6 exactly (`quantity_rollup` reports
  `qty_match: False` for finds 32/33/34/35/36/38 and `True` for 31, and every
  DETAIL B balloon record reads `qty: 1, view_places: 1`), and F1 I re-checked at
  9× — see below.
- **Mismatches recorded, not reconciled.** F3 (the washer nomenclature lost its
  `MIN` qualifier and thread call between exports) and F4 (DETAIL B's printed zone
  moved from I6 to H3 between exports) are both recorded as `[drift]` against the
  drawing, not corrected in the stack. Correct handling. I confirmed the current
  export's nomenclature has no `MIN`, and re-derived the H3 zone off sheet 4's
  border ticks myself.
- **`data/inbox/specs/` not reorganised.** Verified against `PROVENANCE.md`'s
  recorded figures: **42 files, 111,575,456 bytes** — exact match, and the newest
  non-`README` file dates from February. No renames, no additions, no
  de-duplication. The diff touches no `data/` path.
- **Nothing written into drawing-checker.** Its `git status` carries only
  pre-existing untracked entries, all predating 2026-08-03. But see
  `ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`: that check is
  vacuous, because everything the pipeline writes there is gitignored. I chased
  the one run the stack cites — `20260804_114000`, created 11:40 on the session
  day — as far as the evidence goes: `run_meta.json` says `"purpose": "test"` with
  a `+dirty` `pipeline_commit`, and drawing-checker merged three of its own
  handoffs between 15:19 and 16:13 that day, so it is theirs. The author's claim
  holds; the *method* for checking it does not.

### F1 re-checked, since the author asked for a second pair of eyes

F1 is the stack's own flagged weak point: dimension `M`'s *meaning* is read off
the sheet-1 figure, and the standard never defines it in words. I confirmed that
last part — sheet 2's notes run (a)–(k) and none mentions `M`. Then I rendered the
figure's right-hand end at 9×. **I concur with the author's reading:** the
vertical extension line at the cotter-hole centreline (the drilled hole symbol
with its `Drill P (j)` leader) runs up to `M`'s left terminator, and `M`'s right
terminator sits on the bolt's point face. `M` is the hole's setback from the end.

Both of the author's corroborations also hold, and I verified them independently
rather than accepting them:

- **`X` and `Y` are not the cotter hole.** Sheet 2 note (g): *"'X' minimum (5
  thread pitches) = region of minimum engagement of female thread required to meet
  MIL-F-18240 requirements"*; note (h): *"For ease of starting, locking element
  shall not be effective in 'Y' area (3 thread pitches)."* The second table prints
  `X = .156, Y = .094` for NAS6403 — and 5/32 = .15625, 3/32 = .09375. Locking
  element regions, to the digit.
- **`M` scales like a hole setback across the family:** NAS6403 `.174/.154` with
  `P .080/.070`; NAS6404 `.180/.160` with `P .086/.076`. Confirmed in the table.

Residual ambiguity in that figure is on `X`'s terminators, not `M`'s, and nothing
in this stack folds `X`. F8 also confirmed: sheet 1's `LIST OF CURRENT SHEETS`
names five sheets (1 rev 4, 2 rev 2, 3 NEW, 4 rev 2, 5 rev 3) and the PDF holds
four — **sheet 5 is genuinely missing**, and nothing this stack uses is on it.

---

## Findings

### blocker — fixed inline by me (1)

**1. `PROVENANCE.md` declared three changed files byte-identical, so the
provenance record shipped false.** This repo's own checklist calls a falsified
provenance record *"the worst class of defect"*, and the `tolstack_founding`
reviewer explicitly **declined** to make one of these exact edits for this exact
reason. The branch changed all three and amended nothing:

| file | PROVENANCE said | what changed |
|---|---|---|
| `docs/tolerance_stacks/hardware_entries.json` | *no — byte-identical* | new `NAS6403U11D` entry, four extended `gaps`, `used_by` back-refs |
| `tests/test_tolerance_stack.py` | *no — byte-identical. **34 tests**…* | +240 lines, 14 new tests, now 50 |
| `tolerance_stack/stack.py` | *no — byte-identical* | one comment: `SourceRef.kind` gained `spec` |

Two of the three were **unavoidable** — SOP Step 4 requires a hardware entry per
standard part and Step 7 requires new tests per stack, so those files change with
every new stack and the record simply had to move with them. The third is a
comment the SOP's own vocabulary made necessary. So this is a bookkeeping failure,
not a bad change, which is why it is fixed rather than sent back.

**Fixed:** amended all three rows with what changed, when, and why, plus a line in
*The rule* saying that a "byte-identical" row is a claim about **the import, not a
freeze**, and naming the three files the SOP guarantees will keep changing. That
last part is the actual defect — the row shape invited reading a provenance record
as a lock. Added to the checklist's recurring bugs with the verification command.

### should-fix — fixed inline by me (1)

**2. The stack's headline number stated the wrong bound as the requirement.**
`shank_out__11_sourced_only` is `INCOMPLETE` by design, and its whole value is
that the deficit magnitude *is* the pitch-link eye width the joint needs. The
worksheet's *required pitch-link eye width* table and the check's `guidance` both
quoted **7.4859 mm** as the worst-case requirement. That is the wrong end.

For `column + eye − grip ≥ 0`, the binding case is grip at **max** against the
column at **min**: `17.7292 − 9.5353 = 8.1939 mm`. 7.4859 mm comes from grip at
min against the column at max — the *most favourable* combination, i.e. the value
below which the check fails even at its best. The table's two worst-case row
labels were also swapped relative to their numbers.

Consequence: a reader who sourced a 7.6 mm eye would have concluded the joint
passes worst case when it does not, understated by **0.708 mm**. Every folded
value is correct and every test was green — the error lives entirely in the prose,
which is why it is worth a finding at all.

**Fixed** in both places, with the binding combination named, the `marginal` band
stated explicitly (7.8399–8.1939 mm), and a note that the two zero-width bands
make even 8.1939 mm a *lower* bound. Added
`test_pitch_link_the_binding_link_eye_requirement_is_the_worst_case_end`, which
derives all three thresholds from the elements and asserts `binding > at_nominal >
favourable` so the prose cannot drift back. Recorded in the lesson as proposed SOP
edit 14 (Step 5c needs to say which end binds) and appended to check 2 of this
checklist as a new failure class.

### should-fix — filed, not fixed (1)

**3. `values_source` exists on 1 of 13 hardware entries.** The author added a
`source_ref`-shaped `values_source` field to `hardware_entry/v0` for
`NAS6403U11D` — correctly identifying a real hole: entries cannot cite their own
inline values, so `values_status: "inline"` cannot distinguish a standard-traced
entry from a workbook transcription. It was proposed deliberately (lesson edit 7),
scoped to one entry, and pinned by a test, which is the right way to float a
schema change. But in the half-landed state, *absence* of the field means "not
backfilled" rather than "no source", so it is not yet enforceable. Backfilling is
out of scope for this handoff → filed as
`ISSUE_20260804_hardware_entry_values_source_not_backfilled.md` with the origin of
all twelve remaining entries and the test to promote.

### nits — fixed inline (1)

**4.** The lesson said the branch was *"cut from `main`"*; this repo has no `main`.
Corrected to `master`.

### nits — not fixed (2)

**5. `SOP_TOLERANCE_STACK.md` Step 0 still pins "expect 34 passed"** — it is 51
now. The author flagged it themselves (edit 13) and the SOP is not what was under
review, so I left it; folded into the SOP-edits issue. This is the repo's own
recurring bug about asserted counts, third sighting.

**6. SOP Step 3's zone warning says "217755 is A–L × 2–15."** Sheet 4 of the
`[PRELIM 2026-AUG-3]` export prints **A–L × 1–16** — I read the border ticks while
re-deriving H3. The A–L half is right. Also folded into the SOP-edits issue, and a
finding **against the SOP**, not the author.

### Not findings — worth flagging

**The SOP friction report is the most valuable thing in this deliverable and it is
sitting in a lesson.** Fourteen edits (13 the author's, 1 mine), each with the
replacement prose already written, from the only session that has ever run the SOP
cold. Filed as `ISSUE_20260804_apply_the_sop_friction_report.md` so it does not
decay. Two of them matter to *reviewers*, not just authors:

- **Edit 1 is a reviewer trap, worse than an author trap.** `data/` is gitignored,
  so `data/inbox/specs/` in a worktree holds one `README.md`. A reviewer who
  `ls`-es their own cwd sees an empty directory and concludes *"the cited document
  is not there"* — which check 1 defines as the most serious finding available, and
  it would be wrong for every correctly-cited spec in the stack. I hit this and had
  to reach into the main checkout. Added to the checklist.
- **Edit 6, the transitive workbook ban**, is the sharpest thing in the report:
  citing `hardware_entries.json` for a band launders an untraced workbook value
  into a from-scratch stack while showing `kind: "parts_list"`, and passes every
  test in the repo. The author caught it by hand and refused two values over it.

Also flagged in check 7 and filed: three seeded elements carry `traced` on bands
their own notes call untraced, which is why a mechanical traced count over the
seeded data (4 of 26) disagrees with the "1 of 17" every document quotes. Two of
the three can now be *properly* traced, free — `NAS6403-NAS6420 Rev 4.pdf` sheet 3
covers dash 14 (`.875`) and the NAS6404 dash 13 (`.812`) in the same table this
session read.

---

## Checklist maintenance

Appended four entries and refined two, all from something this review actually
hit:

- **Check 2** — new failure class: *the direction of the prose, not just of the
  terms*. A budget check's deficit interval has two ends that mean opposite
  things, no test looks at the sentence that converts one into a requirement, and
  finding 2 is the live sighting.
- **Check 3** — an *earned* exit for `max == mmc` everywhere, which had none. A
  joint with no subtracted material feature has it legitimately; the author must
  state the absence and the reviewer must confirm it by looking for a
  chamfer/relief/counterbore. Applied the author's proposed edit 10, since this
  file is mine to maintain.
- **Recurring bugs** — *documents cited from a worktree that cannot see them*
  (the reviewer half of friction edit 1).
- **Recurring bugs** — *a "byte-identical" PROVENANCE row read as a freeze*, with
  the `git diff --name-only` check that catches it.
- **Recurring bugs, second sighting** — *documented vocabularies drifting from the
  seeded data* got its second sighting, one layer worse than the first: `spec` was
  mandated by the SOP, missing from `SourceRef.kind`'s comment, **and** missing
  from the enforcing test's whitelist, so the first compliant from-scratch stack
  broke the suite. The entry now says a vocabulary lives in **three** places.
- **Architectural errors** — *drawing-checker is read-only* reworded to stop
  claiming `git status` proves it, with the interim run-mtime/`run_meta` check and
  a pointer to the new issue.

**Pruned nothing.** Four seeded entries found nothing this review (wrong
`REVIEW_AGENT.md` copy, `forge check` main-vs-worktree, `data/inbox/*` dropping
tracked docs, surviving `{{REPO_NAME}}` — I grepped the diff, clean). Two reviews
is not "keeps finding nothing", and all four are cheap. Revisit after the next
one.

Edited the **worktree-relative** `docs/prompts/REVIEW_AGENT.md`, per the first
recurring bug.

## Verdict

**APPROVE** — 1 blocker, fixed inline; 1 should-fix, fixed inline; 1 should-fix
filed; 1 nit fixed, 2 nits left.

The thing this checklist exists to catch is not here. I opened every cited
document — a four-page photocopied NAS standard read by vision, a part drawing, a
37-page process spec, an assembly parts list and its balloon layer — and **every
value, every callout, every quoted note and every part-number decode checked out
verbatim.** The stack's four `traced` values are genuinely traced, its two
`inferred` values are correctly *not* called traced, and the one value it could
not source is absent rather than invented, with the checks rewritten as budgets so
the hole shows up in the output. The *Refused* table — six values the author could
have taken from the neighbouring stack, from `hardware_entries.json`, or from
recall, each with why it was refused — is exactly the evidence Jeff wanted from
this exercise, and the entry admitting that a *correct* recollection of ±.010 was
still not used as a source is the sharpest line in the deliverable.

Both defects I found are in prose, not in numbers: a provenance row that went
stale and a requirement bound quoted from the wrong end of an interval. Both are
now fixed and both are now pinned or checklisted. That the second one survived a
green 50-test suite is the useful lesson: this repo's tests pin what the fold
computes, and nothing pins what the worksheet *says the number means*.

The SOP survived its first cold consumer, and the friction report is worth more
than the stack. `MS9363` is the next document, and it is now the only thing
between this repo and answering a cotter-retained joint the way it is actually
built.
