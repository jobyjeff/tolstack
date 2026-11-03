---
type: review
handoff: docs/sessions/active/HANDOFF_20261102_the_browser_tier_is_green_on_trunk_again.md
reviewer: agent
date: 2026-11-02
verdict: APPROVE
blockers: 0
---

# Review 2026-11-02 — the_browser_tier_is_green_on_trunk_again

**Verdict: APPROVE, 0 blockers.** Both reds were stale or racy checks, not
product regressions. The diagnosis holds up against the code, and both
rewritten checks still go red on a broken product.

This is the first review of this handoff (no earlier commit on `review/…`). The
branch worked `docs/sessions/active/HANDOFF_20261102_the_browser_tier_is_green_on_trunk_again.md`.
Every lesson and issue in the diff is `A` or an appended `M`. Nothing was
overwritten.

## What I verified

### Diagnosis, re-derived

- **Annotator notice: a stale check (`c21a06bb`).** In the tree,
  `apps/annotate/app.js` `setWriteFailure` sets the banner to
  `AA.bindFailureWords(err, verb)` and sets `#notice-text.title = err.message`.
  `AA.bindFailureWords` and `AA.READ_ONLY_WRITE` are both on
  `apps/annotate/storage/adapter.js`. The read-only path still shows a notice;
  only its words moved, and `c21a06bb` moved them on purpose. The new check
  compares both the text and the hover for equality, which is stricter than the
  old substring check, so it is not weaker.
- **Respine: a race, not a regression.** `VA.animateTopoPane`
  (`apps/viewer/views/topology.js`) still tweens. Its first `step()` runs
  synchronously and draws frame 1 with `tweening: true` and a ghost. The new
  `catchFrame` registers its rAF before the click's microtask runs `respine()`,
  so its callback runs ahead of the step's second frame. That argument is
  correct for both orderings: the worksheet promise resolving in a microtask, or
  in a later task.
- **The overlay's 2026-10-26 rule:** "A red that follows the tree is a
  regression, even when its mechanism is a timing race". The tree did change
  something here. The fold made the graph about 106 rows, and the lesson
  measured frames at 0.1–1.2 s. The product still animates, so the check was
  right to stop being sensitive to that. But frame cost on the real graph is a
  real, unmeasured property. That is the trigger condition the deferred
  `ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md` named ("unless
  frame cost shows up on the large real topology"). I appended the measurement
  there (see the nits).

### Observed failing (the scratch mutations, both reverted)

- `apps/viewer/views/topology.js`: `var reduced = true` (never animate).
  `topology file:// respine` went to **27/35, FAIL**:
  `no in-flight frame was ever observed`, plus the deselect, scrolled, by-nav
  and interruption arms.
- `apps/annotate/app.js`: `setBanner(verb + " failed", …)` (loses the read-only
  words). `annotate hosted posture` went to **14/15, FAIL** on
  `[real] pressing a bind control says, in one line, that binding is not available here`.
- After `git checkout --` of my two scratch edits, the tree was clean.

### Tests (merged tree: handoff plus `integration` at `c6e29427`, in the review worktree; `node_modules` junctioned from the main checkout; `--repo C:/workspace/tolstack`)

- **Tactical record:** present and consistent with the diff. It records the
  full pytest run, both fast tiers, the full browser tier (39/40) and the
  witnesses. That record gets the benefit of the doubt.
- **Pre-merge risky subset** (this diff touches guard bodies in the browser
  tier). Run on the merged tree:
  - `--only "annotate hosted posture"`: **15/15**.
  - `--only "topology file:// respine"`: **44/44**.
  - `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since 5f34f44f`:
    **4/4 witnessed**, 0 left to the sweep, 1m58s. Two of the four come from the
    sibling handoff merged from integration.
- **Post-merge full suite:**
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave **1 failed, 1687 passed, 1 skipped** in 359 s. Recorded with
  `suite-time` as inside budget. This repo's conftest prints no
  concurrent-pytest or full-suite-lock header lines. The one red is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, which is the
  documented worktree red. Its tier, run armed, was
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` at **629/629**.
  `node apps/annotate/run_tests.cjs` was **269/269**, with no SKIP lines.
- **After my overlay edit:** `tests/test_tolerance_stack.py`,
  `tests/test_provenance.py`, `tests/test_thermal_exception_list.py` and
  `tests/test_claims_registry.py` gave **221 passed**.
- **Full browser tier on the merged tree:** see "Full browser tier" below.
- **Not exercised:** I did not rebuild the projections. The diff changes no
  projection input, and the tier did not refuse the existing ones. `data/` was
  not written by any of these runs. All of them read the main checkout by
  `--repo`, and none of them writes there.

### Stack-review mandatory checks (1–7)

Not applicable. The diff contains no stack, topology, element value or
citation. It touches only the browser-tier harness, issues and a lesson.

### The lesson's arithmetic

- "35/35 → 44/44" is right: my no-animate mutation gave 27/35, because the
  first check gates nine dependents.
- `RESPINE_SUITE_DURATION_MS = 1200` and the `caughtMidFlight` precedent both
  exist where the lesson says.
- "3 s → 15 s" matches the diff.

## Findings

No blockers, no should-fixes.

**Nits** (I edited my own review artifacts and issues; I fixed no code inline):

1. The lesson measured the respine at 0.1–1.2 s per frame on the product graph
   but didn't record it on `ISSUE_20261029_the_respine_rebuilds_the_pane_every_frame.md`,
   whose deferral names exactly this measurement as its trigger. **I appended a
   dated addendum.** It notes that the box was loaded, and that the now-robust
   check will not notice frame cost growing.
2. `ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md`
   presents the 10 s ceiling as the cause. The failing check is a three-term
   conjunction, and the run did not record which term was false. **I appended a
   review note** asking whoever picks it up to log the three values first.
3. In-flight geometry checks now always see frame 1, at t ≈ 0. This was
   anticipated by the existing width check's own comment ("at t = 0 the width
   is the outgoing serialisation's exactly"). Mid-flight interpolation at t > 0
   is covered by the fast tier's injected-clock frame tests
   (`apps/viewer/tests.js`, `lastTopoRender.tweening`). Recording it so nobody
   reads the browser width check as a mid-flight witness. No action needed.

## Overlay

I added two **Recurring bugs** entries to `docs/prompts/REVIEW_AGENT.md`:

- A diff that changes what a banner says must grep the browser tier for every
  reader of the old words. This is the `c21a06bb` miss.
- A transition probe that clicks from Playwright and then samples is the race
  this handoff fixed.

## Full browser tier

I ran `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` on
the merged tree. It took 1205 s, was recorded with `suite-time` (merge tier,
inside budget), and gave **39/40**. Inside that full run:

- `topology file:// respine` was **44/44**.
- `annotate hosted posture` was **15/15**.

So the DoD's "once inside a full run" holds on the merged tree as well as on
the tactical branch.

The one red is `3D pane follows the selection` at 31/32. The failing check is
`[real] the type chips in the nav filter the tree, and a second press puts the
rows back`. It is a third disjoint sub-check for that suite today, after the
four nav gestures and the unbound-row hover. That suite is out of this
handoff's scope and untouched by the diff. I appended the sighting to
`ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`
instead of filing a twin: the red rotates, so it is one problem.
