# LESSONS — traced_labels_and_ratio (2026-08-06)

Handoff: `docs/sessions/active/HANDOFF_20260806_traced_labels_and_ratio.md`.
Two issues, routed together because the second could not be settled until the
first moved the counts.

---

## 1. The numbers, before and after

Counted over the three seeded slice-1 stacks — `tan_link_to_pitch_plate`,
`tan_link_to_pitch_plate_take2`, `vpa_output_to_pitch_plate` — by
`tests\debug_report_tolerance_stacks.py --ratio`:

| | before | after |
|---|---|---|
| element **instances** | 26 | 26 |
| `traced` | **4** | **3** |
| `inferred` | 6 | 7 |
| `untraced` | 16 | 16 |
| distinct element ids | 18 | 18 |
| instances with a `hardware_ref` | 10 | 10 |

What every document *said* for the month before this session: **1 of 17**.

Per-element:

| stack : element | before | after |
|---|---|---|
| `tan_link:fastener_grip_14` | `traced`, `kind: parts_list` (217755) | `traced`, `kind: spec` (NAS6403-NAS6420 Rev 4.pdf sh 3) |
| `vpa_output:fastener_grip` | `traced`, `kind: parts_list` (217755) | `traced`, `kind: spec` (same sheet, NAS6404 column) |
| `vpa_output:under_head_chamfer_washer` | `traced`, `kind: parts_list` (217755) | **`inferred`** — MS21299 not in the pile |

No arithmetic changed: `check_result` is produced, not stored. Across all six
stacks the repo now stands at 19 traced / 11 inferred / 18 untraced out of 48.

## 2. Reproduce it — the commands

**The ratio.** One command, and it is the one every document now points at:

```powershell
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --ratio
```

(from a worktree, `C:\workspace\tolstack\venv-win\Scripts\python.exe` — the venv
is gitignored and lives in the main checkout only.)

**The crops that verified the two re-citations.** `NAS6403-NAS6420 Rev 4.pdf` is
a **scan with no text layer**, so `--pattern` finds nothing and finding nothing
proves nothing. Everything below was read by vision off a rendered crop. The
tool needs PyMuPDF, which tolstack deliberately does not install — run it from
drawing-checker's venv:

```powershell
$PY  = "C:\workspace\drawing-checker\venv-win\Scripts\python.exe"
$PDF = "C:\workspace\tolstack\data\inbox\specs\NAS6403-NAS6420 Rev 4.pdf"

# sheet 3 whole page (611 x 842 pt) -- find the table
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,305.5,421,421" --zoom 2.2 --out s3.png
# the dash-number rows, legible: rows 1-21, Grip Dash No. / Grip ±.010 / NAS6403 / NAS6404
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,140,190,70"    --zoom 8   --out s3_rows.png
# the column headers -- this is where the BAND is printed
& $PY tests\debug_trace_stack_values.py $PDF --crop "3,150,110,60"    --zoom 8   --out s3_head.png
# sheet 2 -- the CODE block and note (a)
& $PY tests\debug_trace_stack_values.py $PDF --crop "2,305.5,421,421" --zoom 2.2 --out s2.png
```

What those crops actually show, since the next agent should not have to re-read
them to know whether it is worth rendering:

- **Sheet 3 is one table for the whole NAS6403–NAS6420 family.** Columns:
  `Grip Dash No.` | `Grip ±.010` | then one `LENGTH ±.015` column per basic
  number (`NAS6403 .1900-32`, `NAS6404 .2500-28`, `NAS6405 .3125-24`, …).
  **The band is in the column header, not in a cell.** That is the whole reason
  these two values can be `traced` at all — value and tolerance on one page.
- Dash 13 → grip **.812**, NAS6403 length 1.135, NAS6404 length **1.182**.
  Dash 14 → grip **.875**, NAS6403 length **1.198**, NAS6404 1.245.
  Dash 11 → grip .688, NAS6403 1.011 — which independently re-confirms the
  `pitch_link_stack` reading.
- **Sheet 2 CODE block:** "Dash number indicates grip in .0625 increments. See
  Sheet 3…"; `U` after the basic number = unplated; `D` after the dash number =
  drilled shank; `H` = drilled *head*. Note (a) defines grip: "from the underside
  of head to the end of the full cylindrical portion of the shank." Its
  EXAMPLE OF PART NUMBER block is written against **NAS6404** specifically, which
  is the corroboration that the sheet-3 NAS6404 column decodes the same way.

