---
type: review
handoff: docs/sessions/active/HANDOFF_20261110_the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model.md
reviewer: agent
date: 2026-11-10
verdict: APPROVE
blockers: 0
---

# Review — the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model

Branch `handoff/...` (tip `c08d395f`) merged into `review/...`, which was cut
from `integration` `25765f23`. Before the merge the handoff branch was not
contained in `integration`, and the merge was clean.

## What I verified

- **Deliverable 1, the seat.** In v2, `gas_spring_mount_hub_face` and
  `hub_spindle_to_gas_spring_mount_face` are gone. `tan_link_mount_gas_spring_seat`
  is on `[gas_spring_mount, tan_link_mount]`, and `tan_link_mount_overall_height`
  runs seat → hub face. Both reuse v1's ids, and the reuse is held to v1's
  ends by `test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`.
  No value was copied in. Each new edge note names v1's citation (215198-A
  79.00 ±0.10; 213668-002 76.86 ±0.10) as what would close it. The
  bushing-bore dimension got a v2-only id, and the reason is stated: v1's
  `gas_spring_mount_height` still starts at v1's hub seat.
- **Deliverable 2, the drawing evidence.** I read 213668-002 A.1 sheet 1
  myself (drawing-checker run `20260819_150314_…`, `page_1.png`). SECTION C-C
  dimensions **76.86 ±0.10** from the base to the top face. The base is datum A
  (the side view's flatness 0.1 frame). The only other axial callouts are
  `5X 4.00 ±0.10 FLANGE THICKNESS` and `(85.36)`, and neither places the cover
  flange from datum A. So the one-edge route matches the drawing's own scheme.
  "Which edge a study sums" is stated in the edge note, in DAG_TOPOLOGY.md and
  in the lesson.
- **Deliverable 3, everything that states v2's shape agrees.** The counts are
  unchanged (3 edges out, 3 in; one contact replaced). Per-part features and
  dimensions are pinned in the new `tests/test_model_view.py` test. The new
  `tests/test_topology.py` test pins the stack shape, and it cannot pass on the
  pre-work tree (the seat node did not exist). The README crossing figures are
  re-derived by the `[real]` tier, which is green.
- **Deliverable 4, re-measured by me.** The sweep has 9 distinct feature ids,
  none of them removed. `bindings.json` has 0 records on every removed or new
  edge, except that `gas_spring_mount_datum_a_to_end_stop` has one v1 stack
  key with two proposals. This matches the lesson.
- **Shots.** I read `d2` and `g1`. The base reads in the order the handoff asks
  for (hub, 215175, 213668, 214958), with no hub → gas-spring-mount rail. A
  second, small hub block follows the cover (see the should-fix below).
- **WIP commits.** "variant A/B" were reverted by `3ca601d1`. The net diff
  carries none of them.
- **Scope.** v1, viewer/annotator code and the sweep are untouched. The only
  `apps/` file changed is the viewer README.

## Tests

- **Tactical record:** the full default tier was 1 failed (the deliberate
  worktree red), 1927 passed, in 424 s. Viewer 676/676, annotate 307/307,
  browser TRUTH 44/44, witnesses 0 of 879 reached. The record is consistent
  with the diff, so I gave it the benefit of the doubt.
- **Pre-merge risky subset** (topology data + prose rows): `pytest
  tests/test_tolerance_stack.py tests/test_topology.py
  tests/test_topology_projection.py tests/test_viewer_projection.py
  tests/test_model_view.py tests/test_claims_registry.py tests/test_provenance.py
  tests/test_thermal_exception_list.py` gave **535 passed**. `node
  apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave **676/676**,
  with the freshness gate passing. `node apps/annotate/run_tests.cjs` gave
  **307/307**.
- **Projections.** The main checkout's projections were rebuilt by the
  tactical agent from this branch at `1c5b427b`. The commits after it change
  no projection input, and the freshness gate accepted them against the merged
  tree, so I did not rebuild again.
- **Mutation witnesses** (`--changed-since integration`): 0 of 879 reached.
- **Browser TRUTH tier: not re-run.** The diff touches no CSS or positional
  code, and the tactical agent's 44/44 run was against the same projections.
  The batch merge runs it.
- Post-merge full suite: see "Post-merge" below.

## Findings

**Should-fix (filed, not fixed here — the handoff fences viewer code):**

1. **The hub now draws as two blocks on v2's whole walk.** The hub's two
   tangential-link-mount dimensions land after the cover. The block-crossing
   `[real]` guard is green only because the author put the hub's blade-bore
   edge after its joint edges. The author found this, recorded it in a `notes`
   line and filed it as
   `ISSUE_20261110_v2s_whole_walk_draws_the_hub_twice_and_its_block_guard_holds_only_by_edge_order.md`
   (`audience: strategy`, med). That issue owns it, so I filed nothing new. I
   added a Recurring-bugs entry to the overlay for this new shape.

**Nits:**

- The blade-root issue's `ask:` ("Say whether…") is the reply-shaped ask the
  canonical rule calls a hoop. It stands because the handoff explicitly asked
  for `needs: jeff` on this class of finding.

## Inline fixes

None.

## Overlay

Added "A topology data change 'fixed' by reordering its authored edges" to
Recurring bugs.
