---
type: chore
priority: med
status: open
area: viewer/browser-tier
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
---

# The four grip-reachability sub-checks are non-vacuous only because an earlier block left the jog zone open

`scripts/run_viewer_browser_tests.mjs`, the block added by
`topology_grid_scroll_and_grips` (2026-09-16, `[real] with the preview pane
dragged to …px, the jog grip still answers a pointer-down` and its ELEMENT
sibling, at 560px and at `TOPO_PANE_WIDTH.max`).

**They bite today.** Measured in review, on the merged tree: disabling
`VA.jogGripInset`'s clamp reddens both jog sub-checks (`[topology file://]
186/188`), disabling `VA.columnGripLeft`'s clamp reddens both ELEMENT
sub-checks (186/188). So this is not a guard that cannot fail.

**But the stage it needs is inherited, not asserted.** The jog arm only
reaches the clamp because a *different* block ~130 lines above it
(`[real] pitch_system's jog zone drags open`, ~line 2248) drags the jog zone
out by 200px and never puts it back, leaving `railWidth` at ~796px — wider
than the 739px grid a 560px preview pane leaves. With the jog zone at its
natural width the unclamped grip sits at ~313px, comfortably inside the
window, and *"the jog grip still answers a pointer-down"* would be true of the
unfixed build too. Nothing in the new block states that dependency, and
nothing fails if the earlier block starts restoring the zone it widened —
which is exactly the hygiene the new block itself adopts for the pane width.

This is the shape `docs/prompts/REVIEW_AGENT.md` already records twice ("a
browser-tier layout measurement taken at a configuration where the defect
cannot occur", and its closed follow-up `hover_card_layout_guard_can_fail`,
whose fix shape is *a guard that asserts its own stage*): push a non-vacuity
witness **before** the contract, so the suite goes red for being unable to see
the defect rather than green for not finding it.

**Fix shape** (one `push` plus, ideally, one seeding line):

* seed the jog zone inside the block rather than inheriting it, and
* assert the stage — e.g. that the *unclamped* position each grip would take
  (`railWidth - VA.TOPO_GRIP.half` for the jog grip, the ELEMENT column's own
  boundary for the other) is outside the pane's visible window at the width
  being tested. Both numbers are already reachable from the page via
  `window.ViewerApp`.

**Second, cheaper item in the same block** (fold it in rather than filing
twice): the handoff's definition of done asks that *each* rewritten check name
this handoff. Two of the three do; the third — `[real] and it settles where
the reader was, clamped by the browser to the right-hand end of the narrower
pane the respine produced` — does not, and neither does the fourth claim the
session rewrote unprompted (`…and the frame in flight is drawn from the pane's
visible left edge…`). Checked in review: no witness in
`scripts/mutation_witnesses.json` matches those names by `expect_red`, so
adding the tag is safe today.
