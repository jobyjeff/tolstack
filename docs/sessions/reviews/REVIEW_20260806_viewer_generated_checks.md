---
type: review
handoff: docs/sessions/active/HANDOFF_20260806_viewer_generated_checks.md
reviewer: review agent (review/viewer_generated_checks)
date: 2026-08-06
verdict: APPROVE
blockers: 0
---

# Review — `viewer_generated_checks`

**APPROVE.** Two stale counts in the lesson fixed inline (both caused by `master`
moving after the author's last merge, not by the work). No blockers.

The work under review is **projection + viewer plumbing, not a tolerance stack** —
no `docs/tolerance_stacks/*.json`, no `tolerance_stack/` source, no `data/` is
touched (`git diff master...handoff/viewer_generated_checks --name-only`: 11
files, all under `apps/viewer/`, `scripts/`, `tests/`, `docs/issues/`,
`docs/sessions/lessons/`). The mandatory stack checks are therefore addressed
below as *"did this change what the surface says about the stacks"*, plus the
archetype sign/coefficient rules the new surface now renders, which are squarely
in scope.

## What I verified, and how

| | |
|---|---|
| pre-work state | 4 reviewer-written tests against `master` — all **failed** (0 checks projected for both thermal stacks, no coefficient in `element_terms`, no shared worksheet). All 4 **pass** after the merge |
| Python suite | **290 passed, 1 skipped** on `master + handoff` (`master` alone: 277 + 1) |
| JS fast tier | `node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack` → **75/75** |
| JS truth tier | `node scripts\run_viewer_browser_tests.mjs` → **4/4**; 59/59 over `file://` and over `http`, real Chrome 150 |
| projection | rebuilt against the MAIN checkout with **this** tree's script, then `crops.json` with drawing-checker's venv |
| terms vs report | **104/104 terms identical** (52 per stack) — my own parse of `debug_report_thermal_fit.py --terms --markdown` against the *on-disk* `results.json`, not the test's in-process rebuild |
| `forge check` | OK in **both** the review worktree and `C:\workspace\tolstack` |
| data pollution | `data/` sha256-snapshotted before and after the suite + JS tiers: **105 files, 0 added / 0 removed / 0 changed** |
| drawing-checker | read-only holds — newest run dir is `20260804_114000`, nothing written 08-06/07 |

## The mandatory checks

**1 — every tolerance traces to a document.** *N/A as authored, and improved as
rendered.* No `source_ref`, `confidence`, band or citation changed anywhere: the
projection diff (old build vs new, key by key) shows the only element-level
differences on the four authored stacks are **ADDED** keys. The improvement is
that the three CTEs in `materials.json`, which previously reached this surface
**not at all**, now render — and render `UNTRACED`, with the bearing steel's
designation as `NO CITATION`. That is the honest answer and the loud one.

**2 — signs on every path term.** *Pass, and this is the check the handoff
exists to make possible.* I re-derived it from the built projection rather than
from the tests: for all 32 generated cards across both stacks, stage 1 is
`sleeve_bore +1`, `sleeve_wall +1`, `hub_bore −1` in that order, with the wall's
coefficient **exactly** twice the bore's (diametral) to 1e-9; stage 2 adds
`bearing_od +1` and `sleeve_bore −1` with `2k/(1−k)` holding; every coefficient
at the reference temperature is exactly one of `1 / 2 / k / 2k / 1−k`; and per
(chain, stage, element, sign), `cold < room < hot` without exception. `sign` and
`coefficient` are separate fields and every coefficient is `> 0`, so no direction
hides in a weight.

**2b — coherent material corners.** Unchanged; the `workbook_corner()` path is
untouched and the projection does not render it. No new fold.

**3 — LMC/MMC direction.** Unchanged. `fold()` is not edited on this branch, and
the test that reads `fold()`'s own source for `.lmc`/`.mmc` still passes.

**4 — RSS actually computed.** *Pass.* All 32 generated cards carry nominal,
worst-case min/max **and** `rss_center` / `rss_half`, and each equals
`load_thermal_fit_stack()`'s own `CheckResult` to 1e-6 (pinned at value level, and
re-checked by me off the built file). No verdict reads RSS — `verdict` comes from
`CheckResult`, and the viewer prints it. The Paths section still carries the
"RSS is a relative softening indicator, not a probability statement" caveat.

