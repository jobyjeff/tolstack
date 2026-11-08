---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_linkage_play_control_is_the_only_one_and_it_moves_everything.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_linkage_play_control_is_the_only_one_and_it_moves_everything

**Verdict: REQUEST CHANGES (1 blocker).** The design is right and most of the
work is sound; a pre-existing browser check the author never ran goes red
deterministically on the merged tree. Nothing was landed on `integration`.

## What was verified

- **Not already merged** (`merge-base --is-ancestor` negative). No prior review
  attempt on this branch for this slug.
- **Merge conflict (mine, carve-out):** `scripts/guard_enumeration.mjs`, the
  `fast` pin. `integration` moved 666 → 669 (+3, the kinematic-row handoff);
  the branch swapped guards one for one (count unchanged, names digest
  changed). Resolution: integration's count (669), names digest **re-measured on
  the merged tree** (`e3b61efa3ac9`; annotate `297`/`7264fbd10dea` and browser
  `857/824`/`2e18d19c3891` already matched). No markers left behind.
- **Design read:** pane owns the clock and the pose (`AA.embedPose`,
  `postEmbedPose`), page latest-wins `onPanePose` → `applyPanePose` →
  `livePose(index, true)`; `.kmpose__play`/slider, `startPlay` and
  `pointsPerSecond` gone; run-id fence on both ends (console + muted line); typed
  angle kept and calls the same `seek`. Matches deliverables 1–4.
- **Pre-merge risky subset** (apps/viewer + apps/annotate + guards): pytest
  vocab/readme/deep-link/witness/architecture/feature-identity/mesh-alias/type-scale
  files — **201 passed**; `node apps/annotate/run_tests.cjs` 297/297.
- **Post-merge full suite, review worktree:** `pytest -q --deselect tests/test_viewer_js_suite.py`
  — **1744 passed, 1 skipped, 3 deselected** (386 s). Viewer fast tier through a
  scratch root built from the merged tree's scripts
  (`data/scratch/review_linkage`, all projections rebuilt from this tree):
  **669/669**. Contention header lines were not printed by this repo's suite.
- **Full browser tier on that scratch root: 42/43.** The one failure is the
  blocker below.

## Blocker

**B1 — `3D pane follows the selection (sweep, bind, reload, hover)` goes red
(3 of 3 runs on the merged tree; 3 of 4 passes on the integration baseline,
the one baseline red being a different, load-flaky sub-check).**
`scripts/run_viewer_browser_tests.mjs` (`testThreeDPane`, step 3 "reload"),
cause in `apps/viewer/topology_app.js`.

- *Mechanism (measured with a URL probe before the reload):* on the baseline
  the URL at that point is `…/topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`;
  on the merged tree it is bare `…/topology.html`, so the reload lands on the
  empty page and `div.kmverdict` never appears (the check aborts after 25
  sub-checks). `topology_app.js:~2996` removes `kinematic`/`pose` from the URL
  when the page leaves the kinematic view *if `poseUrlWritten`*. On the
  baseline that flag is only set once the reader moves the pose. Now the
  pane's own opening `annotate:pose` (sent from `postEmbedState`) reaches
  `applyPanePose`'s "scrub or step with the pane paused" branch, which calls
  `livePose` and then `setPose` after 160 ms — writing `?kinematic=…&pose=…`
  into the URL **unprompted** — so selecting a chain study afterwards strips
  the deep link.
- *Why it matters beyond the test:* the page now writes the pose into the URL
  with no reader action, and a nav click then rewrites the URL out from under
  the reader.
- *Why it was missed:* the tactical lesson records only two browser suites
  (`annotate rail holds still`, `the DAG zoom…`) and says the full tier was
  left to the reviewer; this one is not among them. Benefit of the doubt for the
  recorded full run was void for the browser tier.
- *Suggested fix (author's):* a pane message that is the pane's initial/echo
  state (the pose the page already holds, or the first message after
  `annotate:state`) must not settle into the URL; only a pose the pane moved to
  *after* the reader acted should. Then re-run the whole browser tier, not a
  slice.

## Not run / left unexercised

- `--changed-since integration` witnesses: a first run (before `node_modules`
  was junctioned into this worktree) reported browser entries "red before the
  mutation" — that was the missing Playwright, not the diff; the **rerun with
  the browser tier armed was not completed** because B1 makes the tier red.
  Re-run after the fix.
- DoD's live filmstrip on `:8000` was not re-shot; the author's stills and table
  were read (`pane_play_filmstrip.png`, `mid_sweep_page_and_pane.png`). The
  lesson honestly states the page trails the pane by its draw time at full pace
  on a loaded box — not "frame for frame" there; it is filed as an issue.
- Data-gated: `tests/test_viewer_js_suite.py` deselected (worktree has no
  projection); its tiers were covered through the scratch root above.

## Should-fix / nits

- Both issues the author filed (`…cannot_play_or_scrub_without_the_3d_pane`,
  `…page_trails_the_3d_pane_by_its_draw_time_at_full_pace`) exist with
  frontmatter, and the 11-06 issue is closed with a `resolution:` naming this
  handoff. No unfiled should-fix from me.
- `README.md` line in `apps/viewer/README.md` ("A pane on another run … A pose
  is a fractional sweep point") is one overlong line; cosmetic.

## For the next reviewer

Round 2: confirm the URL at the reload step is `?kinematic=…` again, run the
**whole** browser tier plus `--changed-since integration` witnesses with
`node_modules` junctioned, and re-measure the `fast` guard digest if `tests.js`
guards move again (the pin in `scripts/guard_enumeration.mjs` is already
resolved on this review branch).

## Re-run 2026-11-08 (round 2)

Round 1 was REQUEST CHANGES, 1 blocker (B1, closed below).

- **B1 fixed** (`665e4d34`): `heldPoseIs(study, index)` compares against what the page holds (default stop included), so the pane's opening message moves and writes nothing. Merged cleanly into the review branch; no conflict.
- `3D pane follows the selection` 32/32, twice. Fast tiers 669/669 and 297/297 on the scratch root.
- **Whole browser tier: 42/43**, the red being `kinematic study page (deep link…)` sub-check "colouring by body … survives a reload" — it passed in round 1's full tier and 27/27 in two isolated re-runs: load noise, not the diff.
- **Witnesses `--changed-since integration`: 21/22 reached witnessed** (2 left to the sweep by budget). The one not witnessed, `browser__real-the-kinematic-page-reads-nav-scene-dag-results-left__fb0d661d`, reads "tier red before the mutation" identically on a detached `integration` tree in this scratch environment, and its spec is untouched by the diff — not attributable to this work; the scheduled sweep owns it.
- Verdict: **APPROVE**. Landed on `integration` as a fast-forward from `review/<slug>`.
