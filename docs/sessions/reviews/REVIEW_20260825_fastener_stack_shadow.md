---
type: review
handoff: fastener_stack_shadow
reviewer: agent
date: 2026-08-25
verdict: APPROVE
blockers: 0
---

# Review — fastener_stack_shadow

Handoff: `docs/sessions/completed/HANDOFF_20260825_fastener_stack_shadow.md`.
Branch under review: `handoff/fastener_stack_shadow` (2 commits), merged into
`review/fastener_stack_shadow` (created from `master`).

Deliverable: `stack_rotor_fastener_length.json` (a from-scratch, no-workbook
stack, SOP Step 5b) + `WORKSHEET_rotor_fastener_length.md`, 10 new
`hardware_entries.json` rows (`NAS6403U2H`..`U10H`, `MS21299C3`), 5 new tests
in `tests/test_tolerance_stack.py`, PROVENANCE.md/SOP/README amendments, and
a lesson.

## What was verified, and how

This review re-derived every fact it could rather than trusting the
worksheet's own arithmetic or the lesson's own claims — per this repo's
standing rule, a review is a **provenance audit**, not an arithmetic review.

- **Re-rendered the actual source documents.** Using
  `tests/debug_trace_stack_values.py` (drawing-checker's PyMuPDF venv) against
  the real files in the main checkout:
  - `data/inbox/specs/NAS6403-NAS6420 Rev 4.pdf` sheet 3: cropped and read the
    printed table by eye. All nine cited grip values (.125/.188/.250/.312/
    .375/.438/.500/.562/.625) and their NAS6403 `.1900-32` LENGTH column
    values (.448/.511/.573/.635/.698/.761/.823/.885/.948) match the JSON
    exactly, and the column header reads **"Grip ± .010"**, confirming the
    tolerance band cited on every one of the nine fastener elements. No
    invented numbers.
  - The 217755 `[PRELIM 2026-AUG-19]` export, sheet 8: general note 24 reads
    verbatim **"SELECT ONE FASTENER FROM PROVIDED OPTIONS AS REQUIRED FOR
    CORRECT GRIP LENGTH PER JPS00094 AND/OR AC43.13-1B"** at printed zone C4 on
    sheet 1 — the joint-identification argument's central claim, confirmed
    byte-for-byte. The `SECTION T-T` caption sits at printed zone **H3** on
    sheet 8, exactly as claimed. Note 12's balance-weight language
    ("...AS REQUIRED TO MEET BALANCE SPECIFICATIONS...ANY ONE OF 10 HOLE
    LOCATIONS...") also confirmed verbatim.
  - The run's own `217755_A_balloons.json` (`data/runs/20260819_163414_...`):
    every find number, part number, nomenclature and `qty_raw` claimed in the
    stack/hardware entries (32, 54–72) matches exactly, including the
    as-drawn misspelling "ASEMBLY" on 215175-002 and washer 32's dual
    balloon at SECTION T-T *and* DETAIL B sheet 4 (both worksheet claims
    corroborated).
- **Re-hashed both cited exports.** `NAS6403-NAS6420 Rev 4.pdf`'s sha256 and
  the 217755 AUG-19 export's sha256 both match the `source_ref.export.sha256`
  values in the stack JSON exactly.
- **Re-read both cited runs' `run_meta.json`.** `ts` values for
  `20260819_110144` and `20260819_163414` match the JSON's `export.runs`
  entries exactly; both predate this session's first commit (2026-08-25) by
  six days, `purpose: eager` (not a same-session test run) — consistent with
  the read-only invariant.
- **Re-ran the drawing-checker snapshot diff** (`scripts/
  snapshot_drawing_checker.py diff`) against the session's own before/after
  JSON: **EMPTY**, confirmed independently, not just quoted from the lesson.
- **Re-derived the traced ratio** (`tests/debug_report_tolerance_stacks.py
  --ratio`): `rotor_fastener_length` is 9 traced / 2 inferred / 0 untraced of
  11; all seven stacks combined, 30/9/20 of 59. Matches the worksheet, the
  lesson, and the new test assertions exactly.
- **Merged into the review branch and re-ran the full suite** (a sibling
  handoff, `endstop_graft_workorder`, had landed on `master` mid-review, plus
  `stack_viewer_layout_v2`'s board-activation commit): one real conflict, in
  `PROVENANCE.md`'s README.md row, where both sibling handoffs appended an
  "Amended again 2026-08-25" clause to the same cell — resolved additively
  (kept both clauses, in order), per this repo's established convention for
  this exact conflict shape. **472 passed, 1 skipped**, worktree, on the
  merged tree.
- **Rebuilt both viewer projections** from the merged tree (`scripts/
  build_viewer_projection.py`, `scripts/build_viewer_crops.py`, both
  `--data-root C:/workspace/tolstack/data`): both were stale (stamped to the
  handoff's own tip, 4 commits behind trunk); rebuilt cleanly, `dirty: false`,
  `behind_trunk: 0`. Crops: 37/59 resolved, this stack's 11 citations all
  among the resolved set, sha256 33/33 verified, 0 mismatched — matching the
  lesson's numbers exactly, independently reproduced.
- Confirmed `data/inbox/specs/` untouched (no new files; append-only intact)
  and no ARCHITECTURE.md inventory is stale (no new script files added).
  Grepped the diff for harness artifacts (`</invoke>`, `</content>`,
  `<parameter`) — none found. Checked `git diff -w --stat` against the
  disproportionately-large-looking `hardware_entries.json`/
  `test_tolerance_stack.py` diffs — both proportionate, no reformat/NUL-byte
  issue.

## The seven mandatory checks

1. **Every tolerance traces to a spec or drawing callout.** PASS. All 9
   fastener elements are `kind: spec`/`traced` on `NAS6403-NAS6420 Rev 4.pdf`
   sheet 3, re-verified against the rendered page (see above) — same document
   three existing entries already cite, same sha256. Both washers are
   `kind: parts_list`/`inferred` (correctly capped — a parts list never
   carries a band) with a declared **zero-width band** (MS21299 and NAS1149
   both confirmed absent from `data/inbox/specs/`), not a plausible invented
   one. No `untraced` elements in this stack. No `kind: workbook` anywhere,
   as SOP Step 5b requires for a from-scratch stack.
2. **Signs on every path term.** PASS, with one initially-suspected finding
   that did not survive verification (see "A finding I raised and retracted"
   below). The nine `grip_budget__*` checks share
   `pitch_link_to_pitch_plate:shank_out__11_sourced_only`'s exact term shape
   and `complete: false` budget framing; the worksheet's "worst case" column
   (`|WC min|`, grip at max) matches that precedent's own established
   direction exactly, confirmed against JPS00094 5.5.5's actual failure mode
   (a grip *longer* than the clamped stack is what risks incomplete-thread
   engagement, not the reverse). New overlay entry added so the next reviewer
   doesn't have to re-derive this from scratch.
3. **LMC/MMC direction.** PASS. All nine fastener elements are additive
   external lengths (`max == mmc`), confirmed against the actual balloon set
   — no chamfer/relief/counterbore anywhere in this joint's parts list. Both
   washers correctly carry null `lmc`/`mmc` (no transcribed material
   condition exists to record). `max == mmc` on every element is the
   documented legitimate exit (no subtracted material feature), and the
   worksheet states so explicitly.
4. **RSS actually computed.** PASS. All nine checks report nominal, WC
   min/max and RSS min/max together. RSS equals WC exactly here — correctly
   so, since only the fastener term carries a nonzero half-range (both
   washers are zero-width); RSS of one nonzero contributor is that
   contributor's own half-range.
5. **Nominal inside its own min/max.** PASS trivially for all 11 elements
   (fasteners are symmetric ± bands by construction; washers are zero-width).
6. **Quantised constraints (castellation/cotter).** N/A, correctly
   determined and stated next to the numbers. Independently confirmed against
   the actual parts list: no MS9363 or MS24665 part number appears among this
   joint's balloons (32, 54–72) — retention here really is a blind tapped
   hole, not a nut.
7. **Traced / inferred / untraced ratio.** **9 traced / 2 inferred / 0
   untraced, out of 11 element instances** for this stack — re-derived by me,
   not copied. Across all seven stacks now in the repo: **30 traced / 9
   inferred / 20 untraced, out of 59 element instances**, matching the
   worksheet, the lesson and `test_the_seeded_traced_ratio_is_the_number_
   every_document_quotes` exactly. The seeded three (26 instances,
   untouched by this handoff) are unaffected. Non-element values: none in
   this stack (no material/temperature/ratio quantities involved).

## A finding I raised and retracted

Working the physics forward from first principles, I initially concluded the
worksheet's "worst case" budget numbers (e.g. U2H: 1.016 mm) had the
direction backwards — that a *longer* grip should be the more forgiving case,
so the smaller-magnitude end should be "worst case." Re-reading
`pitch_link_to_pitch_plate`'s identically-shaped check and its own `guidance`
string settled it the other way: a grip longer than the clamped stack is the
actual JPS00094 5.5.5 failure mode (incomplete threads engaging the receiving
member), so grip-at-max really is the binding, worst-case combination, and
the worksheet is correct. Recorded as a new overlay checklist entry so this
doesn't cost the next reviewer the same detour.

## Also verified

- **Schema hygiene.** `element_id`/`run_id` null on every citation; every
  `drawing`/`parts_list` citation carries a resolved `export` with matching
  sha256; every new hardware entry has a non-empty `gaps` list, a
  `values_source` (`spec`/`traced` for the nine bolts, `parts_list`/
  `inferred` for `MS21299C3`), `library_ref: null` paired correctly with
  `values_status: "inline"`.
- **`hardware_entries.json`'s `description`** was recounted: "five of the
  25" / "FIFTEEN entries are traced" / "Four entries are `not_transcribed`" —
  all present verbatim, matching the new test's assertions.
- **PROVENANCE.md**'s `hardware_entries.json` and `tests/
  test_tolerance_stack.py` rows both amended additively with dated notes
  (the one merge conflict was between two sibling handoffs' amendments to the
  same row, resolved additively as noted above).
- **Findings use diagnosis codes** (F1 `[drift]`, F2 `[model, unresolved]`,
  F3 `[read — resolved]`) and a genuine `[read]` finding is present (F3), a
  good sign per this checklist's own note about authors who hit none.
- **Comparison section correctly pending.** Confirmed `data/inbox/
  tolerance_stacks/` does not yet hold `260825_rotor_fastener_jason.*` —
  the worksheet's "PENDING" framing is still accurate as of this review.
- **Scope stated explicitly**, including what's out of scope and why
  (hole location, torque, safety cable, diameter/hole fits, thread engagement
  depth).

## Nits

- None worth recording separately from the overlay entries added above.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` (this repo's overlay) already existed and was
well populated; appended three new entries under "Recurring bugs to check":
the budget-check direction subtlety this review nearly mis-flagged, the
`git checkout <commit> -- .` main-checkout hazard from the incident below,
and the Bash-backslash `--data-root` path-mangling footgun. No entries were
pruned — nothing in the existing list has gone stale or repeatedly found
nothing.

## Incident during this review (not a finding against the handoff)

While verifying test behavior, I mistakenly ran a whole-tree `git checkout
<commit> -- .` directly in the main checkout, which clobbered seven
uncommitted files belonging to a concurrently-running peer session
(`stack_viewer_layout_v2`, itself editing directly in the main checkout
rather than its own worktree). The peer session recovered its own content
from its conversation context and confirmed the main checkout is clean.
Filed as `docs/issues/ISSUE_20260825_stack_viewer_layout_v2_edited_the_main_
checkout_directly.md` (out of scope for this handoff) and as a new overlay
entry so no reviewer repeats the `git checkout -- .` mistake. Unrelated to
the fastener_stack_shadow deliverable itself.

## Verdict

**APPROVE.** Zero blockers. This is a from-scratch stack whose fastener half
is unusually well-sourced (9 of 11 element instances traced straight to a
rendered, hand-verified spec table) and whose two structural gaps
(balancing-mass thickness, receiving-structure engagement depth) are honestly
modelled as excluded budget terms rather than invented. Merging into
`master` and cleaning up worktrees/branches per the standing integrate-on-
approve instructions.