**5 — nominal inside min/max.** Unchanged; no transcribed value is touched, and
`test_stack_block_is_byte_identical` still pins the embedded stack.

**6 — quantised constraints.** No cotter/castellation hardware in a
`thermal_fit` joint, so check 6 exits — and the overlay's requirement of the
*analogous* caveat is met: `ARCHETYPE_thermal_fit.md`'s "a dimensional
interference is not a torque capacity" is not newly restated in the viewer, but
the surface gained the caveat that matters most for a generated stack — an
explicit "GENERATED CHECKS … not authored in `<file>`" panel above the cards,
naming the command that reproduces the term table outside the browser. The
`[SENSITIVITY]` handling (below) is the same discipline applied to a case the
handoff did not ask for.

**7 — the traced / inferred / untraced ratio.** Recomputed by me with
`tests\debug_report_tolerance_stacks.py --ratio`, not copied:

> **3 traced / 7 inferred / 16 untraced, out of 26 element instances** across the
> three seeded slice-1 stacks. Across all six stacks: **19 / 11 / 18 of 48**.

Unchanged by this handoff (it touches no stack JSON). The **non-element** ratio
for the thermal stacks remains **0 of 7** — three CTEs, two operating
temperatures, two stiffness ratios. Notably this handoff moves three of those
seven from *invisible* to *visibly untraced*, which is the right direction and
does not change the count.

## Findings

### Should-fix — fixed inline by me

1. **`LESSONS_20260806_viewer_generated_checks.md`:84 — a stale traced count.**
   The pasted rebuild transcript read `vpa_output_to_pitch_plate 6 elements
   (2T/1I/3U)`. On the merged tree it is **`1T/2I/3U`**: `traced_labels_and_ratio`
   landed on `master` after this branch last merged it and downgraded
   `under_head_chamfer_washer` from `traced` to `inferred`. Recurring-bugs class
   "stale inventory numbers", and the variant the overlay singles out — a count
   that *inflates how strong the provenance is*. **Fixed:** line corrected to the
   reviewer's post-merge rebuild, with a dated note saying why and pointing at
   `--ratio` as the only place to get the number.

2. **Same file:183 — `pytest -q: 279 passed, 1 skipped`.** True of
   `handoff/viewer_generated_checks` (I reproduced 279 in the tactical worktree),
   **false of the tree that ships**, which is 290. Same cause. **Fixed:** both
   figures stated, with the reason.

Neither is a defect in the code, and neither was avoidable by the author: the DoD
told them to check `git log --oneline HEAD..master`, they did, and it was empty
at the time. That is now recorded in the overlay as the **third sighting** of "a
sibling handoff landed on `master` while you were reviewing", sharpened to *the
check has to be the reviewer's last act, not the author's*.

### Nits

3. **`checks_generated_not_rendered` is now unreachable in practice** — nothing in
   the repo declares an archetype without a loader, so both its tests construct
   the state synthetically. The author names this in §7 of the lesson. Keeping the
   guard is right (it should outlive `thermal_fit`); no action.

4. **`pathsSection` draws no term chips at all**, so `paths[i].element_terms[i].
   coefficient` is carried into the projection and rendered nowhere. Harmless
   today (no archetype generates weighted paths, and a path's terms are visible in
   the check card that consumes it) but it is the one place the new "every
   weighted term prints its weight" property does not hold structurally. Added to
   the overlay rather than filed.

5. **The Materials table and the recessed sensitivity card have not been looked at
   by eye** — the author says so explicitly in §6, and `index.html?mock=1` will not
   show them because the mock tour still wires only `demoFixture()`. Wiring
   `VA.generatedFixture()` into the tour is a genuinely small follow-up; not
   blocking, and the author already flagged it.

## Things I checked that produced nothing (recorded so the next reviewer can skip them)

