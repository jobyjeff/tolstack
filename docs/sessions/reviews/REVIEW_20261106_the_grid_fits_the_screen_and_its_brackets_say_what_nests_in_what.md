---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
reviewer: agent
date: 2026-11-06
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what

Branch `handoff/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`
(14 commits, `ca18a3c3`..`047f9d9e`). It was not already in `integration`
(the `merge-base --is-ancestor` check came back negative). This is round 1:
there was no prior review commit on `review/<slug>`.

## What I verified

- **The handoff worked is the `active/` one.** The lesson arrives as `A`, not
  `M`. Four witness specs are renamed (`R`) and three deleted (`D`), each
  matching a guard rename or retirement stated in `scripts/guard_enumeration.mjs`.
- **Model code (`apps/viewer/topology.js`).** `VA.gridBraces` nests study >
  sub-stack > body (only when a body spans more than one part) > part rule.
  `VA.rowSourcingMark` puts `no_value` ahead of the edge's own confidence for
  a band-less term. `VA.SOURCING_MARKS` and `VA.SOURCING_UNMARKED` are named
  constants, so the vocabulary rule holds. `VA.partColumns` reads the number
  from the part's own name and falls back to `drawing`. That matches the part
  records in `docs/topologies/*.json`.
- **Deliverable 6 interpretation.** The handoff text says "the grid may run
  behind the DAG canvas". Jeff's note reports that as the bug. The author
  built "never behind", flagged the deviation in the lesson, and asserted it
  in the browser checks (`dagPastGrid <= 1`). I agree with that call.
- **Deliverable 1 deviation.** A part gets a plain rule, not a pair of caps,
  because most parts are one row. That is stated in the code comment and the
  lesson. It is a reasonable call, but it is a deviation from the handoff's
  "each group (study, body, sub-stack, part)", so Jeff should see it in
  the shots.
- **Routed issues.** Both carry `handoff:` pointing at this handoff, so they
  auto-resolve at Complete. See blocker 2 for why one of them should not.
- **Test record.** The tactical record is complete and consistent with the
  diff: fast 637/637, annotate 285/285, browser 41/41 suites, witness
  `--changed-since` 38/38 reached plus six own specs via `--only`, and pytest
  `1727 passed, 1 failed (worktree-only viewer suite), 1 skipped`. I gave it
  the benefit of the doubt.
- **No pre-merge risky subset was run.** The verdict is REQUEST CHANGES on
  evidence in the author's own committed screenshots and source, so nothing
  was merged and no post-merge suite is owed this round.
- **Screenshots.** I read `kin_3840_grid_crop`, `kin_1600_arrival` and
  `grip_3840_grid` from the branch.

## Blockers

### 1. The new width budget clips the grid's own totals, with nothing on hover

**Location:** `apps/viewer/views/topology.js` `COLUMNS` (nominal/min/max 68,
contribution 200, part 100); `totalRow` and `stackFoot`.

**What's wrong:** `.tvcell` is `overflow: hidden; text-overflow: ellipsis`
with 8px padding a side. So a 68px number column has 52px for text. That
measured fine for a member row's `−32.185`, but it is too narrow for a totals
row. The author's own shots, at **3840 px**, show:

- **Chain-study RSS total clipped** (`grip_3840_grid.png`): the RSS row's min
  and max read `-5.785…` and `-5.238…`. Those are the study's answer.
  `totalRow` sets no `title` on its number cells, so the reader has no way to
  read them. They are 80px on `integration` and were not clipped there.
- **Kinematic total clipped** (`kin_3840_grid_crop.png`): the contribution
  reads `±2.355 deg · RSS …`. The code comment on the 200px column names
  exactly this string as what the width was chosen to fit.
- **PART numbers clipped**: `215735-…`, `213668-…`, `214699-…` and
  `NAS1149V03…`. The column comment says 100px is "wide enough for
  `213668-002` inside four brackets' indent", but the shot shows it clipped
  at three.

