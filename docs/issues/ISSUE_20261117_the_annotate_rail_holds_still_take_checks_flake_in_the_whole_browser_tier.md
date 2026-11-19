---
type: bug
priority: med
status: resolved
area: tests/browser-truth
class: browser_tier_flake
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md
handoff: docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md
resolution: the Take checks read a nav snapshot taken after a fixed 300 ms and a fixed 1000 ms; they now wait on the Take button, the written event, the partner row selected with its layer on screen, and the bound body, each throwing a named error (the red order was not reproduced, so this cause is the inferred one -- see the lesson)
---

# The "annotate rail holds still" Take checks flake in the whole browser tier

Measured in the round-2 review of `the_base_stack_joints_are_seat_boss_and_pattern`
(merge `65339f5d`, scratch root built from that tree, 2026-11-17):

- The whole tier (`node scripts/run_viewer_browser_tests.mjs --repo <root>`):
  **14/17**. Three `[real]` sub-checks after a Take were red:
  - "after a Take the faces layer follows the partner end: its feature row is selected and on screen, with the pane's row for it beneath";
  - "after one end is taken the other end is selected with its candidate faces listed under it …";
  - "the end taken this session reads bound in its body, naming the face just taken …".
- `--only "annotate rail holds still"` on the same tree and root, straight after: **17/17**.
- Green in the whole tier one round earlier, on a tree that differed only in an
  unrelated seam-leader check and a lesson. The author's whole tier at `f7b7c453` was 48/48.

So it is order- or load-dependent, not this branch's. All three red checks
read state that follows a Take, which suggests a wait that a slower box
outruns. Not the cause of `ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`
(resolved; that one was data with nothing to Take).

## 2026-11-17 triage sweep

Staged as `docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md` together with the suggestion-line flake. Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