- **`PROVENANCE.md` byte-identical rows.** Six sightings in a row before this one,
  so I ran the diff first. **This handoff falsifies none**: every file it touches
  (`apps/viewer/*`, `scripts/build_viewer_projection.py`,
  `tests/test_viewer_projection.py`) is repo-original, written by
  `stack_viewer_v0`, and has no PROVENANCE row. First clean run of this check.
- **No second combiner in JS.** Grepped every non-test file under `apps/viewer/`
  for arithmetic on a projection field: nothing but string concatenation.
  `VA.fmt` is still `String(n)`; `VA.termLabel` prints `sign` then `coefficient`
  and never multiplies them. One false positive worth knowing about —
  `app.js:146`'s `Math.max(8, Math.min(...))` is popover CSS pixels, pre-existing
  and unrelated.
- **Scope.** The handoff forbade touching `docs/tolerance_stacks/*.json`,
  `tolerance_stack/stack.py`'s schema and `.gitignore`. None are in the diff —
  including deliverable 5, which asked for a new `worksheet` field in the stack
  file and would have required exactly that. The author found the field **already
  authored** (`provenance.worksheet` in both thermal stacks, written by
  `hub_bearing_thermal_stack`, read by nothing) and honoured it instead of
  inventing a second one. That is the right resolution of the conflict between the
  deliverable and the scope fence, and it is called out in the lesson.
- **`data/inbox/specs/` not reorganised**; nothing written into drawing-checker.

## One thing I did that was not asked, and why

**I rebuilt the shared `data/projections/viewer/`, and that resolves a recorded
stand-off.** `ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_
projection.md` records that the on-disk projection was built at 00:24 from a tree
predating `traced_labels_and_ratio`, so it showed three `confidence` labels that
no longer exist on `master` — and that *both* live sessions had a good reason not
to overwrite it, so neither did. The review worktree holds `master` + the handoff,
which is the newest tree in existence, so a rebuild here cannot be the
older-script-beats-newer failure the issue is about. Old vs new, key by key:

- `built_at` 00:24:49 → 00:30:44;
- the three `traced_labels_and_ratio` relabellings appear (`fastener_grip_14` and
  `fastener_grip_13` re-cited `parts_list` → `spec`, `under_head_chamfer_washer`
  `traced` → `inferred`, `vpa_output` counts `2T/1I` → `1T/2I`);
- **nothing else** — not one coefficient, check, material row, worksheet or gap
  moved. Which is also the cleanest available evidence that the tactical session's
  own build was correct for its tree.

The issue stays **open**: the stand-off is resolved for this pair of sessions by a
convention (the reviewer rebuilds), now written into the overlay, and not by the
fix the issue actually asks for (stamp branch + HEAD sha into both files).

## Overlay updates committed on this branch

`docs/prompts/REVIEW_AGENT.md`:

- "A sibling handoff landed on `master`" → **third sighting**, with the sharpening
  that an author's green `HEAD..master` is evidence about a moment, and that a
  *pasted build transcript* ages exactly like a hand-typed count.
- "The projections are stale unless you rebuild them" → the concurrency tie-break:
  the reviewer's tree is the newest, so the reviewer rebuilds; and diff old vs new
  key by key, because that diff is the no-regression evidence no test enumerates.
- New architectural entry: **a term rendered without its coefficient is a wrong
  term list** — `ARCHETYPE_LOADERS` must gain an entry per archetype, the term
  rows must equal `debug_report_thermal_fit.py --terms` row for row (104 rows
  today), and `pathsSection` draws no terms, which a weighted-path archetype would
  need to revisit.
- The JS no-second-combiner entry now names `COEFFICIENT_DECIMALS` and the
  `app.js` popover-clamp false positive.

## For the next reviewer

The generated-check surface is now the *only* place a reviewer can read a
`thermal_fit` stack's signs in a browser, and it is exactly as trustworthy as the
`ARCHETYPE_LOADERS` dispatch. When a third archetype arrives, the two things to
check are (a) its loader is in that dict, and (b) its coefficients still reconcile
against its own `--terms` report — the reconciliation is what makes the surface
evidence rather than decoration.