So `NAS6403U14D` = NAS6403, unplated, grip .875, drilled shank;
`NAS6404U13D` = NAS6404, unplated, grip .812, drilled shank;
`NAS6403U13H` = the same .812 grip but drilled *head*.

**The handoff's fix table was right, and I could not have known that in
advance.** It came from a review, not from the page. Two rows needed the crop to
confirm (the NAS6404 column exists and is dash-indexed the same way; the ±.010
is a header, not a per-row value), and the third — "MS21299 is not in the pile" —
needed an `ls`, which is a 10-second check that decides a `traced` label.

## 3. The definition adopted

> **traced ratio** = element **instances** whose `source_ref.confidence` is
> `"traced"`, over all element instances **in a named set of stacks**.

It lives in **exactly one place**: `docs/SOP_TOLERANCE_STACK.md` § "The traced
ratio". `ARCHITECTURE.md`, `REVIEW_AGENT.md`, all four worksheets, the specs
README and both lessons quote the *number* and point at that section for the
*rule*. The counting lives in one place too —
`debug_report_tolerance_stacks.ratio()` — and the test imports that function
rather than re-implementing it, so prose, command and test cannot drift apart in
three directions again.

Three sub-decisions, each of which had already gone wrong once:

- **Instances, not distinct ids** (26, not 18) and not "elements with a
  `hardware_ref`" (10). Each citation can be right or wrong on its own, so each
  gets counted. The test asserts all three numbers so the choice stays legible.
- **Name the scope.** "Across the seeded stacks" now means a list, checked
  against `SEEDED_STACK_FILES`.
- **Element-only, explicitly.** The thermal archetype's material properties and
  scenario parameters are *outside* this ratio (12 of 16 dimensions next to 0 of
  7 properties). The `--ratio` output says so in its own footer, because someone
  will quote it for a thermal stack.

### The `parts_list` question, decided

The handoff left this open: is "a parts-list *nominal* with a documented band
elsewhere" a case worth keeping? **No.** `kind: "parts_list"` can never be
`traced`, no exception. That case is *two* citations and a `source_ref` holds
one — so cite the document that prints the band and name the parts list in the
`note` as the evidence for which part sits in the joint. Both re-cited grips are
worked examples: the spec gives the value, `note` carries "balloon 35 in
DETAIL B, find 35 qty 3".

Enforced by `test_no_traced_element_cites_a_parts_list` over every stack, plus a
twin over `hardware_entries.json` — because that file is the leak the SOP already
warns about (trap 17), and a rule that only covered stacks could be laundered
through it.

## 4. The correction: understated 4x for a month, and how

`ARCHITECTURE.md`, the SOP, the review checklist, the specs README, two
worksheets, two lessons, a completed handoff and two reviews all quoted **"1 of
17"**. Both halves were wrong, in *different* ways, which is why nobody caught
it:

- **The denominator counted two stacks and said three.** 11 (`tan_link`) + 6
  (`vpa`) = 17. `take2`'s 9 instances were omitted — arguably reasonably, since
  take 2 is a restatement of take 1 rather than a new joint. But the omission was
  never written down, so the sentence said "three stacks" and the number said
  two, and nobody counting what the sentence described could reproduce it.
- **The numerator counted one thing and the JSON said another.** "1" is the count
  of values traced to a **part drawing** — the honest figure, and the one
  `test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange` pins. But
  four elements carried `confidence: "traced"` in the files. Three of those four
  were on parts-list citations that the review checklist explicitly forbids, and
  **each one admitted it in its own `note`**: *"The grip +/-.010 is untraced
  (NAS6403 spec absent)."* Honest prose, wrong machine field.

So the repo understated its own sourcing **4x against its own data** (1 vs 4) —
and 3x against the corrected, defensible figure (1 vs 3) — for its first month,
in the one number a reader takes away about how much of the work is real.

**How it survived.** Three separate mechanisms each half-worked:

1. The review checklist told reviewers to compute the ratio, and they did — the
   `pitch_link_stack` review computed **4 of 26** and wrote it down. It then
   filed the discrepancy as an issue and quoted "1 of 17" in the same document,
   because the checklist's calibration line said so. **A checklist that supplies
   a stale constant will beat a reviewer's own correct arithmetic.**
2. The note-vs-field contradiction was inside a single JSON object, three times.
   Nothing read notes. Check 1 now says explicitly: read the `note` against the
   field, and where they disagree the note is where the author told you the truth.
