---
priority: med
depends_on: [the_viewer_real_tier_follows_the_slide_re_author]
model: opus
hitl: false
---

# HANDOFF 2026-11-04 — the_browser_tier_reds_left_after_the_slide_re_author: diagnose and clear the browser-tier reds trunk carries after the 2026-11-04 batch merge

Source: the 2026-11-04 triage sweep's batch merge (master `3062127c`). After the post-merge
`scripts/rebuild_projections.ps1` (provenance `branch=master sha12=3062127ca147 dirty=False
behind_trunk=0`), `node scripts/run_viewer_browser_tests.mjs` in the main checkout scored **35/41**
(1751 s). Every red suite was already filed, and none of them was routed:

- `docs/issues/ISSUE_20261104_three_browser_suites_are_red_on_the_base_with_a_fresh_projection.md` (med)
- `docs/issues/ISSUE_20261103_the_pitch_system_real_pins_are_one_leader_behind_the_merged_topology.md` (med, browser section)
- `docs/issues/ISSUE_20261103_the_slide_re_author_leaves_six_viewer_real_checks_red_on_integration.md` (high, "The browser tier" section)
- `docs/issues/ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`
  and `docs/issues/ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md` (the 3D-pane flake history)

The two reds fixed by `the_browser_tier_is_green_on_trunk_again` (completed) stay green on trunk:
`annotate hosted posture` 15/15 and `topology file:// respine` 44/44. Don't reopen them.

Baseline: tolstack master after `the_viewer_real_tier_follows_the_slide_re_author` merges. That
handoff fixes the fast-tier pins and the topology fixture. Re-measure first, because it may clear
the two `topology` suites below. Scope: `apps/viewer/` (only the code your diagnosis implicates),
`scripts/run_viewer_browser_tests.mjs`, `docs/issues/`. Do NOT touch `scripts/mutation_witnesses/`,
except for specs whose anchor your own edit moves.

## The reds (measured 2026-11-04, main checkout, full run)

1. `topology file://` and `topology http`: 201/205 each. Failing: `[real] pitch_system's bands are
   tinted by parity and its rows by their body…`, `[real] pitch_system's jogged leaders still land on
   every dot and seam`, `[real] and back in angled style, flat out of the rails then straight`, and
   `[real] the jog zone is measured against the product graph's own 61 leaders`. This is the same
   layout shift as the fast-tier pins. Expect the dependency to clear it.
2. `real render path (non-mock)` ABORTED: `locator.click` on `tr.tvrow[data-id="washer_ms21299c3"]`
   timed out after 30000 ms. `crop lightbox` ABORTED the same way, on
   `tr.tvrow[data-id="fastener_grip_pitch_link"]`. Earlier runs named the interceptor as
   `svg.tv__rails` and a `rail__leaderhit` path (`piston_heads_seat`). **This is the most likely real
   defect.** A grid row that a pointer cannot click because the DAG's SVG covers it would also block
   a reader.
3. `3D pane follows the selection`: 30/32. Failing: `[real] resting on a bound contributor row tints
   its face in the annotator, in the colour buffer…` and `[real] clicking a contributor row with the
   pane open keeps the page on the study and the annotator in sweep mode, the edge highlighted`.
   The failing subset moves from run to run (see the flake issues above).
4. `the scene pane reads over HTTP`: 8/9. Failing: `[real] with no folder grant, the pane reads the
   run and the meshes over HTTP and shows the mechanism…`.

## Deliverables

1. **Root-cause each red before changing anything, and say which side was wrong.** For item 2,
   suggestion: call `document.elementFromPoint` at the click point to find which part of the rails
   SVG overlaps the row, then decide whether the leader hit-area is wrong (fix the app) or the check
   clicks a point no reader would (fix the check, and cite why). For item 3, use the
   `timing_assertion_under_load` lever: wait on an event or a settled state, never on a wider
   window. `LESSONS_20261102_the_browser_tier_is_green_on_trunk_again.md` is the worked example.
2. **Never weaken a check to make it pass.** If a check asserts something that is no longer true by
   design, change what it asserts and cite the commit that changed the design.
3. Close each issue above that your fix resolves, with a verified `resolution:`.

## Definition of done

- From the main checkout's data (`--repo C:/workspace/tolstack`, with `node_modules` junctioned per
  the 11-02 lesson): every suite above passes. Run each one alone with `--only`, and again inside one
  full browser-tier run. Report the full-run score.
- The default tier and both node fast tiers are green.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  for the specs your hunks reach.
- Lesson (`docs/sessions/lessons/LESSONS_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md`):
  for each red, whether it was a regression or a stale or racy check, the evidence, and the commit
  that caused it.
