---
type: review
handoff: HANDOFF_20260805_spec_library_v0
reviewer: review agent (review/spec_library_v0)
date: 2026-08-05
verdict: APPROVE
blockers: 0
---

# Review — spec_library_v0

The first work in this repo that is neither a tolerance stack nor plumbing: an
event-sourced structured spec library, plus the first three parse events. The
checklist is written for stacks, so the substance of this review is the same
provenance audit one layer upstream — **for every extracted value, which
document says so, and did the author actually open it?**

I re-read all three source documents myself, from the pile in the main checkout,
rendering with drawing-checker's `venv-win` per the repo's standing precedent.
That re-reading is committed as `tests/test_spec_library_review.py` (25 tests),
which pins the library against the **documents** rather than against the events —
the author's own `test_spec_library.py` can only check self-consistency.

**Verdict: APPROVE.** No invented values. No unsourced numbers. Four should-fix
findings, all fixed inline and listed below.

---

## The provenance audit

### 1. Every value traces to a specification callout — **PASS**

**76 value instances: 69 `traced` / 7 `inferred` / 0 `untraced`**, across 11
subjects and 3 documents. Counted by me from the event files, not copied.

The checklist warns that a high `traced` ratio is a reason to audit harder. It
is, and I did — but the ratio is also *structurally* expected here in a way it
was not for slice 1's 1-of-17. Slice 1's source was a spreadsheet; this stream's
source is the standards themselves, so a value read off a table cell in
`data/inbox/specs/` **is** traced by definition. The right scrutiny is not "why
so many traced" but "is each one actually in the cell it names". I checked every
one.

Verified cell by cell against my own renders:

| document | what I checked | result |
|---|---|---|
| `NAS6403-NAS6420 Rev 4.pdf` | sheet 1 both tables, NAS6403 and NAS6404 rows, all 10 columns each; sheet 2 all notes and the CODE/MATERIAL/HEAT TREAT blocks; sheet 3 rows 11 and 13 plus the footnote; sheet 4 | every number matches |
| `MS9363 Rev C.pdf` | sheet 1 TABLE I rows -09 and -10, all 9 columns; the hex-face view; the axial section; sheet 2 requirements 1–11 | every number matches |
| `JPS00094 ... Rev C.pdf` | all five quoted criteria against `page.get_text()` | verbatim, and the pdf-page/document-page offsets are right |

Specific high-risk items the checklist names, all clean:

- **Standard-part dimensions are the highest-risk class** — and here they are the
  *entire* deliverable. NAS6403 `M .174/.154`, `P .080/.070`, `TD .1840/.1810`;
  NAS6404 `M .180/.160`, `P .086/.076`; MS9363 `H .178/.198`, `G .084/.104`,
  `S .073/.088`. All read off the cell. None invented.
- **The merged-cell traps were handled correctly.** NAS6404's `P` cell is merged
  across the 6404/6405 rows and sits visually closer to 6405 — the event flags
  this and reads it right. NAS6403's `R Rad` cell is *blank* (the .020/.010 is
  merged for 6404/6405 only), and the author correctly records **no** fillet
  radius for NAS6403U11D. Reading that merged value upward would have invented a
  dimension; it did not happen.
- **The unplated-column selection is right.** NAS6403's `D Dia` has three
  columns — Unplated .1895/.1890, Plated Before .1887/.1881, Plated After
  .1895/.1885. The `U` suffix selects the first, and the event says so and cites
  it. Picking "After" would have been a silent 0.5-thou error with an identical
  max.
- **Undefined columns were not extracted.** Sheet 1 prints `J` and `N` against
  every basic number and defines neither. `N` is additionally printed
  smallest-on-top (.18 over .20 for NAS6403), inverting every other two-value
  column — I confirmed both facts on the render. The author extracted neither and
  said why. This is the single clearest signal in the work that the author was
  reading rather than generating: a model filling in a fastener table would have
  produced plausible meanings for `J` and `N`.

### 2. Figure-read meanings — **PASS, and one prior gap legitimately closed**

Not a "signs on path terms" check (no paths here), but the analogous one: values
whose *number* is legible and whose *meaning* comes from a figure.

- **NAS6403 dimension `M` — confirmed.** This was `pitch_link_stack`'s
  highest-value open item, and this handoff closes it in `hardware_entries.json`.
  I re-derived it independently at Matrix(9) on pt rect `[300,105,420,230]`: `M`'s
  left extension line is the long vertical running down through the shank to the
  drilled cotter hole's centerline, its right terminus is the point end face.
  **`M` is cotter-hole centerline to point.** The gap closure is earned.
