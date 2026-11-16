# LESSONS 2026-11-16 — the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page

The review page is `REVIEW_20261115_the_map_and_the_binding_flow.md`: 43 rows,
22 does it, 17 partly, 4 does not. The shots are in
`shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/`. Two
issues were filed:

- `ISSUE_20261116_shrinking_the_window_with_the_pane_open_leaves_the_map_region_zero_wide` (med)
- `ISSUE_20261116_small_findings_of_the_map_and_binding_flow_walk` (low, S1–S9)

## Which tree, and the real log

- **Walked tree: `integration` = this branch's base, `61f78e19`.** It carries
  all four of the handoff's baseline handoffs. `master` (`a921f92b`) carries
  none of their code (`rankMatingFaces`, `renderDagSwitch` and `map__boxhit`
  are absent on master). It is 67 commits behind, and 8000 returns 404 for
  `map.js`. So `integration` was the only baseline that qualified.
- **Jeff's 11-15 spot check was made on `master`.** That is why he saw no
  coaxial ranking and no map. Both landed on `integration` after his checks.
  His events (seq 80–82, 2026-11-16 03:30 UTC) are in the real log, and the
  walk read them through the scratch copy.
- **The real log:** 83 events before and 83 after
  (`find … | grep -vc README`), and the listing hash `9e60965e…` is the same
  before and after. The scratch log at
  `data/scratch/walk1116/data/inbox/feature-identity` now holds 86 events. The
  three new ones are a hub-bore unbind, a hub-bore Take (2356 + 2358) and the
  mount's fastener pattern Take-all (20 faces).

## How long the walk took, by part

| Part | Time | Notes |
|---|---|---|
| Reading (handoff, the 11-12 page, the map handoff and its lesson, the pattern lesson) | ~15 min | |
| Scratch root | ~8 min (09:00–09:08) | `cp -r` of inbox, meshes and projections (397 MB), then the eight builders with `--data-root`. The kinematic step is the slowest, at ~6 min |
| Page walk | ~18 min (09:08–09:26) | 31 shots, the same driver as 11-14 on port 8872, one step per HTTP call |
| Write-up and issues | ~15 min | |

## What the next viewer handoff should know that the review page does not say

- **The map's boxes and districts take clicks only on their border and name.**
  The rule is `pointer-events: stroke` (S2). A probe that clicks a box's centre
  selects nothing and reports nothing. Use the name's `<text>`, which is
  inside the part's `[data-map-kind=part]` group.
- **The tree reflows under a stationary pointer.** Selecting a row opens it,
  so the row below moves under the mouse, and a "selection" shot can show a
  hover on whatever row slid there. Move the mouse to empty space before
  every shot. A walk that skips this reads the wrong lit set.
- **Lit state on the map is readable from classes.** Every `[data-map-kind]`
  element carries `--lead`, `--hot`, `--selected` or `--touched`. One `eval`
  gives the whole lit set as `kind:id` pairs, which is quicker than reading a
  shot.
- **The pane width is pixels and survives a resize.** At 5120, Side by side
  measured 2481 px, not the 1841 the map lesson records, because the pane
  kept its 3840 width. Shrinking to 1920 left the region at 0 px (W). Any
  region-size table needs a fresh load per window size.
- **The 3D framing is almost always inside the assembly.** At 3840 the
  landing framed the blade. After that the camera sat inside the hub, and
  every "harder face" claim (row 13) was hard to judge. A walk that needs to
  read faces should isolate the part first.
- **Pattern offers appear in the pane's head, not beside the Take** (S6). The
  probe found the bar with `frame: "pane"` and `button.an__offer-btn`.
- The 11-14 driver needed no change. The one client change: a Python client
  must read the 500 body (`HTTPError.read()`), or every driver error looks
  the same.

## Test record

All runs were in this worktree on the committed tree. No code was changed, so
only the default tier and the doc scans apply:

(filled in below after the run)
