---
type: bug
priority: med
status: closed
area: browser TRUTH tier / leaders across the seam
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/active/HANDOFF_20261117_a_joint_says_what_kind_it_is.md
resolution: subject retired: the leaders-across-the-seam suite was removed with the rails by the_map_is_the_only_drawing_and_classic_retires (2026-11-17); no suite of that name is registered in scripts/run_viewer_browser_tests.mjs on 2e239d04
---

# "Leaders across the seam" flakes on integration, in three different sub-checks

`ISSUE_20261104_the_scene_tree_pick_leaders_check_is_flaky.md` was closed
automatically when `the_seam_and_rail_checks_wait_on_settled_state` completed,
and nobody verified the fix. The suite still flakes, on `integration` as well
as on a merged branch, and in more sub-checks than the one that issue named.

Measured 2026-11-17 in the review of `a_joint_says_what_kind_it_is`, against
one scratch root (`data/scratch/jk_review`, every projection built from the
merged tree), `node scripts/run_viewer_browser_tests.mjs --repo <root> --only
"leaders across the seam"`, nothing else of mine running in the slot:

| run | tree | result | red sub-checks |
| --- | --- | --- | --- |
| whole tier | merged `df13a375` | 24/25 | a row the scene marks selected (a pick there) selects its element here, ... |
| merge 1 | merged | 23/25 | [real] clicking a contributor row lights its 2D-grid and 2D-3D leaders and the scene's line; [real] picking the tangential link's face in the scene produces the state its contributor row does |
| base 1 | `integration` `e464809e` (git archive) | 24/25 | a row the scene marks selected ... |
| merge 2 | merged | **25/25** | none |
| base 2 | `integration` | 22/25 | the two tangential-link checks above, plus [real] ...and at 1920x1080, after the window grew under them |
| merge 3 | merged | 23/25 | the two tangential-link checks |

So 5 of 6 runs were red, spread across both trees, and the set of red checks
moves between runs. That looks like a wait in the real (P2) section that
does not key on the scene having settled, not like a defect in the page. Per
this repo's overlay ("N green runs is not evidence a flake is fixed"), the
fix should come with a replay of the failing order, not just a run of greens.

## 2026-11-17 triage sweep

Closed: the suite is gone. `grep -n '^\s*\["[^"]*seam' scripts/run_viewer_browser_tests.mjs` finds no registered suite on master 2e239d04, and the comment at ~line 13380 records that the seam leaders were retired with the rails. If a surviving [real] suite shows the same moving-red pattern, file it against that suite. Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
