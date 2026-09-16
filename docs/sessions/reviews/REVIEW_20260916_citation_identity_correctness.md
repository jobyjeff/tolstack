---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_citation_identity_correctness.md
reviewer: agent (review/citation_identity_correctness)
date: 2026-09-16
verdict: REQUEST CHANGES
blockers: 1
---

# REVIEW 2026-09-16 — citation_identity_correctness

Reviewed `handoff/citation_identity_correctness` (4 commits, `204ad4a` →
`d2d6191`) merged into `review/citation_identity_correctness` at `9a03a3b`.
Merge base `f414499`; the only thing `integration` had moved underneath it was
`70241ce` (a board file), so the merge was trivial and conflict-free — the green
suite below is the real merged tree.

**Not merged into `integration`.** One blocker.

The work is careful and, on its central claims, correct: everything the three
deliverables actually *cite* reproduced independently, down to the workbook
formulae and the GD&T glyphs. The blocker is a factual claim about the
**superseded** drawing, replicated into five live artifacts, that does not
survive measurement.

---

## The seven mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — PASS

**The three re-cited pitch-plate elements.** Re-hashed and re-read myself, on
`C:\workspace\tolstack\data\inbox\drawings\215735-A.pdf`:

- 522,823 bytes, sha256
  `a06526c2682de7a91cd76e3aa9463b043f50061da316ccecbf544b46a921c004` — matches
  the cited `export.sha256` and drawing-checker's copy on both sides.
- Title block: drawing `215735`, rev `A`, `ECN-215735-A`, `MATURITY STATE:
  Released`, `01/JUL/2025`, CAGE 6VX14, 2 sheets (sheet 1 OVERVIEW, sheet 2 PART
  DETAILS). Sheet 2 carries the only named view, `SECTION A-A`. All as written.
- `3X 4.06 ±0.08` on sheet 2, with `⌖ 0.2 A B C`, `⊥ 0.05 F`, `3X INDIVIDUALLY`.
  Zone-resolved with the repo's own grid reader: `4.06` in **B5**, `±0.08` in
  **B4**. The B4/B5 straddle the author documented is exactly right, and B4 is
  the half the builder's needle corroborates.
- `5X 4.06 ±0.10` on sheet 2 zone **D10**, with `⌖ 0.2 A B C`, `⊥ 0.05 G`,
  `5X INDIVIDUALLY`.
- **The lost `⌀` is real and was worth recording.** 215197 A.1 prints `⌖ ⌀0.2 A
  B C` on *both* the 3X and 5X frames; 215735-A prints `⌖ 0.2 A B C` on both.
  Confirmed on both text layers and both renders. No value moves with it. This
  is a genuine GD&T change nobody had written down, and finding it via a CSV
  round-trip test that pins a character is a good catch.
- Copied into this repo's own inbox with a `PROVENANCE.md` row in the file's
  existing grammar — this closes the overlay's standing complaint that all three
  215197 citations pointed into *another repo's test fixtures* as production
  provenance. That complaint can now be struck.

**The new workbook citation** (`washer_nas1149v0332_tt`), verified cell for cell
against `260729_sample_tol_stack.xlsx`, sheet `grip length tols old`:
`C11 = "washer thickness"`, `E11 = =0.032*25.4 → 0.8128`,
`F11 = =0.004*25.4 → 0.1016`, `G11 = E11-F11 → 0.7112`, `H11 = E11+F11 →
0.9144`, `I11 = NAS1149V0332`. Every clause of the `source_ref` note is true of
the cells. `export: null` (a spreadsheet is not an export), `confidence:
"untraced"`, and NAS1149 confirmed still absent from `data/inbox/specs/`.