- **Column `U` — correctly left `inferred`.** Its extension lines do sit at the
  point end face, which is suggestive, but the standard never defines `U` in
  words. Marking it `inferred` and flagging it for a third reader is the
  conservative call and the right one.
- **MS9363 `G` and `H` — confirmed on the axial section.** `H` runs from the
  slotted end face to datum `-J-` (the whole nut); `G` runs from the slot root to
  `-J-`. So `H − G` is slot depth, which is what the event derives. I verified
  both extension-line pairs at Matrix(8). This mattered more than any table
  value: the lesson is right that "is `G` the slot depth or the height below the
  slots?" is the question every derived number hangs on, and no table OCR would
  have answered it.
- **The unlabelled `.026/.006`** at the `-J-` end is real, is inside `H`, has no
  letter and no TABLE I column. Recorded `inferred` with "do NOT fold it into a
  stack on this reading". Correct.

### 3. Direction / mapping per value — **PASS (N/A in the LMC/MMC sense)**

No `lmc`/`mmc` fields exist in `spec-parse/v0` — the library records what the
document prints, and MMC/LMC assignment is the *stack's* job at fold time. That
is the right layering: a bolt's `.1895/.1890` shank has no MMC direction until
something decides whether it adds or subtracts. Confirmed `fold()` in `stack.py`
is untouched by this branch and still reads `min`/`max` only.

The analogous check that *does* apply — is a `min`/`max` pair ever inverted — is
enforced in the shapes (`SpecValue.__post_init__` raises on `min > max`) and
tested.

### 4. Derived values are labelled as derived — **PASS with a finding**

`slot_depth` is not printed anywhere on MS9363 and is correctly `inferred`,
with the non-independence caveat stated (`H` and `G` share datum `-J-`, so the
worst-case band .074/.114 is wider than any real part). Good.

The finding is finding **S3** below: `nominal` values computed as midpoints sit
inside values labelled `traced`.

### 5. Nominal inside its own min/max — **PASS**

Holds everywhere it applies. Note the library deliberately keeps limits and
nominal+tolerance as *different shapes* rather than converting between them:
NAS6403 grip is `nominal .688, plus_minus .010` with no limits (because the
sheet prints a `Grip ±.010` column header against a tabulated .688), while
MS9363 `H` is `min/max` (because TABLE I prints limits only). That is exactly
the SOP's "`nominal` is not the midpoint" discipline expressed in the schema, and
it is better than the stack side's handling.

### 6. Quantised cotter/castellation constraint — **PASS, and strengthened**

This is the strongest single result in the handoff. MS9363 was acquired
specifically to close the castellation-alignment gap, and the author's conclusion
is that **it cannot be closed, by this or any document**. I verified the
argument:

- Sheet 2 requirement 10 is the *only* slot-position control: "OPPOSITE SLOTS
  SHALL COINCIDE WITHIN .005 AND SLOT AXIS SHALL BE WITHIN .005 OF THREAD PD
  AXIS". I read all eleven requirements at Matrix(4.16). Nothing on either sheet
  relates a slot to the **thread start**.
- JPS00094 §5.9.7 footnote (a) confirms it from the other side, verbatim:
  "Different nuts likely have different manufactured thread-start to
  castellation-hole spacing."

So the phase is *uncontrolled*, not merely undocumented — recorded as an absence
with `closed_by: null`, a distinction the schema supports and the intake queue
respects (it does not go hunting a file that does not exist). The remedy is
correctly identified as procedural (§5.9.7's change/add-a-washer, capped at three
by §5.5.3.a). ARCHITECTURE.md's "Known modelling gaps" section is updated to say
this. This is a design conclusion of real value and it is stated next to the
numbers, not buried.

### 7. The traced/inferred/untraced ratio — **reported above**

**69 traced / 7 inferred / 0 untraced, out of 76 value instances.** The 7
`inferred`: `point_chamfer_U_max` (×2), `head_fillet_radius`, `slot_depth` (×2),
`bearing_end_step` (×2). I checked each and agree with the label on all seven.

Zero `untraced`, which is honest here rather than suspicious — an untraced value
would mean "I wrote a number with no document", and the whole stream exists to
make that impossible. The analogue of the "every untraced value is in the gaps
list" rule is **absences and unreadables**, of which there are 7 and 1; all are
recorded, all name what would close them (or state that nothing will), and the
intake queue picks them up as queryable state.

---

## Also verified

- **Tests.** Re-ran myself: **132 passed**, ~0.2 s. 58 in `test_tolerance_stack.py`,
  44 in `test_spec_library.py`, 25 in my `test_spec_library_review.py`, 5 in the
  fixtures/shapes paths. Green after the master merge and after all inline fixes.
