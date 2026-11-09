---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_bindings_projection_folds_the_events_jeff_accepted.md
reviewer: agent
date: 2026-11-08
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-11-08 — the_bindings_projection_folds_the_events_jeff_accepted

Branch `handoff/the_bindings_projection_folds_the_events_jeff_accepted` (3 commits,
`bbae29ea`, `8e30dbe5`, `d236d44c`) merged into `review/…` at `6b1173cf`.
`integration` had not moved since the review branch was cut, so there was no
conflict. Containment check before the merge: not already merged. All files
arrive as `A` or `M`. The lesson is new (`A`), and the issue gets an appended
dated section (`M`, append only).

## The seven mandatory stack checks

N/A, all seven. The diff touches no stack and no topology data: no element value,
sign, LMC/MMC, RSS, nominal, quantised hardware or traced ratio changes. The
deliverable is the feature-identity event fold, the annotator's event numbering
and the rebuild rail.

## What I verified

- **Cause (deliverable 1).** The annotator numbered off a stale snapshot.
  `AA.nextEventSeq(projection, sessionEvents)` reads only the projection's
  embedded events, `built_from_events.length` and the session. It never reads
  the folder. The lesson's quote of the pre-`36bc255c` path is consistent with
  the files on disk (`0001_`…`0004_` holding seq 56-59). Confirmed.
- **Fix (deliverable 2).** `listFeatureIdentityEventSeqs` exists on the fsa,
  memory and http adapters, and the http adapter delegates to the granted
  folder. In `app.js`, `nextEventSeq()` asks for the grant first under a served
  transport, then lists. All four write call sites (`app.js:4164`, `5421`,
  `5528`, `5731`) go through it. The new check seeds 56 and 62 on disk against
  a 55-event projection and asserts 63 on every adapter. It is enrolled, and
  the gate run below witnessed it.
- **Fold (deliverable 3), re-derived on the live log** with the branch's
  `feature_identity` and no writes. The fold has 75 events and 4 seq collisions
  (56-59). In each collision the proposal (11-04/11-05) folds before Jeff's
  11-06 accept, by `created_at`. There are 4 restated pairs, and each pair
  differs **only** in `event_id`, `seq` and `created_at`. I diffed the
  `as_dict()` outputs, not just read the lesson's table. That gives **8
  bindings**, and all four of the lesson's table rows match. No pair disagrees,
  so withholding `needs: jeff` is correct. Answers that disagree still raise
  ("answered twice, differently"), and a test pins that.
  `ANSWER_IDENTITY_FIELDS` is a module constant, per the vocabulary rule.
  Superseding a repeat hides the first answer, and a test pins that too.
- **Rail (deliverable 4).** The builder is step 5 of `rebuild_projections.ps1`
  under `Invoke-Step`, so a non-zero exit stops the rail, and `bindings.json` is
  in the stamp loop. That file has a top-level `provenance`, so the loop's read
  works. I checked one Windows PowerShell 5.1 trap. The builder now writes
  `note:` lines to stderr under `$ErrorActionPreference = "Stop"`. A scratch
  `.ps1` of the same shape exited 0 with its stderr both captured and left
  attached, so the notes do not abort the rail.
- **DoD: main-checkout `bindings.json`.** The projection is stamped
  `8e30dbe56fbf` on the handoff branch, from 75 events, with 8 bindings.
  `data/inbox/feature-identity/` still holds 76 files, and nothing under the
  main checkout's `data/` was modified during my runs (`find -newer` was
  empty).
- **Lesson arithmetic.** I re-derived the counts (4 collisions, 4 repeats, 8
  bindings, 75 events, 76 files, 0 bindings before). The before figure is from
  the issue and was not re-measurable; the rest match.

## Tests

- **Pre-merge risky subset** (rows: Python under `tolerance_stack/`, `apps/annotate/`,
  a guard/witness, `rebuild_projections.ps1`):
  `pytest -q tests/test_feature_identity.py tests/test_rebuild_projections_script.py tests/test_propose_bindings.py tests/test_mutation_witnesses.py tests/test_architecture_inventory.py`
  gave **1 failed, 136 passed**. The one failure is
  `test_every_anchor_resolves_to_exactly_one_place` on the
  `browser__real-and-a-seek-in-the-pane…f697d046` anchor. It is already red on
  integration, is filed as
  `ISSUE_20261108_the_pane_seek_witness_anchor_rotted_on_integration_and_reddens_pytest.md`,
  and is owned by the active handoff
  `the_pane_seek_witness_points_at_the_comparison_the_page_now_makes`.
  `node apps/annotate/run_tests.cjs` gave **303/303**, `[real]` included, with
  no SKIP lines.
- **Mutation-witness gate:**
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`
  reached 11/11 and witnessed 9/11 on the first run (4m14s). The two browser
  entries were disarmed, `ERR_MODULE_NOT_FOUND playwright-core`, because the
  worktree had no `node_modules`. The tactical lesson reported the same
  disarmed tier honestly. I armed it with a `node_modules` junction to the main
  checkout and re-ran both with `--only`. Both came back **WITNESSED**, so the
  gate is **11/11 witnessed**.
- **Annotator browser check** (`node apps/annotate/run_browser_check.mjs`) on
  the merged tree gave **95/99**, and a detached `integration` checkout gives
  the same **95/99** with the same 4 failures: two mock anchor checks,
  `[real] opening P2 selects the topology`, and `[real] … the rail lists every
  edge` (27 vs 99, which is the subject of the active
  `the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show`). None is
  introduced by this diff. One earlier merged-tree run read 94/99, and an
  immediate re-run gave 95/99, so I am treating the extra failure as a
  one-off flake.
- **Post-merge full suite**, review worktree, merged tree, single-process (no
  xdist):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave **2 failed, 1871 passed, 1 skipped, 2 deselected in 526 s**. That
  matches the tactical record's counts exactly. The failures are the rotted
  anchor above and `test_viewer_js_suite.py`, which is red by design in a
  worktree. That makes the viewer `[real]` tier the one part of this run that
  was not exercised. This repo's conftest prints no contention header lines.
  Recorded with `suite-time record`, default tier: inside budget.
  `node_modules` was not junctioned when this run started.
- **Not run:** `rebuild_projections.ps1` and the viewer browser TRUTH tier. The
  main checkout is on `master` without this branch (see the note below).

## Findings

No blockers and no should-fix findings.

**Nits / notes, no issue filed:**

1. **The DoD's "rebuilt by `rebuild_projections.ps1`" was met with the builder
   alone.** The lesson says so and why: the rail runs the main checkout's
   scripts, which are `master`'s builder, and that builder still refuses the
   log. I accept it. The batch merge's standard projection rebuild (CLAUDE.md:
   rebuild BEFORE the four tiers) is the first run of the rail with this step
   on it, and its stderr should show the 8 `note:` lines.
2. **The same-seq race the lesson accepts is real and narrow.** Two writers can
   list the folder in the same instant and take one seq. It is documented in
   the lesson with the shape of the fix (re-check the seq at write time). Today
   that is one human page and one agent script, and the fold now tolerates the
   result anyway, so I filed no issue.
3. **`log_order`'s `created_at` tie-break compares strings.** That is correct
   for the two writers' shared `…Z` shape. A future writer that emits
   fractional seconds or an offset would order wrongly inside a collision
   only. Noted, not a defect today.

## Inline fixes

None.

## Overlay

Added a **Recurring bugs** entry: *a writer numbering a new event off a
snapshot, not off the log*, with the stale-rail corollary.
