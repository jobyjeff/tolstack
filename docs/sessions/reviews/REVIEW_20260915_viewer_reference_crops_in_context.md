---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_reference_crops_in_context.md
reviewer: agent (review/viewer_reference_crops_in_context)
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — viewer_reference_crops_in_context

Branch `handoff/viewer_reference_crops_in_context` (3 commits, `facd062` →
`61bb137`), merged into `review/viewer_reference_crops_in_context` at `f8ac4db`.
Merge-base `d16db3b`; `integration` had moved 34 commits underneath it and the
merge was **clean, no conflicts**. Containment checked before starting
(`git merge-base --is-ancestor` → not merged), so the merge-and-watch step was
real.

**Verdict: APPROVE.** All four deliverables land, verified end to end against
rendered pixels and against a real browser, not just against green. Five
should-fixes and four nits, all filed; three corrections applied inline.

---

## What I verified, and how

**The suite, in three tiers, on a projection set I built myself.** The shared
`data/projections/viewer/` is owned by live sibling sessions — mid-review
`review/stack_fable_audit` rebuilt it and turned a `407/407` run into `397/407`
on a README-vs-node-count claim that belongs to neither branch. So every JS
number below is against a scratch root (`C:/tsrev`, seeded from a copy of the
main checkout's `data/`, then all three projections rebuilt from the merged tree
— crops from drawing-checker's venv, which has PyMuPDF).

| tier | merged review branch | handoff tip | `integration` |
|---|---|---|---|
| `pytest -q` | **1121 passed, 1 skipped, 1 failed** | 1116 / 1 / 1 | 1098 / 1 / 1 |
| `run_tests.cjs` (fast) | 327/327 | 318/318 | — |
| `run_tests.cjs --repo` | **407/407** (real tier ran) | — | — |
| `run_viewer_browser_tests.mjs --repo` | **20/20** (313/313 both origins) | — | — |
| `run_mutation_witness_tests.mjs --repo` | 25/26 | — | 0/1 on the same entry |

The one red is `test_every_byte_identity_claim_in_a_live_file_names_its_verification`,
**pre-existing on `integration`** (measured there directly) and named in the
handoff's own §7. I read the failure's item list rather than its tally, per the
checklist: it names exactly one item,
`BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`, and the branch
adds none of its own.

The one unwitnessed mutation is `card-layout-out-of-flow`, which I re-ran at
`integration` with the same scratch root and the same `node_modules`: **NOT
WITNESSED there too.** Pre-existing, already filed five times over
(`ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_witnessing_on_integration.md`).
Not this branch's.

**The three named cases, by rendering the crop and drawing its own
`highlights[].frac` onto it.** This is the check nothing in the suite can do —
the registry-rect entry in the checklist, one layer out: a box two bands low
still loads, still resolves, still renders.

- **Deliverable 2, bolt grip.** `pitch_link_to_pitch_plate:bolt_grip_11` crops
  `[82, 76, 540, 598]` of NAS sheet 3: the whole grip/length table, both header
  bands (`LENGTH ±.015`, `BASIC NUMBER AND THREAD SIZE`), every basic-number
  column and the closing note — with a **dashed** box exactly on the Grip Dash
  No. 11 row (`11 | .688 | 1.011 | 1.058`). The figure is genuinely not on that
  sheet, and the sibling citation that needs it (`cotter_hole_from_point`, sheet
  1) gets the bolt figure *above* its dimension table with the NAS6403 row boxed.
  "Table + headers + figure" is met across the two sheets the citations name, and
  the registry says so in its own `shows`.
- **Deliverable 1, bushing.** `tan_link_to_pitch_plate:straight_bushing` is
  `located_by: balloon_view`, framed on balloon **34** in DETAIL B with the
  caption in frame and a **solid** box on the balloon; the companion image is
  the parts-list band `33 / 34 / 35` with `214820-002` boxed and
  `BUSHING, PLAIN, ALUMINUM BRONZE` legible. In a real browser (served mode, a
  loopback static server over the scratch root) the link reads `217755 rev A`
  and the string `"run"` appears nowhere in it.
- **Deliverable 3, pitch plate.** `pitch_link_to_pitch_plate:pitch_plate_flange`
  widened from `[…, 561.26, …]` to `[140.31, 446.46, 693.26, 892.92]` — exactly
  the figures the lesson quotes — and the render shows the lug, its bores and
  the extension lines the `5X 4.06 ±0.10` leader lands on. The callout no longer
  floats.
- **Deliverable 4, declared-region honesty.** Carried by the picture: `solid`
  for `verified_match`, `dashed` for `declared_region`, each with a `title` that
  says which claim it is in words. The `unlabelled` third treatment is drawn,
  not hidden, and says the claim is unknown.

**All four live balloon crops resolve to the find number their citation names**
— 34, 32, 60, 29 — each checked against the rendered parts-list band, not
against the field. The `MS21299C3` / `MS21299C3K` tie and the `NAS1149V0332H`
find-13/find-32 tie both resolve correctly (see should-fix 1 for why that is
luckier than it looks).

**Real-browser geometry.** `.cropfig`'s client rect is pixel-identical to its
`<img>`'s (397×366 and 397×51 measured), so a percentage overlay lands on the
picture: box at `(0.348, 0.181)` of the frame against `frac [0.34865, 0.18077]`.
Read the **whole** viewport too, per the standing rule — see nit 9.

**drawing-checker is read-only.** Snapshot taken at the start of this review
(5997 entries) and again at the end: `EMPTY -- no entry added, removed or
modified`, across two full crop rebuilds that read the balloon files, the page
JSON and the PDFs. For the *tactical* session, which left no snapshot, I used
the equivalent: nothing under `data/runs/` or `data/inbox/drawings/` has an mtime
later than the branch point (`2026-09-15 23:24:23`). `data/inbox/` in this repo
is likewise untouched since then, so `data/inbox/specs/` (59 files) is
append-only intact.

**The suite does not pollute production data.** `C:/workspace/tolstack/data`
holds 258 files before and after a full `pytest -q`, with nothing modified during
the run. The new tests read tracked fixtures under `tests/fixtures/viewer_crops/`
by design (lesson §8), which is the right call — both `data/` and
drawing-checker's `data/runs/` are gitignored.

**Guards observed failing, not trusted green.** Renaming a key in
`VA.CROP_HIGHLIGHT_KINDS` reddens the new `CROP_HIGHLIGHT_KINDS` pairing row (and
only it). Disabling the zone-branch attachment widening reddens
`test_the_widened_zone_crop_is_the_rect_the_live_projection_carries`. Forcing
`locate()`'s balloon branch off reddens three tests. Deleting the overlay loop
in `VA.cropFigure` reddens four. Four other one-line reverts did not redden
anything — see should-fix 2.

## The mandatory stack checks

**This work authors no tolerance stack and changes no element value** — the diff
touches nothing under `docs/tolerance_stacks/`. Checks 1–6 (traced citations,
signs on path terms, coherent corners, LMC/MMC direction, RSS computed, nominal
inside min/max, quantised cotter constraints) have no subject here and are
recorded N/A on that ground, not skipped. Check 1 applies in its *placement*
sense, and that is the whole of this review above: a crop is a provenance
surface, and a box that says *found on the page* is a claim exactly as strong as
a `traced` label.

**Check 7, the ratio, re-derived by me** with
`tests/debug_report_tolerance_stacks.py --ratio` on the merged tree:

> **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across the
> three seeded slice-1 stacks; **30 traced / 7 inferred / 22 untraced out of 59**
> across all stacks.

Unchanged by this handoff, as it must be — placement is not identity and cannot
make a value traced, which `ARCHITECTURE.md`'s new paragraph restates correctly.

## Findings

### Should-fix (all filed; none blocks the merge)

1. **A balloon crop picks its parts-list row by part number alone.**
   `parts_list_row_for`'s `{part_number: row}` comprehension silently keeps the
   last of two real rows; the 2026-AUG-19 217755 export carries `NAS1149V0332H`
   at find 13 *and* find 32, two different parts. Measured: `list(reversed(...))`
   flips the crop to balloon 13, boxes the find-13 row, and titles it *"found on
   the page: balloon 13"* — a solid `verified_match` about the wrong item, with
   nothing red. Right today by JSON row order. The disambiguator is already in
   the data (every live callout ends `"(find N)"`) and the sibling function one
   screen down already breaks the same tie by find number.
   `ISSUE_20260916_a_parts_list_row_is_keyed_by_part_number_alone_and_one_row_is_overwritten.md`
   (`high`).
2. **Three load-bearing wires revert silently.** Measured, each one edit, each
   leaving pytest 1121 / fast 407 / browser 20 untouched: the hover card's
   letterbox fix reverted (`object-fit: contain` returns, and every overlay on a
   card points into the letterbox — the defect lesson §2 credits the browser tier
   with catching); `companion = None` in `_crop_from_citation` (deliverable 1's
   second image gone from all four crops, `test_viewer_crops.py` 73/73);
   `"drawing_no": None` (the link falls back to the wording the handoff replaced);
   and the three companion-prefetch terms in `topology_app.js` (every balloon crop
   shows *"image is not on disk"* under *"Parts list, sheet 1"*). The pure
   functions are well tested; the seams between them are not.
   `ISSUE_20260916_the_crop_overlays_wiring_is_unwitnessed_in_every_tier.md`.
3. **`highlights[]` joined no `VALUE_GUARDS` table.** No `[real]` assertion reads
   a live crop's boxes at all, and `VA.cropHighlights` drops a box whose `frac`
   is not four numbers *silently*, so a builder that stopped emitting fractions
   renders as an honest "nothing was marked". The vocabulary is covered from the
   other side and covered well, which is what makes this direction easy to call
   done. `ISSUE_20260916_crop_highlights_have_no_live_data_value_guard.md`.
4. **Two wrong counts in the sheet-3 context's `shows`** — the field this repo
   treats the way it treats a `source_ref`. *"the fourteen basic-number columns"*
   (13; the NAS series skips odd numbers above 6410) and *"all 96 grip-dash
   rows"* (64 rows; 96 is the highest dash number). Counted off a 5× render of
   the rect. **Fixed inline**, with the reasons written into the field.
5. **A seventh issue for one red.** `docs/issues/` now holds seven filings of the
   same `test_every_byte_identity_claim_…` failure. Six of them were already in
   this branch's own merge-base tree, so `ls docs/issues/` in the tactical
   worktree would have shown them. **Cross-referenced inline** into the newest
   filing, which is kept (best repro, names `df21a4a`) rather than deleted.
   **Triage should close all seven as one.**

### Nits

6. **Lesson §8: *"the first row there that reads an importable constant"*.** It
   is the fourth — `EXPORT_STATUSES`, `VERDICT_SCOPES` and `VERDICTS` are all
   `lambda: tuple(<imported name>)` rows, which the new row's own comment in
   `test_js_python_vocabulary.py` says out loud. **Corrected inline**; what is
   genuinely new is that a `build_viewer_crops` constant is importable from a
   test at all.
7. **Lesson §7: `1115 passed`.** Exact at `65e5c11` (re-measured there); the
   shipping tip `61bb137` reports 1116, and that same commit edited the lesson
   without moving the count. **Corrected inline** with both figures and the
   merged one.
8. **Lesson §8: *"Two live crops clamp today (… 217755 sheet 8)"*.** Measured by
   instrumenting `clamp_to` and rebuilding both crop spaces: **three** clamp by
   more than 0.01 pt, and the balloon+zone union among them is on **sheet 4**
   (`tan_link_to_pitch_plate:straight_bushing`, `-24.57 → 0.0`). Neither sheet-8
   balloon crop clamps. **Corrected inline**; the bullet's point stands.
9. **The same pane still prints bare run ids as link text**, two inches above the
   link this handoff renamed *because* "a run is an internal artifact".
   Pre-existing and outside the handoff's stated scope, and arguably defensible —
   a run id is the address of the thing that link opens. Filed, not fixed:
   `ISSUE_20260916_the_element_pane_still_prints_bare_drawing_checker_run_ids_as_link_text.md`
   (`low`). Two smaller ones, not filed: the companion `<img>` in the detail and
   topology panes gets `croppop__img` while the crop beside it gets
   `detail__crop-img` — identical rules today, so a future change to one misses
   the other; and the parts-list band carries ~110 pt of empty margin, which
   lesson §9 already records with the numbers to act on.

## What I changed on this branch

Three inline corrections (the two `shows` counts; three lesson corrections as
dated blockquotes; the duplicate-issue cross-reference), four issues filed, five
entries appended to `docs/prompts/REVIEW_AGENT.md`, and **one
`scripts/mutation_witnesses.json` entry declared** —
`crop-carries-the-boxes-worth-looking-at`, for the half of the deliverable that
*does* redden on mutation, witnessed 1/1 with a clean run first. The four halves
that stayed green could not be declared, because no check goes red on them; that
is what finding 2 is for. I also added `W` to the sheet-1 context's
lettered-dimension list, which reads as exhaustive and omitted a dimension that
is in the rect.

## For the next reviewer

The lesson is unusually good — the drawing-checker reuse verdict (§1) is the
kind of investigation the handoff asked for and got, the DOM-vs-pixels argument
(§2) is right and is why the rects stay reviewable at all, and §4's "the named
bushing case has MOVED, here is where I verified it instead" is exactly the
honesty that makes a definition of done checkable after a sibling handoff lands.
Every claim in it that I could re-derive, I did; three were off and are corrected
in place.

The thing to carry forward is the shape of finding 2: this is the first handoff
here whose deliverable is *geometric on a static image*, and the repo's three
tiers cover a pure function, a hand-fed renderer and a live-DOM click — none of
which is "the box is over the right ink". The two checks that actually settled
it in this review were **render the crop and draw its own fractions onto it**,
and **measure the client rects in a real browser**. Both are ten lines. Neither
is in any tier.
