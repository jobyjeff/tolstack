---
type: review
handoff: docs/sessions/active/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md
reviewer: agent
date: 2026-10-21
verdict: APPROVE
blockers: 0
---

# Review — browser_tiers_name_their_failure_instead_of_aborting

Branch `handoff/browser_tiers_name_their_failure_instead_of_aborting`
(`9a0fb7f`..`edba100`, six commits), merged into
`review/browser_tiers_name_their_failure_instead_of_aborting` off
`integration` `02f7f60`. Containment was checked first, and the work was not
already on `integration`. The merge was clean. `docs/sessions/active/` holds
only this handoff, and the lesson arrives as `A`, so this run overwrote no
earlier record.

This is not a stack, so mandatory checks 1–7 (provenance, signs, LMC/MMC, RSS,
nominal bounds, castellation, traced ratio) **do not apply**: no element,
path, check or hardware entry changed. The diff is test tooling, one viewer
fixture, one pin and one witness spec.

## What I verified

- **Each item against its issue.** Items 1–4 add guards in each block's own
  idiom (a null shape the existing `push` reads as a failure, `wrong.push` and
  return, a scoped and counted locator, a pushed settle wait that returns
  early). I read every new guard against its push. None of them can
  dereference what it guards, and none makes a push easier to pass: the
  `painted.halo`/`coldHalo` guards add conditions that would otherwise have
  thrown.
- **The guards fail when I break them myself, not only in the author's
  plants:**
  - Item 6 (`VA.pointerHeadsFor` → `return false`, so the corridor never
    defers): `read 103ms after the trigger's mouseenter (window 260ms): 0
    citation, 1 edge card(s)`, then `[topology file://] 233/235 … FAIL`, naming
    the steal check and its follow-on. So the re-measure loop does not weaken
    the assertion. The first in-window reading is the verdict.
  - Item 2 (the issue's own `checks.slice(0, -1)` in `resultsSection`):
    `[typography pass's visual rules (live stack view)] 9/11 … FAIL`, with the
    alignment and folded-row checks named and all 11 sub-checks run.
  - Item 4's new spec, replayed:
    `--only browser__under-file-the-study-s-respine-transition-settles-too-be__2014a8df`
    gave `1/1 declared mutations witnessed`. The lesson's catch that the
    stranded spec was inverted is correct, and the fix is right.
- **Item 6's diagnosis.** No main-only state was found, and the lesson says
  so plainly rather than inventing a cause. I added the one run the lesson
  lacked, in the configuration the issue's table shows **red**: trunk's
  unchanged runner, cwd `C:\workspace\tolstack` (master), `--only
  "topology file://"` gave **235/235 PASS** at 22:26. The red no longer
  reproduces where it was seen. The new mouseenter-stamped reading means a
  recurrence will say whether it was the corridor or the expiry.
- **Item 5.** The bodies wait now prints the banner, errors and sweep state,
  the same shape as the frame wait's `catch`. Under the CPU cap, bodies
  resolve in about 25 s. The two downstream checks it rewrote (which
  tangential links move, and the playback wait) follow what the run declares
  and keep their claims.
- **The fence.** `scripts/guard_enumeration.mjs` was fenced away, and the
  diff changes its `DECLARED_GUARDS.browser` pin (561/529 → 562/530, digest).
  I accept that. The repo's enrollment rule makes the spec and the pin one
  change, and without the bump `pytest -q` is red. The fenced
  `mutation_tier_gates_on_every_pin_and_survives_a_board_move` will see at
  most a one-line conflict there.
- **One of N sites.** `hoverRailBar` throws the same way the fixed sites did.
  The author filed it rather than widening scope
  (`ISSUE_20261021_hoverrailbar_throws_…`, frontmatter correct, no duplicate
  on `HEAD`, `integration` or `master`).
- **Issues.** All six issues the handoff addresses carry
  `handoff: docs/sessions/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md`,
  so Complete resolves them.

## Tests

The tactical record is a full `pytest -q` in the worktree (`1 failed, 1519
passed, 1 skipped`, where the one failure is the deliberate worktree red), the
viewer fast tier 544/544 through `--repo`, three browser-tier runs at 28/28,
and annotate at 67/67 mock and 84/84 `--real`. It is consistent with the diff.
The full mutation registry was deliberately not run: since 2026-10-21 the
runner reserves `--full` for the batch merge and the review's post-merge run.
That leaves it to me, below.

**Pre-merge risky subset** (rows: `apps/viewer/`, `apps/annotate/`, guard and
witness, browser runners):

- `pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_mutation_witnesses.py tests/test_projection_freshness.py tests/test_architecture_inventory.py`:
  **159 passed**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **544/544**.
- `node apps/annotate/run_tests.cjs`: **205/205**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (with `node_modules` junctioned in): **28/28**.
- `node apps/annotate/run_browser_check.mjs` (mock): **67/67**.
- The new spec's `--only` run: witnessed.

**Post-merge, in the review worktree:**

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  **`1 failed, 1519 passed, 1 skipped`** (5m27s). The failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
  deliberate worktree red: its `[real]` tier is skipped because no projection
  exists here. That tier through `--repo` is **544/544**. The skip is
  `test_fit_bound_features.py:422`. tolstack's conftest prints no contention
  header lines (`concurrent pytest processes at start`, `full-suite lock`), so
  there is none to quote.
- The prose subset after my overlay edit
  (`test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`,
  `test_claims_registry`): **226 passed**.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --full`
  and `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261016-235852`:
  see the addendum below.

## Findings

**Blockers:** none.

**Should-fix:** none left unfixed.

**Nits, fixed inline (comment and lesson only):**

1. `apps/viewer/tests.js` ~9247: a comment justified building the joint-export
   positive control in the test with "the browser TRUTH tier … locates
   `.el-export--established` unscoped — see the note beside the demo joint".
   Both halves are false after item 3: the locators are scoped, and the note
   is deleted. I reworded the comment to keep the true reason (every value is
   one the page may never print).
2. The lesson's item-5 section lists two rewritten `--real` checks, but the
   diff rewrites a third. That is `railRealPass`'s "studyless topology lists
   every one of its edges", which runs in **both** modes and could not pass on
   the live projection (35 edges, one study, against the pinned 29). I added
   a dated reviewer blockquote. The rewrite itself is sound: it derives the
   expected rows from the projection, and the mock pass still pins the
   studyless head.

**Note, not a finding.** The DoD asked for the three item-6 runs "in the main
checkout". They ran from the worktree through `--repo`, which is the
configuration the issue had already shown green. Branch code cannot run in
the main checkout while it sits on master, so the run in the red
configuration had to be trunk's code, and I added it above. That pattern is
now a **Recurring bugs** entry in this repo's overlay.

## Overlay

Added one Recurring bugs entry: a checkout-dependent red "verified fixed" by
runs in the checkout that was already green. A fix that re-measures needs a
plant to show it can still reach a verdict.

## Addendum — the two long post-merge runs (2026-10-21, 22:31–23:44)

- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --full`:
  **262/262 declared mutations witnessed**, exit 0 (22:31:46–23:42:26).
  Enrollment: browser 90 enrolled / 530 enrollable / 562 declared, which
  matches the new pin.
- `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261016-235852`:
  **84/84 passed**, exit 0 (finished 23:44:41). Playback ran at 0.12 fps with
  the layer off and 0.09 fps with the ghost layer on, under the CPU cap.
- **`data/` pollution check:** `find C:/workspace/tolstack/data -newer <marker
  set before the post-merge runs>` outside `data/scratch/` lists no files. The
  suites left `data/` as they found it.
