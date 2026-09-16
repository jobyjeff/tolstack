---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_stack_fable_audit.md
reviewer: agent (review/stack_fable_audit)
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# Review — `stack_fable_audit` (full-pass audit of every stack and topology)

**APPROVE.** Zero blockers. Three inline interventions, all within the review
boundary or the merge-conflict carve-out; every one is described below and
committed on the review branch. The provenance audit — the part of this review
that matters most, since the handoff's whole subject is provenance — re-verified
every new citation against the actual documents and found **every one exact**.

## The merge and its conflicts (carve-out; report required)

`integration` moved 466bc95 → 49a935f while this handoff was in flight, and two
of the moves landed on the same surfaces:

1. **`topology_pitch_link_to_pitch_plate.json` parts block** (textual conflict).
   Integration's `viewer_component_names_and_reference_copy` restyled the four
   part names to reader-facing copy and pinned them by value
   (`PITCH_LINK_PART_NAMES`, set-equality; `MAX_PART_NAME_CHARS = 44`; no
   ` -- ` clause); the handoff added two parts in the old nomenclature style
   (85/88 chars, one with a ` -- ` clause). Resolution: integration's washer
   copy kept; the handoff's two parts brought in restyled to the convention —
   `pitch-link spherical bearing (unconfirmed)` and `NAS77A3-015A flanged
   bushing` — with everything shed demoted into `note`, and
   `PITCH_LINK_PART_NAMES` extended to six entries, which is what the guard's
   own failure message instructs. The UNCONFIRMED loudness survives in the
   part note, the edge name, the element, and the check guidance.
2. **The README live-node pairing** (semantic, textually clean). Integration's
   `464f4e8` added a `[real]` test that regexes *"17 of the 46 live nodes"*
   out of `apps/viewer/README.md` and `views/topology.js` and asserts both
   digits against the live projection; the handoff's two new interfaces moved
   the live-node total 46 → 48. Neither branch could see the other. Both
   carriers now say 48 (the divergence count 17 did not move — verified by the
   passing first assertion and the re-run).

## The three findings (all resolved on the branch)