- **The suite does not pollute `data/`.** Checked before and after: the tree is
  byte-identical and `git status` is clean. `rebuild()` writes to
  `data/projections/spec_library/`, which is gitignored, and the tests exercise it
  through `tmp_path`.
- **`python -m tolerance_stack` works** and produces the definition-of-done state:
  MS9363 `entered`, NAS6404 `entered`, NAS1149 / MIL-S-8879 / MS21299 `missing`.
  11 subjects from 3 events.
- **Schema hygiene.** All three events carry `joby.tolstack/spec-parse/v0`;
  `seq` unique and total-ordered; `mode ∈ {full, correction}`; every `subject`
  unique within its event; `confidence` in the whitelist everywhere. The fold
  refuses a bad schema string, a duplicate `seq`, a duplicate `event_id`, a
  subject supplied by two documents, and a correction that names an unknown
  subject or omits `supersedes`/`reason` — all tested.
- **The correction path is tested without faking a correction.** The committed log
  holds no correction event, because re-reading found no error. Rather than
  author a fabricated wrong reading into an immutable log, the author pinned the
  mechanism with synthetic fixtures that declare themselves synthetic in their own
  `document_meta`. That is the right call, and the test that a correction
  **withdraws an absence it fills** is the non-obvious case they got right.
- **`data/inbox/specs/` was not reorganised.** No renames, no deletes in the diff;
  filesystem checked directly. The pile holds 64 entries (52 PDF, 8 DOCX, XLSX,
  PPTX, tracked `README.md`, `desktop.ini`) — which is exactly what the lesson and
  the intake queue's `provenance` block claim. Recomputed, not read.
- **Nothing was written into drawing-checker.** Its `data/inbox/specs/` holds only
  the `MOVED_TO_TOLSTACK.txt` breadcrumb; no run is cited by this work, and the
  only use of that repo was executing its `venv-win` python. Its last commit is
  unrelated.
- **No `{{...}}` template placeholders** in the diff.
- **Worktree-relative `docs/prompts/REVIEW_AGENT.md`** is the copy I edited.
- **Scope respected.** `docs/SOP_TOLERANCE_STACK.md` untouched; the other twelve
  `hardware_entries.json` entries untouched; stack JSONs untouched. The lesson
  routes the SOP castellated-nut amendment to whoever picks up `sop_edits_apply`
  next rather than reaching for it. Exactly right.

---

## Findings

All four are should-fix and **all four are fixed inline on the review branch**.
None is a defect in an extracted value.

### S1 — `PROVENANCE.md` claimed `tolerance_stack/__init__.py` byte-identical *(fixed)*

`PROVENANCE.md:50` still read `no — byte-identical` after this handoff added
thirteen `spec_library` re-exports and extended `__all__`. The checklist calls a
false provenance record "the worst class of defect in this repo", and this is its
**second sighting** (`pitch_link_stack` was the first). The rows for
`hardware_entries.json` and `test_tolerance_stack.py` were also stale, attributing
their latest state to `sop_edits_apply` only.

The new wrinkle worth naming: the three SOP-mandated files get remembered, but
adding a *module* to the package forces `__init__.py` to change, and nobody
watches that row. Promoted into the recurring-bugs checklist.

**Fixed:** all three rows amended.

### S2 — a quoted `text` field is silently abridged *(fixed by disclosure; correction event recommended)*

`NAS6403 thru NAS6420 / part_number_code` presents itself as the CODE block's
text and drops two clauses without ellipsis:

- "See Sheet 3 for tabulation of grip and length dimensions." (after the first
  sentence)
- "May be used with "D", "L" or "P" code." (after the `A` line)

Neither is load-bearing, and everything present is verbatim. But this library's
premise — stated in its own JPS00094 entry as "quoted, not paraphrased: the words
are the value" — makes an unmarked elision a fidelity defect: a consumer cannot
distinguish an abridged quote from a complete one.

I deliberately did **not** edit the event file. Events are immutable by design,
and the correct remedy is a `mode: "correction"` event — which would also retire
the one genuinely untried path in the system. Logged here and added to the
checklist; recommended as a small follow-up.

### S3 — a computed `nominal` inside a `traced` value *(documented; schema follow-up)*

`SpecValue.confidence` is per-value, but a value may carry a transcribed band
beside a `nominal` the author calculated. Six values are in this position
(MS9363 `-09`/`-10` × `nut_height`, `unslotted_height`, `slot_width`), all
labelled `traced`.

