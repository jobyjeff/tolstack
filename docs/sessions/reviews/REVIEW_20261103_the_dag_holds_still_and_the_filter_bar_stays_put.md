---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_the_dag_holds_still_and_the_filter_bar_stays_put.md
reviewer: agent
date: 2026-11-04
verdict: APPROVE
blockers: 0
---

# Review — the_dag_holds_still_and_the_filter_bar_stays_put

**APPROVE, no blockers, nothing fixed inline.** `integration` had not moved onto the
branch (not an ancestor before the merge); the merge conflicted in one file only.

## The merge, and its one conflict

`docs/issues/ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`:
both sides appended a measurement addendum at the end (integration: the slide-joint
review's 1289 s; the handoff: its 1477 s). Both are independent facts, so both are
kept, with a blank line between them. No marker lines were committed.

## What I verified against the handoff

| deliverable | evidence |
| --- | --- |
| 1 continuous re-arrange | the landing's pad, sideways scroll and page scroll are measured on the target before the tween (`landingHooks`/`measureLanding`, `animateTopoPane`'s `landing`) and interpolated with it. The real-projection browser guard printed `pad 149.174 -> 155.986 over 12 frames; back: ok`. `after_respine.png` (12 frames, 25 ms apart) read as a continuous move. Witnessed (`…124b830a`, 2m02s). |
| 2 click never moves the DAG sideways | guard clicks a node, edge, sub-stack label and grid row, rest and parked: `clicked 8 … ` with `dx 0` on the pad and `scrollLeft`. Witnessed (`…b7738695`, 4m08s). The tactical report says it could not reproduce the symptom for those four kinds and found the real mover was the study-title click (a respine); I accept that, it is measured and stated plainly. |
| 3 first row clear at scroll 0 | `VA.DAG_FIT.topInset` 24 px: `first row at scroll 0: fit 0.58 17.6px, max 2.00 2.0px, pinned bars end at 139, drawing starts at 188`. Witnessed (`…3e7e3749`). |
| 4 pinned bars, one declaration | `--bar-h`/`--filter-h` in `style.css`, written from the measured bars; the eight `47px` sites in `topology.css`/`style.css` now read the variable. `pinned after scrolling 697px: page bar 0, filters 48, grid header 139 (filters end 139)`. Witnessed (`…8415ac90`, re-run with `--only` after the capped gate run left it to the sweep). |
| 5 leaders through one token | `--leader-ink` on `.rail__leader--on`, `.seam__leader`, `.seam__end`; hovered stays `--rail-hot`. `resting rgb(97,106,121) = token, 3.25:1 against the page, hovered rgb(195,204,219)`. Both tiers witnessed (`…aaab3e64`, `…50620c99`). |
| 6 `scripts/filmstrip.mjs` | `--help` documents itself; built-ins `respine`, `respine-back`, `click`; no `chromium.launch(` outside the helper. |
| 7 CLAUDE.md rule | one paragraph in the browser-tier bullet list, as asked. |

Judgement calls the author made and recorded, which I read and accept: `--leader-ink`
is ~60 % of the edge ink's luminance rather than 40–50 % because half-luminance reads
2.8:1 and the handoff's own 3:1 floor is the binding requirement; `DAG_ZOOM.min`
0.15 → 0.12 because the pinned filter bar costs ~90 px of window and the tallest
walk no longer fit.

## Tests — what ran, where

Pre-merge risky subset was folded into the post-merge runs below (the diff is the
`apps/viewer/` + CSS + mutation-spec + `scripts/` row of the mapping; every tier it
names ran). The tactical report records a full default-tier run (1685 passed, 3
failed, all three the branch's own and fixed afterwards), so the benefit of the
doubt held.

All browser/`[real]` runs used a **scratch data root**
(`data/scratch/dag_review_root`: projections rebuilt from this merged tree with
`--data-root`, `docs/` copied, `venv-win`/`node_modules` junctioned), because the
shared projection was built from `03880aca4b48` and the fast tier refuses it.

- `venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` in the review
  worktree on the merged tree: **2 failed, 1699 passed, 1 skipped, 2 deselected**,
  761 s (12m41s), over the 600 s budget — measurement appended to the open
  `suite_over_budget` issue; the box was shared with other
  reviews' browser runs. The two reds are the same two as the slide-joint review's
  and are checkout-dependent: `test_viewer_js_suite` (a worktree cannot be armed
  with the shared projection) and the contact-suggestions `[real]` pairing.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **623/629**. The 6 reds
  (`pitch_system` grouping/tint/forks/README total, a declared-part guard, fixture
  shape drift) are **identical on a detached `integration` worktree against the same
  projection** — not this branch's.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **34/40**. Reds:
  `topology` (file/http, four `[real]` pitch_system sub-checks), `real render path`,
  `crop lightbox`, `kinematic study page`, `3D pane follows`. Each was re-run on a
  detached `integration` worktree against the same projection and is red there too,
  with the same sub-checks (the kinematic page is *worse* on integration, 17/23 vs
  this branch's 21/23). One first-run discrepancy — four extra red sub-checks in `3D
  pane follows` — did not reproduce on a re-run (1 red, the same type-chip one as
  baseline) and was load-induced. **Every new guard's sub-check is green on the real
  projection.**
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration`:
  **19/28 witnessed, 28/41 reached in 29m52s, 13 left to the sweep (budget cap)**,
  exit 0. The nine not-witnessed are `the tier was red before the mutation` — all in
  suites that are red on `integration` for the reasons above (`real render path`,
  `kinematic study page`, the `topology` pins), so they prove nothing either way and
  are not a finding against the branch. All five guards the handoff names ride
  witnessed entries: continuous frame, click, first row, pinned bars (re-checked with
  `--only`), both leader inks. The older `never blinks` entry (`…1dd72346`) that the
  author re-anchored reads `NOT WITNESSED (the tier was red before the mutation)` in
  my environment because it lives in the `topology file://` suite, which is red here
  from the baseline reds; the author's lesson records it witnessed at 6m37s in theirs.
  I did not get an independent witnessing of that one entry.

## Findings

No blockers, no should-fix against the handoff.

- **Filed (out of scope, not this branch's):**
  `ISSUE_20261103_the_pitch_system_real_pins_are_one_leader_behind_the_merged_topology.md`
  — the `[real]` reds above are on `integration` itself, so the `[real]` tier cannot
  discriminate a regression there until the pins and fixtures are moved.
- The author's own `ISSUE_20261103_opening_the_3d_pane_and_other_landings_still_snap_the_dag.md`
  has valid frontmatter and names the remainder of the snap (pane open/close,
  zoom-down at landing, the two-row bar). The two issues the handoff conditioned on
  (`respine_rebuilds_the_pane_every_frame`, the wheel-zoom repaint) are correctly
  left open: the pane is still rebuilt every frame and nothing touched the wheel.
- The 3D-pane-follows-selection nav failures the author listed as pre-existing do
  match integration's baseline.

## For the next reviewer

Reading the viewer's `[real]` tier on `integration` right now needs a baseline run:
see the filed issue. Build the scratch root *with* a worktree-owned `node_modules`
junction for the browser runner, or it exits `ERR_MODULE_NOT_FOUND`.
