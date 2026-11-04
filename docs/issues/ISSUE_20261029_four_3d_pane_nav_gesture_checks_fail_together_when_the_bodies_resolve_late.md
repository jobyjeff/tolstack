---
type: bug
priority: low
status: deferred
area: tests/browser
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
defer_until: 2026-12-02
resolution: triage 2026-10-30: low, deferred onto the timing_assertion_under_load program (forge browser_runner_witness_holds_whatever_the_box_does, staged this sweep); reclassed from load_sensitive_browser_check, which had no registry row and names the same shape -- woke 2026-10-30 -- browser_runner_witness_holds_whatever_the_box_does completed; re-triage | deferred 2026-11-02 (triage) -- low; class timing_assertion_under_load's program (forge browser_runner_witness_holds_whatever_the_box_does) has landed, so a class trigger can no longer wake this; budget 3/3 went to the trunk browser reds, the witness repair and a guard_cannot_fail med. 30-day date; the next tolstack port of the lever should take all four.
---

# Four 3D-pane nav gesture checks fail together when the bodies resolve late

`scripts/run_viewer_browser_tests.mjs`, suite "3D pane follows the selection
(sweep, bind, reload, hover)". In a full browser-tier run on 2026-10-29
(1123 s, worktree code, main checkout's data) these four went red together:

- `[real] a click on a body's disclosure in the nav flips it, in the nav and in the annotator's own tree`
- `[real] a body's checkbox in the nav hides that body in the scene, and the box reads unticked after the redraw`
- `[real] ...and ticking it again shows the body`
- `[real] a part row's second button in the nav acts on that part, not on the row's first button`

The same suite run alone, twice in the same session (before and after), was
32/32.

All four hang off one lookup: the first body row whose checkbox is **not
disabled**. The annotator leaves that checkbox disabled until the sweep's
bodies resolve (`subjectCheckbox`, apps/annotate/app.js), which is the slow,
un-awaited `anchorSweepBodies`. The lookup runs once, with no wait, so when
the bodies resolve late `bodyRow` is null and all four checks fail as one.

Fix shape: wait (bounded) for a body row with an enabled checkbox before the
lookup, the way the surrounding checks wait on their own selectors.

## Addendum 2026-10-29 (review)

The review ran the full browser tier on the merged tree, against a scratch
root built from that tree (`--repo data/scratch/review_face_pick`): **34/36**.

- "3D pane follows the selection" failed 31/32, on a different sub-check from
  the four above: `[real] ...and leaving it takes the light down`.
- "crop lightbox (launch, zoom, pan on the live crops)" ABORTED. "the launcher
  takes keyboard focus and becomes visible" failed, then
  `waitForSelector('#crop-lightbox[open]')` timed out at 10 s.

Re-run alone with `--only`, minutes later, both were green (32/32, 20/20). The
lightbox check calls `.focus()` directly, so the new `#nav-divider` in the tab
order is not in its path. Same class: a check that does not wait on settled
state, and goes red under a contended box.

## Seen again 2026-11-02 (handoff `the_browser_tier_is_green_on_trunk_again`, base `03880aca`)

`--only "3D pane follows the selection (sweep, bind, reload, hover)"` was run **alone**,
from a worktree with the main checkout's projections: 28/32, and the same four nav-gesture
sub-checks failed (body disclosure, body checkbox hide and show, part row's second button).
So under today's load this one reproduces in isolation, too.

## Seen again 2026-11-02 (review of `the_browser_tier_is_green_on_trunk_again`, merged tree at integration `c6e29427` + that branch)

Full browser tier, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`,
1205 s, **39/40**. This suite was 31/32 again, but on a **third** different sub-check:

    [real] the type chips in the nav filter the tree, and a second press puts the rows back

(`scripts/run_viewer_browser_tests.mjs` around line 7043.) So across three runs on
2026-11-02 this one suite failed on three disjoint sets: the four nav gestures (alone),
the unbound-row hover (`ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md`,
full run), and the type chips (this full run). The red rotates between sub-checks
rather than sticking to one, which points to a shared precondition the suite does not
wait for (bodies or nav tree not settled) rather than to a defect in any one check.
Whoever takes this should treat the suite as one problem.

## Addendum 2026-11-03 (a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there)

Three runs of "3D pane follows the selection" against the main checkout's data, each red on a different set: in this handoff's full browser run 31/32 (the type-chips check); alone on this branch 27/32 (the body disclosure, the body checkbox twice, the part row's second button, the unbound contributor hover); alone on a `git archive integration` export, without this handoff, 30/32 (the type chips and the unbound contributor hover). So integration is red on this suite without this change, and the set moves from run to run.

## Addendum 2026-11-03 (handoff each_stop_is_its_own_stack)

`[real] the type chips in the nav filter the tree, and a second press puts the
rows back` was red 4 of 4 runs on 2026-11-03 under `--only "3D pane follows the
selection"`. That held on this branch, and with **integration's own `apps/` and
`scripts/`** checked out against the main checkout's data. The main checkout's
runner on master passed it 32/32 the same hour. So it is not this branch's
diff. It also makes the mutation witness
`browser__real-the-kinematic-page-reads-nav-scene-dag-results-left__fb0d661d`
report red-before-mutation on every `--changed-since` run that reaches it.