Deliverable 5 is "it fits". A grid that fits by cutting off its totals has
not fit. The lesson's width table repeats the claims the shots refute (see
the lesson audit below).

**Suggested fix (author's call):** measure every column against the longest
string each one prints, in **totals rows** (`--t-dense`, bold) as well as
member rows. Give a clipped number cell its full text on hover. Re-take the
3840 shots. Add a browser check that no `.tvtotal` number cell has
`scrollWidth > clientWidth`, so this is caught by the suite rather than by
eye. That is a designed-behaviour change, so it goes back to the author.

### 2. The routed 59 px slit issue would auto-resolve with its repro unchanged

**Location:** `docs/issues/ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`
(`handoff:` is this handoff); lesson, "Whole walk at 1600".

**What's wrong:** That issue is the whole-walk product graph at 1600 wide.
The lesson measures the same 59 px of PART at rest after this work, and
files the question again as a new strategy issue
(`ISSUE_20261105_the_whole_walk_opens_at_zoom_1_…`). At Complete, dispatch
will set the routed issue to `resolved`, which is terminal, while its own
repro still reproduces. The DoD's 1600 check covers only the kinematic study,
so it never exercises that case. Making those cells clickable is real
progress, but the issue's title complaint (a 59 px slit) stands.

**Suggested fix:** either fix the whole-walk landing (the new issue's
option 1), or have the routed issue say what this handoff changed and move
its `handoff:` link off this handoff so it does not close here. The new
issue can then be its continuation. Whichever you choose, the lesson should
say so.

## Should-fix

- **The lesson's arithmetic** (canonical "audit the lesson" check). In the
  width table, "number columns ... `−32.185` at the meta size" and "PART 100 —
  `213668-002` inside four brackets' indent" are both refuted by the branch's
  own shots (blocker 1). The total row "1218 → 1000" is right
  (100+140+30+220+3×68+76+200+30 = 1000). Correct the table with the
  re-measured widths.

## Note for round 2 — the merge conflicts with `integration`

`git merge handoff/<slug>` into a branch cut from `integration` (`dd8e0407`)
conflicts in 7 files. The cause is
`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`, which landed
after this branch was cut:

- `topology.css`: two hunks — `:root` tokens, and the
  `.tvrow--edge.conf--*` washes.
- `topology.js`: one hunk — `VA.gridLegendTints` against `VA.gridBraces`.
- `views/topology.js`: three hunks.
- `DESIGN_TYPE_AND_COLOUR.md`: one hunk (the token rows).
- `guard_enumeration.mjs`: fast and browser pins (642/644 against 637; 836
  against 822).
- The `124b830a` witness spec: the integration side re-pointed it at
  `ctx.bandPad` lerp, and this branch's side is `var left = 0`.
- The default-tier issue file.

The DAG branch also **added guards on the very grid row tints this handoff
removes** ("the sourcing legend's named tints", a row's tint being its
body's ink). The author already wrote the resolution plan in
`ISSUE_20261105_the_grid_and_dag_colour_branches_both_rewrite_the_sourcing_legend_and_the_grid_tokens.md`.
Since this goes back anyway, **the rework should merge `integration` into
the handoff branch and carry that plan out.** That means retiring or
re-pointing those guards and their specs, re-pinning both counts, and
dropping the `--group-*` fallbacks now that the tokens exist. Retiring
another handoff's guards is a judgement the author is better placed to make
than a conflict resolution is.

## Nits

- `VA.partColumns` takes the number from the display name by regex before
  `part.drawing`. Where both exist they agree today. Preferring `drawing` when
  present would make the record, not the wording, the source, which is what
  deliverable 2 asked for ("from the part record, not the label").

## Overlay

I added one **Recurring bugs** entry: a width budget measured against member
rows only clips the totals.

## Re-run 2026-11-06 (round 2)

Round 1 was REQUEST CHANGES with 2 blockers. Both are closed. The rework is
`f9e8ca5c`..`d1c289ac`.

**Blocker 1, totals clipped: closed.**
- Every column was re-measured against the longest thing it prints, totals
  rows included. The number columns are now 84px, PART 112, SENSITIVITY 92
  and CONTRIBUTION 270, for a 1146px total.
- `grip_u10h_3840_grid.png` shows the longest RSS bounds whole
  (`-13.735566`, `-13.188434`). `kin_3840_grid_crop.png` shows
  `±2.355 deg · RSS ±1.034` and every part number whole.
- Words that still clip (DESCRIPTION, ELEMENT, a check's label) carry their
  full text on hover.
- A new browser check, "no grid number and no part number clips", holds this
  for totals rows. Its spec `c6c298c8` was witnessed with `--only`.
- The lesson's width table was rewritten from the measurements, which closes
  the round-1 should-fix.

**Blocker 2, routed issue: closed.**
- `ISSUE_20261104_at_1600_wide_…_59px_slit.md` no longer carries `handoff:`
  and stays `triaged`. Its `resolution:` line says what this handoff
  changed and what is left.
- The round-1 continuation issue was folded into it.

**Round-2 note: merged.**
- The author merged `integration` (`f9e8ca5c`) and carried out their own
  collision plan. The DAG-colour branch's legend-tint guard was retired with
  its spec `067d94ed`, because no grid row wears a tint any more. The washes
  are deleted and the `--group-*` fallbacks dropped. Pins were re-measured:
  fast 645, browser 837/804.
- The collision issue is `resolved`.
- I grepped the merge for conflict-marker lines and found none.

**Nit: closed.** `VA.partColumns` now prefers the record's `drawing`. The
lesson names the one part where it differs from the display name (the pitch
plate shows the installation number `215177-001`, with the detail number on
hover).

**Also in the rework:** a phantom 560px sideways scroll at 3840 once the 3D
pane opens. It is fixed (`VA.sizeTopoZoomBox`), and spec `ff2762ea` was
witnessed. Two harness races that the wider columns exposed are each
explained in the lesson's Gotchas.

### Tests

- **Merge.** `git merge handoff/<slug>` was clean. `integration` (`dd8e0407`)
  was already contained in the handoff branch. The merged tree differs from
  `d1c289ac` only in this report and the overlay line, so the code under
  test is byte-identical to the author's tip.
- **Pre-merge risky subset**, in the review worktree:
  - `node apps/viewer/run_tests.cjs --repo <tactical worktree>/data/scratch/root`:
    **645/645**, no SKIP lines. That scratch root's projections were rebuilt
    from this branch.
  - `pytest -q` over `test_js_python_vocabulary`,
    `test_js_vocabulary_is_generated`, `test_viewer_readme_doc_facts`,
    `test_viewer_deep_link_contract`, `test_app_type_scale`,
    `test_mutation_witnesses`, `test_architecture_inventory`,
    `test_claims_registry`, `test_tolerance_stack`, `test_provenance` and
    `test_thermal_exception_list`: **359 passed**.
- **Browser and witness tiers: not re-run.** The code is identical to the
  tip the author ran them on:
  - The browser tier was 40/42 suites. Both reds are integration's
    known-stale kinematic edge names,
    `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
    (high, on integration).
  - The witness gate was 34/43. All nine misses had a red baseline from that
    same issue. The run was over budget, which is appended to the open
    budget issue.
  - Every one of this branch's own specs was witnessed individually.
  - The merge introduced no code of its own, so there is nothing new for
    either tier to see.

### Inline fix

- I appended a dated note to
  `ISSUE_20261105_a_borrowed_band_term_says_no_value_in_its_preview_and_untraced_on_its_row.md`.
  Its cited shot `kin_1600_preview.png` was deleted when round 2 retook the
  shots, so the note points at the commit that still holds it (`047f9d9e`).
  It is a path string only.

### Unfixed should-fixes

None. The design deviation noted in round 1 (a part gets a rule rather than
caps) is stated in the lesson and the code. It is not a defect.

**Verdict: APPROVE (round 2).**