For `nut_height` and `unslotted_height` this is fine on the merits: the bands are
.020 wide and sheet 2 requirement 9 sets the default linear tolerance at ±.010,
so .188 and .094 really are the intended basic sizes. For **`slot_width` it is
not**: .073/.088 is .015 wide, ±.010 does not corroborate it, and the event's own
note admits ".0805 is arithmetic, nothing more" — yet the value reads
`confidence: "traced"`.

The author disclosed all of this in prose. The problem is that prose `note`s are
not what a consumer folds. A `v1` schema wants either per-field confidence or a
`nominal_is_derived` flag. Not fixable inline without a schema change; recorded in
the checklist so the next reviewer catches the pattern.

### S4 — two asserted counts were wrong *(fixed)*

The recurring "stale inventory numbers" class, twice:

1. **"NAS6403–6420 is 18 basic numbers × 96 grip dash numbers ≈ 1700 rows"** —
   in both `docs/spec_library/README.md` and the lesson, load-bearing for the
   per-document-vs-per-family schema rationale. Counted off sheet 3: **13** basic
   numbers (the family skips odd numbers above 6410) × **64** tabulated dash rows
   (1–32, then evens to 96) ≈ **830** cells. The argument survives at 830; the
   number did not. **Fixed in both places.**
2. **`intake_queue.json` rank 12** argued MS24665 is low value because "MS9363's
   slot at .073/.088 is wider than the hole, so the bolt hole governs". False at
   worst case on **both** joints — slot .073/.088 against hole .070/.080 (−09) and
   .076/.086 (−10) are overlapping bands, so a slot at minimum is narrower than a
   hole at maximum and the *slot* then governs. The conclusion (rank 12, low
   value) survives, because a .063 pin clears every minimum. **Fixed**, and pinned
   by `test_neither_the_slot_nor_the_bolt_hole_governs_the_cotter_pin_outright` so
   it cannot silently come back.

   Worth flagging as a class: `status()` is derived and tested, but `note` and
   `unblocks` are free text asserting engineering conclusions that nothing checks.
   Now in the checklist.

---

## Integration note — a sibling handoff landed mid-review

`sop_edits_apply` merged to `master` while this review was running, and touched
both files `spec_library_v0` touched. The merge produced a **semantic conflict
neither branch's suite could see**:

- `sop_edits_apply` asserted `values_status != "inline"` ⟹ `values_source is None`.
- `spec_library_v0` promoted `NAS6403U11D` to `values_status: "library"` while
  deliberately keeping its `values_source`, on the reasoning that a `library`
  entry still *has* inline numbers — demoted to a cross-check, not deleted — so
  where they came from stays a true fact.

The merged tree failed. The same test's own `by_kind["spec"] == ["NAS6403U11D"]`
assertion *requires* that `values_source` to exist, so after the merge the test
contradicted itself.

`spec_library_v0` is right on the merits. I narrowed the guard to
`values_status == "not_transcribed"`, which is what that test's own docstring
already said in words ("mandatory whenever `values_status` is `inline`, and
explicitly null when it is `not_transcribed`") — the code had overreached beyond
its own description while no entry was `library` to expose it. One-line fix,
commented in place.

Also resolved the textual conflict in `test_tolerance_stack.py`, keeping all
three of `sop_edits_apply`'s new `values_source` tests alongside
`spec_library_v0`'s relaxed `library_ref` invariant.

**This is a new recurring-bug entry**: with several handoffs active on the board
at once, a review that only tests `handoff/<slug>` against its own merge-base is
testing a tree that will never exist. Merge master in and re-run before writing
the verdict.

---

## Nits

- The `74db4c8`/`6a0e17c` commit message says "45 value-level tests"; the lesson
  and the file both say 44, and 44 is correct. Left alone — amending a landed
  commit message is not worth a rewrite.
- `MS9363-09` and `MS9363-10` hardware entries are still `not_transcribed` even
  though the library now holds both subjects in full. This is correct scoping —
  the handoff limited the seam demonstration to one entry — and the lesson already
  routes it to a follow-up, noting both entries have empty `used_by` lists so
  promoting them would claim a consumer that does not exist. Noted only so the
  follow-up does not get lost.

## For the next reviewer

The checklist gained a whole new section, **"When the work is a spec-library
parse event (not a stack)"**. Use it — and take its first line literally. Every
finding of substance in this review came from opening the PDF, not from reading
the JSON. The event files are fluent, internally consistent, and would have
passed any amount of scrutiny that stayed inside the repo.

The two documents most worth re-reading if you inherit this: MS9363 sheet 1's
axial section (everything derived hangs on what `G` measures) and NAS6403 sheet 1's
point-end figure (`M` is now closed, `U` is not).