3. `PROVENANCE.md` correctly certified the stack files byte-identical to their
   import — which ruled out drift and thereby made the disagreement look like a
   documentation nit rather than a data defect. It was both.

**The transferable rule: a ratio with an unstated denominator is not a
measurement.** This one propagated into eleven files in a month.

### What was corrected, and what was deliberately left alone

Corrected with a **dated note quoting the old claim**, never a silent edit:
`ARCHITECTURE.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/REVIEW_AGENT.md`,
`data/inbox/specs/README.md`, all four `WORKSHEET_*.md`,
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md` (the paragraph the
number originally came from — left standing, with the correction under it), and
`docs/sessions/lessons/LESSONS_20260804_pitch_link_stack.md`.

**Left alone on purpose:** `docs/sessions/reviews/` and
`docs/sessions/completed/`. Those record what someone believed on a date, and
`REVIEW_20260804_pitch_link_stack.md` is the *evidence* this correction rests on.
Rewriting them would destroy the audit trail to make a grep look tidy. The
doc-level test encodes that split: it checks live docs only, and it allows the
superseded figure inside a blockquote so a correction note is legal and a
restated claim is not.

## 5. Surprises and judgement calls the handoff did not cover

**`ARCHITECTURE.md` had an 18-line block duplicated verbatim** — the MS9363
paragraph plus the binding-constraint paragraph, appended a second time at end of
file by the conflict resolutions in `5dbbd7f` and again in `7d2819a`
(`git show <sha>:ARCHITECTURE.md | grep -c "The binding constraint"` → 2). It
contained a second copy of the very sentence I was correcting. Deleted rather
than filed: maintaining two copies of a number this handoff exists to
de-duplicate would have been absurd. Worth knowing that **a merge conflict in a
long prose file can duplicate a whole section and no test in this repo sees it.**

**I clobbered a parallel session's derived artifact.** `data/projections/viewer/`
is one directory shared by every worktree, written by absolute `--data-root`.
`citation_export_provenance` had rebuilt `crops.json` with its own newer script
(it adds a `source_ref_export` rule that does not exist on master); I then ran
master's version and took it from 24 resolved to 8. Restored by re-running their
script from their worktree. Filed as
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`.
**Before you rebuild anything under `data/projections/`, check
`git worktree list` for other live sessions and look at `built_by`/`built_at` in
the file you are about to overwrite.**

Worth noting the upside, though: rebuilding crops from *this* branch showed both
re-cited grips now resolving to `NAS6403-NAS6420 Rev 4.pdf` page 3 by the
`spec_pile` rule. The re-citation makes two previously-uncroppable elements
croppable — whoever finishes `citation_export_provenance` gets that for free.

**One existing test broke for a good reason.**
`test_a_stack_whose_joint_names_no_export_cannot_be_crop_resolved` used
`fastener_grip_14` as its specimen parts-list citation. Re-citing it to a spec
sent the resolver down a different branch and the test failed on the *wrong*
error message. Moved to `straight_bushing`, which is the same shape the test was
always about. **A test that reaches into real data by element id is coupled to
that element's citation, not just to its value** — the docstring now says which
property it needs, so the next person moving it knows what to move it to.

**Deliberately not fixed** (filed as
`ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`): both
`fastener_grip_13` instances could be traced to the same sheet 3 for free, and
`hardware_entries.json` still labels `NAS6403U14D`/`NAS6404U13D` as
`workbook`/`untraced` while the stacks citing them are now `traced`. Kept out
because Part 2 recomputes the headline ratio from Part 1 specifically — sourcing
extra values in the same commit would move the number a reviewer was told to
expect, for a reason they were not told about. The two stale `(NAS6403 spec
absent)` parentheticals those elements carried *were* corrected in place, since
leaving a false provenance claim standing in a handoff about false provenance
claims is not defensible.

The pattern behind that issue is the one worth carrying forward: **a document
arriving in `data/inbox/specs/` does not re-cite anything by itself, and nothing
in this repo notices that it could.** Five slice-1 values were sourceable from
`NAS6403-NAS6420 Rev 4.pdf` the day the pile moved. A periodic sweep — "for every
`inferred`/`untraced` element, is the closing document in the pile now?" — would
have caught all five at once, and would have caught this month-old ratio error as
a side effect.

## 6. Still to do

- The three values in
  `ISSUE_20260806_three_more_slice1_fastener_values_are_now_sourceable.md`,
  and the `hardware_entries.json` backfill that goes with them.
- `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`.
- Nothing else from this handoff. Both source issues are closed.
