---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-11 — the_topology_real_loop_runs_on_one_origin: the topology suite's per-study `[real]` loop runs once, not once per origin, and the kinematic study page's verdict wait waits for the verdict that shows

Source: the 2026-11-11 triage sweep
(`dispatch/docs/sessions/lessons/LESSONS_20261111_triage_sweep.md`), from two
issues filed by `the_browser_tier_says_where_its_half_hour_goes` on 2026-11-10:
`docs/issues/ISSUE_20261110_the_topology_http_suite_reruns_the_real_study_loop_the_file_suite_already_ran.md`
and
`docs/issues/ISSUE_20261110_the_kinematic_study_page_browser_suite_aborted_on_a_verdict_wait_at_baseline.md`.
Baseline: `master` at `1ecada27` or later (F1b,
`one_selection_one_hover_and_leaders_off`, merged; the per-suite timing table
from `the_browser_tier_says_where_its_half_hour_goes` merged). Scope:
`scripts/run_viewer_browser_tests.mjs`, `scripts/mutation_witnesses/` (only the
specs this re-aims, if any), `tests/test_browser_runner.py` if a runner-shape
test needs it. Do NOT touch `apps/` (no product change in this handoff) or any
projection input (`docs/topologies/`, `docs/tolerance_stacks/`, the
builders): this handoff changes no projection, so nothing needs rebuilding and
the open worktree-rebuild issue
(`ISSUE_20261110_rebuild_projections_cannot_run_from_a_worktree_...`) does not
bite it -- the `[real]` checks it moves read the main checkout's existing
projection exactly as they do today.

Why now: the whole browser tier ran **1874 s** at the 2026-11-11 batch merge
and **1914 s** in F1b's review, both over the 30-minute merge budget
(`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`,
deferred, carries the measurements). This is the one measured cut that brings
it back under.

## Deliverables

1. **The topology suite's origin-independent `[real]` per-study loop runs on
   one origin.** Measured 2026-11-10: `topology file://` 394 s and
   `topology http` 378 s, 209 checks each, 28% of a 2,723 s tier; a per-check
   gap profile showed most of each is the `[real]` per-study loop (about 8 s
   per study click, no fixed sleep), which reads the projection through
   `demoTopologyFixture` and so does not depend on the origin. Split the
   suite's checks into origin-specific ones (script-tag load order,
   transport, anything that reads `location.protocol` or the storage backend)
   and origin-independent ones; run the latter on **one** origin only.
   - **The call, made here:** keep the per-study loop on `topology http` --
     the origin port 8000 serves and Jeff reads -- and drop it from
     `topology file://`. The six witness specs that name `topology http`
     (`scripts/mutation_witnesses/browser__*` -- nav width, nav divider, the
     Preview pane's default width) stand on nav checks, not on the loop, so
     they should need no re-aim; confirm by reading each spec's `suite` and
     anchor, and re-aim any spec whose anchor the move takes off its suite.
     Rejected alternative: keep the loop on `file://` (the issue's first
     sketch) -- equivalent in seconds, but it puts the reading surface's
     checks on the origin nobody serves.
   - Do **not** delete a check: every assertion that ran on either origin
     still runs on at least one. List, in the lesson, each check that moved
     from "both origins" to "http only", by its printed name.
   - The other origin pairs (`deep links`, `app`, `index redirect`, `suite`)
     are under 45 s a pair; leave them.
2. **The kinematic study page suite waits for the verdict that is visible.**
   2026-11-10, untouched tree: `kinematic study page (deep link, chart hover,
   contributors, no projection)` printed `ABORTED after 26 sub-checks, 0 of
   them already FAILED` on `page.waitForSelector: Timeout 15000ms exceeded ...
   waiting for locator 'div.kmverdict, .banner__notice' to be visible`; the
   locator resolved to two elements and Playwright waited on the first,
   `<div class="kmverdict" data-stop="plus72">`, which never became visible.
   The suite is the entry at `scripts/run_viewer_browser_tests.mjs:16301`;
   its `kmverdict` waits are near `:13167` (15 s, followed by a
   `count() === 2` read at `:13169`) -- find the one with the
   `, .banner__notice` alternation. First say **why** the `plus72` verdict is
   hidden at baseline (one of two stop verdicts, one shown at a time? a
   collapsed section?) -- that is the fix's justification. Then wait on the
   one that should be visible (`:visible`, or the stop the page opens on),
   not on whichever the DOM lists first. Possibly the same family as the
   deferred `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`;
   say in the lesson whether it is.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "topology file://"`
  and `--only "topology http"` both green; the runner's own timing table
  shows the file:// suite's seconds before and after (target: the file://
  suite under 150 s, from 394).
- `--only "kinematic study page (deep link, chart hover, contributors, no projection)"`
  green three times in a row (it aborted once in one run; one green proves
  little).
- Any witness spec re-aimed: `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only "<guard>"`
  WITNESSED for each.
- The default pytest tier once and the two fast node tiers, per `CLAUDE.md`'s
  tactical-session row. **Do not run the whole browser tier or the witness
  `--changed-since` gate** -- those are the review's, once, after the merge.
- Lesson (`docs/sessions/lessons/LESSONS_20261111_the_topology_real_loop_runs_on_one_origin.md`):
  the checks that moved and their names; the seconds per suite before/after;
  why `plus72`'s verdict is hidden; any spec re-aimed.