- **[should-fix, fixed inline] The branch added its own item to the already-red
  byte-identity guard.** `AUDIT_20260915_full_pass.md` wrote "byte-identical
  end-stop twins" with no named verification in the paragraph, so
  `test_every_byte_identity_claim_in_a_live_file_names_its_verification` — red
  on `integration` for the origin-posture strategy brief — reported **two**
  items while still reading `1 failed`. The lesson's suite-state sentence
  ("the one failure is the branch-point one") was true of the test name and
  false of the item list. Fixed by naming
  `test_an_end_stop_study_s_selection_and_transforms_equal_its_source_study`
  in the same paragraph (the study JSONs already named it; only the report's
  copy didn't). This is the checklist's known-red-mask entry, third sighting —
  no overlay edit needed, but note for triage: the *pre-existing* brief red now
  has **eight** sibling `ISSUE_20260915_*byte*` filings in `docs/issues/`;
  triage should consolidate to one.
- **[should-fix, fixed inline] The "~3.3 mm" wide-bearing counterfactual does
  not reproduce.** Five copies (stack eye note, MS14101-3 hardware gap, audit
  report, worksheet amendment, a test comment) said the wide MS14103-3 leaves
  the shank "~3.3 mm inside the column / short of the washer face at nominal".
  The pinned figure directly beside one copy is **4.8324 mm**
  (`column.nominal − 7.14 + 11.10 − grip.nominal`); 3.3 only falls out of a
  column *missing the flange member this same handoff added* — an
  investigation-time figure that survived the model completing. The argument's
  direction is unaffected (the wide bearing still can't close, and the cotter
  budget still goes negative at −1.63); all five copies now read ~4.8 mm.
- **[resolved as merge anchor] the 46 → 48 pairing above.**

## The seven mandatory checks

**1. Every tolerance traces — PASS, and re-verified against the ink.** All new
citations opened and read in the main checkout:

- `RBC_Aerospace_Plain_Bearings_Web.pdf` sha256 recomputed = `a2bfa011…` ✓;
  PDF p21 (printed 19) MS14104/MS14101 NARROW row −03: `W .281/7.14`, header
  `+.000,−.002 / +.00,−.05` ✓ → 7.09/7.14; PDF p22 (printed 20)
  MS14102/MS14103 WIDE row −03: `W .437/11.10` ✓ → 11.05/11.10; MS14101 =
  grooved ✓; W > H on every row (ball vs race) ✓. The VPA candidate: narrow
  −04 row `W .343/8.71` → 8.66/8.71, matching workbook E64/G64/H64 to the
  digit — correctly **recorded, not claimed** (`kind: workbook`/`untraced`
  kept; SOP trap 11 honoured).
- `JB_NAS77.pdf` sha256 = `b6c5b021…` ✓; NAS77A3/A4 rows `F .062` with header
  `+.000,−.005 / +.00,−.13` ✓ → 1.4478/1.5748; figure `L ± .005`, dash decode
  `−015 = .150 in`, `I.D. .025–.035 x 45° CHAMFER BOTH ENDS` ✓; printed p98 ✓;
  "aluminum coating" listed as a finish option with no suffix decode — the
  trailing-'A' gap is honest.
- `[2025-OCT-9 …] 216231 A.1.pdf` p1: **item 24 = 213862-002 PITCH LINK
  ASSEMBLY, PROPELLER, qty 5** ✓ (both config columns).
- drawing-checker run `20260904_184233_212956-005-A`: find 1 = MS14103-3
  (WIDE) qty 1, find 2 = MS14101-3 (NARROW) qty 1; `ts`
  2026-09-05T01:42:48Z ✓; input sha `47ff6cc6…` ✓. Run
  `20260813_180719_215177-A`: find 2 = NAS77A3-015A qty 8, find 3 =
  NAS77A4-015A qty 1; `ts` 2026-08-14T01:07:33Z ✓.
- Workbook cells re-dumped (`debug_dump_tol_stack_xlsx.py`): E8/G8/H8 =
  11.1/11.05/11.1 ✓; G9/H9 are literally `=(0.062−0.005)*25.4` /
  `=0.062*25.4` — the NAS77 F column as formulas ✓; rows 14/15/40–43 the
  same ✓; I62 = `NAS77A4-015` hung on the header row ✓ (the audit's loose-label
  resolution is right — row 65 carries the F-column formulas, row 63 is the
  4.71/4.81 straight bushing the 2026-08-13 read refused the label for).

Confidence grading is honest and graded *for the joint*: the eye stays
`untraced` (the value is re-readable; the part identity is not — the two
candidates differ by 3.96 mm); the nine re-cites are `inferred` (printed band +
count-argument identity); the four new hardware ENTRIES are `traced` (an entry
grades its numbers against its page), with the split argued in the entries
file and pinned. Nothing was invented; the one genuinely new number in the
repo (the eye placeholder) is the loudest-marked value in it, per Jeff's
2026-09-15 placeholder ruling, with the closing document named everywhere and
ranked gap 1.

**2. Signs — PASS.** Both new elements are additive (+1 in `element_terms`,
pinned); `shank_out` = `+clamped_stack_sourced − bolt_grip_11`,
`cotter` = `+head_to_cotter_hole − clamped_stack_sourced`, unchanged shapes.
The direction of the *prose* also checked: the completed shank-out check's
0.1098 mm is `column.min − grip.max` (the binding end), and the old budget
reading is retired with the cross-check stated (7.09 + 1.4478 = 8.5378 ≥
8.4280, margin exactly 0.1098 — re-derived, exact). The budget→joint scope
flip is the whole point of the handoff and is pinned in Python, projection and
JS tiers.

**3. LMC/MMC — PASS.** Eye and flange are additive one-sided bands with
`nominal == max == mmc`, `lmc == min` ✓. The `max == mmc`-everywhere state is
earned and argued in the stack note (no subtracted feature; the flanged
bushing's I.D. chamfer deliberately not modelled — no bore-depth path — with
the tan-link stacks, which do model it, named). `fold()` untouched.

**4. RSS — PASS.** All checks report nominal/worst/RSS (worksheet tables carry
all three); verdicts read nominal + worst-case only; the three asymmetric
bands' RSS-centre offset (0.1535 = 0.065 + 0.025 + 0.0635) is stated in the
stack notes and pinned in tests.

**5. Nominal inside min/max — PASS.** One-sided bands store nominal == max as
the catalog writes them; no transcribed nominal was "fixed"; `bushing_chamfer`
nominal-as-midpoint is disclosed as computed (page states limits only, SOP
Step 2). The take-1 flange keeps the workbook's hand-typed 1.575 with the
0.0002 mm disagreement kept as information — correct refusal to flatten.

**6. Quantised constraints — PASS, at the required location.** The cotter
check stays `complete: false` with the excluded term rewritten to say the
*right* thing (the castellation PHASE is uncontrolled; MS9363 Rev C's printed
height deliberately not folded — folding it would dress an alignment question
as a linear one). The worksheet carries the caveat in a blockquote **directly
under the Checks table**, plus the new quantitative half: an MS9363-09 at max
height (5.0292 mm) does not fit the 2.3296 mm worst-case budget.

**7. The ratio — re-derived by me** with
`tests/debug_report_tolerance_stacks.py --ratio` on the merged tree:

> seeded: **5 traced / 12 inferred / 9 untraced, out of 26 element instances**;
> all stacks: **30 / 17 / 14, out of 61**.

Matches every pinned figure (tests), the SOP's updated sentence, and the
per-stack worksheet claims (tan 3/5/3 of 11, take2 1/4/4 of 9, vpa 1/3/2 of 6,
pitch-link 4/1/3 of 8). The numerator did not move — the audit added no
`traced` label, which is the honest direction. Non-element values: unchanged
by this handoff (the thermal stacks' 0-of-7 stands; topology transform ratios
untouched and still guarded). Every `untraced` instance is a listed gap
(pinned for pitch-link; spot-checked for the re-cited stacks).

## Also verified

- **New guards observed failing, all arms:** `test_every_study_has_checks_or_
  says_why_not` reddens on a stripped `no_checks_reason` AND on checks+reason
  together; the extended cross-stack guard reddens on a flipped band (11.05 →
  11.06) AND fails "classify me" on an element id the multi-feature map does
  not claim. All mutations reverted.
- **Suites on the merged tree:** pytest **1130 passed / 1 skipped / 1 failed**
  — the failure is the pre-existing `integration` red (origin-posture brief,
  filed eight times over; not this branch's). JS fast+`[real]`: **395/395**
  against a scratch `--repo` root (junctioned real `data/inbox` + `data/meshes`,
  all three projections + crops rebuilt from this tree; mesh counts non-zero,
  MAX_PATH trap avoided per the checklist). Browser truth tier: **20/20**.
  Mutation-witness tier: **22/23 with `--repo` at the scratch root** (without
  `--repo` it reports 9 browser misses — that's the stale-shared-projection
  shape, not real); the one miss is `card-layout-out-of-flow`, the
  already-filed integration condition.
- **Lesson audited:** the 907 suite count reconciles (892 + 13 git-env
  failures + 2 env skips in an archived tree); the operator-queue ids all
  exist in forge (`data/inbox/agent-todos/`, all seven, content spot-checked —
  todo 4 quotes rows 38/39 verbatim as the handoff required; todo 1 correctly
  warns off re-exporting the four drawings already in hand). The
  "one failure" sentence was the miss — see finding 1.
- **Operator-fact push-backs verified:** 212956-005 carries one narrow + one
  wide bearing (not one per link type), and the 5-place link is 213862-002,
  not 212956-005 — both read directly off the cited extractions by me. The
  handoff's own 212956 export ask was correctly not queued.
- **Read-only invariant:** my own snapshot at review start (5997 entries,
  2026-09-16T06:54Z) matches the session's closing count; end-of-review diff
  run before the push (below). `data/inbox/specs/` untouched by the session —
  every cited file's mtime predates it (`JB_NAS77.pdf` is from 2024;
  `MS24665 Rev F.pdf`, dated 16:10 local on 09-15, is an operator drop hours
  before the session's snapshot window).
- **`forge check`:** OK in the worktree and the main checkout.
- **PROVENANCE.md:** amended rows verified by the suite's own diff tests, and
  the amendments' *claims* ("no numeric field, path or check changed") match
  the diffs I read.
- Issues filed by the handoff: all three carry correct frontmatter and
  `found_by:` (not `handoff:`).

## For the next reviewer

- The pitch-plate lug citations still name the PRELIM 215197 fixture inside
  drawing-checker — long-standing; the succession to 215735-001/-002 is now
  properly filed (`ISSUE_20260915_stacks_cite_the_prelim_215197_plate_…`) with
  the values verified to hold on the released drawing.
- The shared main-checkout projections are rebuilt as part of this review's
  integration step (they were stamped by an older tree during review, which is
  why the mutation tier needs `--repo` until then).
- Eight sibling issue filings exist for the one pre-existing byte-identity
  red; triage should keep one and close seven as duplicates.