**Cross-checked against its twin** (overlay: "an element that appears in two
stacks must agree about where its number came from"):
`pitch_link_to_pitch_plate::washer_nas1149v0332` and
`rotor_fastener_length::washer_nas1149v0332_tt` are now identical in every
numeric field, `kind`, `document`, `sheet`, `cell`, `confidence` and `export`.
Template-copied, not recalled — as instructed.

**No invented number.** Nothing in the diff introduces a band with no artifact
behind it. The one value that gained a band gained it from a cell I opened, and
it is labelled `untraced` with its gap open.

**Note-against-field, both directions:** the retired parts-list reading was
demoted into prose rather than deleted, and the prose says so explicitly. The
one place a note and a field disagree is finding **F2** below (topology
`revision`), and there the field is wrong.

### 2. Signs on every path term — PASS

`sourced_clamped_stack` is unchanged in shape (`washer_ms21299c3 +
washer_nas1149v0332_tt`, both `+1`); the nine `grip_budget__u*h` checks are
unchanged (`{path: sourced_clamped_stack}`, `{element: fastener_grip_u*h,
sign: -1}`). No term was added, removed or re-signed — only one element's
`min`/`max` moved. `fold()` untouched.

**Prose direction re-checked** against the overlay's `[+clamped_column,
-fastener]` warning: the worksheet still quotes `|WC min|` (grip at max vs
column at min) as the binding budget, matching the pitch-link precedent and the
`guidance`'s own "incomplete threads" argument. Correct polarity, unchanged.

### 3. LMC/MMC direction — PASS

`washer_nas1149v0332_tt` is an additive external length: `lmc 0.7112 → min`,
`mmc 0.9144 → max`. Correct, and the worksheet states the reasoning ("MMC is the
thickest") rather than asserting the mapping. `max == mmc` holds on every
element in this stack and the exit is earned and explicitly stated: blind tapped
hole, no chamfer/relief/counterbore, the only negative sign is a whole-element
subtraction. `fold()` still reads `min`/`max` only.

### 4. RSS actually computed — PASS, and this is the half that was easy to miss

RSS stops equalling worst case, which was a **prose** claim, not just a number.
Re-derived independently: half-width `sqrt(0.1016² + 0.254²) = 0.2735664` vs
worst-case half `0.3556`. The worksheet's RSS columns reproduce exactly (U2H
`−1.0356 / −0.4884` = nominal `−0.762 ± 0.2735664`; U10H `−13.7356 / −13.1884`),
all nine rows. The claim is now **pinned** (`checks[0].interval.rss_half`), not
merely corrected — good.

Worst-case columns re-derived: U2H `2.3114 − 3.429 = −1.1176` and
`2.5146 − 2.921 = −0.4064`; U10H `2.3114 − 16.129 = −13.8176`. Nominals do not
move. No verdict reads RSS.

### 5. Nominal inside its own min/max — PASS

`0.7112 ≤ 0.8128 ≤ 0.9144`. The nominal is the transcribed `E11`, not a
recomputed midpoint — it was 0.8128 before the band arrived and is 0.8128 after,
which the test asserts separately for exactly that reason.

### 6. Quantised constraints — N/A, correctly and explicitly

No MS9363 slotted nut and no MS24665 cotter pin at this joint (blind tapped
hole). The worksheet states the absence and says why the pitch-link/tan-link
caveat does not apply, and the analogous caveat *is* present next to the
numbers: every check is a `complete: false` budget, and the worksheet says to
read the magnitude, not the verdict.

### 7. The traced / inferred / untraced ratio — computed by me, not copied

`tests/debug_report_tolerance_stacks.py --ratio` on the merged tree:

- `rotor_fastener_length`: **9 traced / 1 inferred / 1 untraced, out of 11
  element instances** (was 9/2/0).
- all stacks: **30 traced / 16 inferred / 15 untraced, out of 61** — matches the
  repinned census exactly.
- seeded slice-1: **5 of 26**, unchanged. `rotor_fastener_length` is not a
  seeded file and no `confidence` label moved in deliverable 2, so the eleven
  ratio publishers are untouched. Confirmed against `master`: 17/14 → 16/15,
  seeded row identical.

The one `untraced` value **is** on the explicitly listed gaps (gap 4, open,
reworded to "band workbook-sourced, NAS1149 not in the repo"). No completeness
is being claimed that the stack does not have.

Non-element values: none introduced or touched by this handoff.

---

## Also verified

- **Full suite, re-run by me** on the merged tree from the worktree:
  **1159 passed, 1 failed, 1 skipped**.
  - The **failure is pre-existing and not the author's**. I reproduced it on
    `70241ce` (the tip of `integration`, and `master`) in the main checkout:
    `1 failed, 1154 passed`, same test, same message. I also confirmed the
    author's causal account: `BRIEF_20260915_origin_posture_and_absent_feature_rule.md`
    arrived in `78305fc`, *after* the `2ccec0f` batch merge the handoff measured
    its 1155/0 baseline on. Filed as
    `ISSUE_20260916_hardware_count_guard_matches_other_three_do_not_in_unrelated_prose.md`;
    `priority: high` is the right call — it is red on the branch every worktree
    is cut from. No sibling filing exists for this red (checked
    `ls docs/issues/ | grep -i hardware`), so this is a first filing, not an
    eighth; and the author correctly did **not** file a duplicate of the
    seven-deep `byte_identity` family.
  - The **skip** is `tests/test_viewer_js_suite.py`, worktree-only by design
    (its node-fs tier has no projection to read). Absent from the main-checkout
    run, as expected.
  - Arithmetic reconciles: 1155 + 4 (new crops guards) + 1
    (`test_the_strongest_read_only_claim_still_has_a_subject`) + 1
    (anti-laundering guard parametrized 1 → 2) = 1161 = 1159 + 1 + 1. One test
    renamed, not added.
- **The new guard observed failing** (universal check). I reverted
  `parts_list_row_for` to the pre-fix `{part_number: row}` comprehension in
  place, leaving the module otherwise intact: **3 failed, 74 passed** —
  `..._wins_over_the_one_sharing_its_part_number`,
  `..._does_not_depend_on_the_export_row_order`,
  `..._colliding_with_no_cited_find_number_are_refused_not_guessed`. Restored;
  green. The lesson's "4 failed" is the whole-file revert (the fourth test reads
  `CALLOUT_FIND_NO_RE`, which survives a body-only revert) — both replays are
  honest, and 77 total confirms the 73 → 77 accounting.
  The guard is the right shape: it asserts the **invariance** under
  `list(reversed(rows))`, not the answer, which is the only assertion an
  order-dependent key cannot pass by luck.
- **The collision and the fix, against the real data.** On all three 217755
  exports I re-ran every live parts-list citation forward and reversed:
  AUG-19 `110144` and `163414` each have 103 rows with `NAS1149V0332H` the only
  duplicated part number (find 13 and find 32); AUG-03 `145243` has 103 rows and
  no duplicate. All four citations resolve to **60, 34, 29, 32** on every export
  under both orders. The fixture's find-13 row is recorded from `110144` index 12
  verbatim (values, `qty_raw`, `qty_alt_raw`) and `_source`/`_why` name the run
  it came from — no hand-written row.
- **The rebuilt crops, rebuilt by me** (own scratch `--data-root`, from the
  merged tree, so nothing shared was touched):
  `tan_link::pitch_plate_flange`, `pitch_link::pitch_plate_flange` and
  `vpa_output::pitch_flange_thickness` all come back
  `drawing_no 215735`, `drawing_revision A`, `located_by zone_cell`,
  `callout_text_in_zone true`, `sha256_verified true`. **None degraded to
  `sheet_full`.** Balloon crops: find **60, 34, 29** unchanged, no find number
  moved, and `find 32` is absent — which is deliverable 3 removing the element's
  crop, disclosed up front in the lesson and filed as a strategy issue rather
  than absorbed silently. That disclosure is the most valuable paragraph in the
  lesson.
- **`[real]` JS tier, re-run by me**:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **407/407
  passed** (forward slashes, so the `[real]` tier actually ran). Nothing for the
  operator to sequence.
- **The actuator.** Ran once from the main checkout; all three projections stamp
  `master`, `head_sha 70241cece1ce…`, `dirty false`, `behind_trunk 0`,
  `built_at 18:00:19/20/21Z` — verified on disk, all three agree. The author's
  reading is correct and important: `rebuild_projections.ps1` has no seam for a
  worktree tree, so the shared projection holds `master`'s values, not the
  handoff's. Nothing was refused; no `--allow-older-tree`. The note about the
  tension with `projection_provenance.py`'s own worktree reasoning is a fair
  observation and correctly left unfiled.
- **`PROVENANCE.md` (root) amended in the same commit** for every imported file
  touched — both stacks, both worksheets, the test module — each row in the
  established *"`source_ref` and `note` only"* grammar, and
  `tests/test_provenance.py` (including the byte-identity-claim guard) is green.
  The `citation_export_provenance` precedent was followed, not rediscovered.
- **`data/` hygiene.** Suite leaves no run folders and no modified fixtures
  (`data/runs/` empty in the main checkout). `data/inbox/specs/` untouched — no
  renames, no tidying. `docs/reference/` untouched. Nothing written into
  drawing-checker: the 215735-A PDF was **copied in** (verified identical by
  sha256 on both sides), and the only mutation anywhere near that repo would
  have been a write, of which there is none — checked by hash, not by
  `git status` over there.
- **Committed ids did not move.** `pitch_plate_215197` / `pitch_flange_215197`
  and every stack id survive; both topology notes and the
  `PITCH_LINK_PART_NAMES` comment state the id/name divergence explicitly and
  point at `BRIEF_20260916_link_name_authority.md` rather than pre-empting it.
  Exactly what the handoff asked for.
- **`intake_queue.json` rank 11:** `in_pile` correctly left `false`, with the
  reasoning written down (drawings are a different stream from the spec pile),
  and the "answered by a different part number" honesty is there. No watcher
  built.
- **Titles:** no stack, topology or study title changed. N/A.
- **Past readings preserved, live claims moved.** The handoff's rule was applied
  consistently: `identification_note`, `drift_warning`, F14 and F15 all kept as
  reasoned and given dated blockquotes; the joint's parts-list `role`, the
  worksheet header rows and the element source columns moved. I could not find
  a survivor of the old claim that should have moved — I grepped the branch for
  `215197` and every remaining occurrence is either a record of a past reading,
  the PRELIM's own identity, or the synthetic viewer fixture tier (correctly
  left alone).
- **The export-run invariant.** The resolution is good and is not a
  weakening-into-vacuity: it still fails on an unlisted postdating run, on a
  listed run nobody cites, and on any change to the cited set;
  `_RUNS_CLEARED_WITHOUT_A_TIMESTAMP` is by run id rather than by rule; and the
  strongest form was **moved** rather than dropped, to
  `test_the_strongest_read_only_claim_still_has_a_subject`, whose four pre-root
  runs and two stack files I confirmed. "Before narrowing a guard, check whether
  its subject exists elsewhere" is the right general lesson and the right
  action. Keeping the name and filing
  `ISSUE_20260916_the_readonly_invariant_test_name_outlived_its_claim.md` is the
  correct call given a staged handoff instructs a future agent by that name; the
  sequencing note is a courtesy that will actually be used.
- **All three filed issues** carry correct frontmatter — closed-set `type`,
  `priority`, `status: open`, `reporter: agent`, `found_by:` as a repo-relative
  path, `handoff:` correctly **absent**, and `audience: strategy` on the one
  that needs design. No prose-only issue. Nothing to correct.
- **Lesson audited** (universal check). Its arithmetic holds: the suite
  reconciliation, the 73 → 77 module count, the RSS half-width, the ratio moves,
  the collision table (103 rows, index 12/31, find 13/32, qty 15/9) all
  reproduce. Its causal attributions hold too — except the one in finding **F1**,
  which is where a lesson claim propagates a wrong reading forward.

---

## Findings

### F1 — BLOCKER — `8.80 ±0.10` is not on 215197 A.1, and the feature-succession claim it supports has no basis

**Location** (five live artifacts, plus the lesson twice):

| file | line |
|---|---|
| `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json` | 183 (`source_ref.note`) |
| `docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json` | 122 (`source_ref.note`) |
| `docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md` | 143 |
| `docs/tolerance_stacks/WORKSHEET_vpa_output_to_pitch_plate.md` | 212 |
| `data/inbox/drawings/PROVENANCE.md` | 117 |
| `docs/sessions/lessons/LESSONS_20260916_citation_identity_correctness.md` | 100, 113 |

**What's wrong.** All five say some form of *"215735-A sheet 1 gained a second
`4.06 ±0.10` at zone D6, where 215197 printed `8.80 ±0.10`"*, and the lesson
draws the conclusion *"a feature that was `8.80 ±0.10` on the PRELIM is
`4.06 ±0.10` on the released plate, printed immediately beside the sheet-1
callout the joint's qty-1 already argued for."* Measured on both PDFs with the
repo's own zone reader (`page_native_grid` + `zone_cell`):

- **215197 A.1 sheet 1 zone D6 is empty** — no words in the cell at all.
- There is **no `8.80` token anywhere in either document**. The PRELIM's token
  is **`18.80 ±0.10`**, and it is in zone **D7**, beside the `10.68 ±0.10` that
  is still printed at D7 on the released sheet.
- Sheet 1 was re-laid out between exports (`10.68` moves −23,−22; the surviving
  `4.06` moves +50,−28; `52.00`/`187.99` become `57.10`/`189.13`; `0.12` and
  `29.92` are new). There is no rigid transform under which the new D6 `4.06`
  occupies the PRELIM's `18.80` position, and applying the nearest local delta
  puts `18.80` ~230 pt away from it.

So the quoted callout does not exist on the document named, its zone is wrong,
and the "same feature, re-dimensioned" inference is unsupported. This is
blocking rather than a nit for three reasons: it is a **misquoted source callout
inside a `source_ref` note and inside the tracked `data/inbox/drawings/PROVENANCE.md`**,
which is the repo's record of what documents say; it reads as diligence, which
the checklist calls worse than no citation at all; and it lands squarely on the
**one open question this element hangs on** — F15's "which feature does the VPA
`4.06 ±0.10` mean", where "a further feature came to 4.06 right beside the
candidate" actively misleads the next reader.

**What is correct and should survive the fix:** 215735-A sheet 1 *does* print
**two** `4.06 ±0.10` callouts, at zones **D5** and **D6**, where 215197 A.1
printed one (D5) — I verified all of it. Three ±0.10 candidates, not two, and
the field genuinely got wider. Leaving the VPA citation on sheet 2 zone D10 and
saying why is the right call.

**Suggested fix.** Replace the succession claim with the measured facts in all
five live sites: *215735-A sheet 1 zone D6 prints a second `4.06 ±0.10` where
215197 A.1 printed nothing; the PRELIM's `18.80 ±0.10` (zone D7, beside the
`10.68 ±0.10` that survives) is absent from the released sheet, and which
feature the new D6 callout dimensions is not established here.* Then a dated
correction blockquote in the lesson, per the repo's convention for a record of
a past reading. Do not repair only the digit — `18.80` at D7 is still not "here"
and still does not license the inference.

### F2 — should-fix — a topology part's `revision` stayed `A.1` while its `drawing` became `215735`

**Location:** `docs/topologies/topology_pitch_link_to_pitch_plate.json`
(`parts[].id = pitch_plate_215197`) and
`docs/topologies/topology_vpa_output_to_pitch_plate.json`
(`parts[].id = pitch_flange_215197`).

Both read `"drawing": "215735", "revision": "A.1"`. 215735's revision is **A** —
the stack `source_ref`s were correctly moved to `"A"`, and the same object's own
`note` says *"zone D10 of 215735 A sheet 2"* two clauses later. These are the
only two `parts[]` entries in either file that carry a `revision` at all, and
the field is what the viewer renders; the note is not. Note and field disagree
and the field is wrong.

This is the handoff's restating inventory being the author's *starting*
inventory: it enumerated `parts[2].name`, `parts[2].drawing`, `parts[2].note`
and `provenance.part_identity`, and not `parts[2].revision`.

**Suggested fix:** `"revision": "A"` in both files. (Not fixed inline: the two
files are already being re-touched for F1, and the boundary keeps the author
holding what they got wrong. Worth considering in the same pass whether a
topology part's `revision` should be paired against the cited element's —
nothing today would have caught this.)

### F3 — should-fix — `WORKBOOK_BACKED_BANDS` is a registry with no pairing against the set it covers

**Location:** `tests/test_tolerance_stack.py`, `WORKBOOK_BACKED_BANDS` /
`WORKBOOK_BACKED_CITATIONS` and the parametrized
`test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`.

Extending the guard from one hard-coded stack to a curated dict was the right
move, the per-stack non-vacuity half was kept, and the added
`WORKBOOK_BACKED_CITATIONS` half ("name the artifact that actually prints the
band") is a real strengthening. But **a third from-scratch stack that folds a
workbook-derived band is not parametrized, and nothing fails.** That is the
handoff's own subject — a registry narrower than the thing it identifies —
one level up from the dedup key.

I verified the dict is complete *today*: of the four `transcribed_from: null`
stacks, only `pitch_link_to_pitch_plate` and `rotor_fastener_length` reach a
hardware entry whose `values_source.kind == "workbook"`. The three transcribed
stacks that also do (`tan_link`, `tan_link_take2`, `vpa_output`) are correctly
out of Step 5b's scope.

**Suggested fix:** derive the candidate set (from-scratch stacks with at least
one banded element whose `hardware_ref` resolves to a `workbook` `values_source`)
and assert it equals `set(WORKBOOK_BACKED_BANDS)`, keeping the curated values as
the expectations. Three lines, in a test that already loads both inputs.

### Nits

- The lesson's actuator table is headed `sha12` but quotes `head_sha`
  (`70241cece1ce…`); `sha12` is `null` in all three projections. Harmless, but
  the column name is the one a reader will grep for.
- `WORKSHEET_rotor_fastener_length.md`: *"The nominals are unchanged since
  2026-09-16"* reads as "changed on that date"; it means "unchanged across it".
- The lesson's "4 failed on the pre-fix `build_viewer_crops.py`" is the
  whole-file revert. Worth one clause saying so — a body-only revert gives 3,
  and the next agent reproducing it will wonder which they got wrong.
- `parts_list_row_for` returns `None` on a surviving tie but falls through to
  the next candidate part number when the cited find number matches **none** of
  a collision's rows, and returns a single match without checking it against a
  cited find number that disagrees. Neither is reachable on today's data (all
  four citations verified above), neither is a regression, and both are outside
  what the handoff specified — noted only so the next agent in that function
  knows the two doors are open.

---

## Note for the next reviewer

Three entries added to this repo's overlay under **Recurring bugs**, all new
classes from this review: the re-cite's prose claim about the *superseded*
document (F1 — and the three-line zone-resolution recipe that caught it), the
carrier field the handoff's restating inventory did not enumerate (F2), and the
curated registry with no pairing against its own scope (F3).

Two things about this review worth knowing next time you are here:

- **The zone reader is cheap and settles arguments.**
  `build_viewer_crops.page_native_grid(page)` + `zone_cell(cols, rows, "D6")`
  turns "the author says the callout is at D6" into a measurement, over any
  PDF, in three lines. It is how F1 was found, and it also independently
  confirmed the B4/B5 straddle the author documented.
- **A citation-currency handoff has two documents to re-read, not one.** Every
  error in this work was on the *old* export; every claim about the new one was
  exact. The author re-read 215735-A meticulously and read 215197 A.1 once, for
  comparison, and that asymmetry is where the blocker lives.
