---
type: bug
priority: med
status: open
area: tests/browser
class: real_check_reads_the_live_log
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261121_a_body_row_in_the_nav_takes_a_resting_hover_every_time.md
---

# The suggestion and pattern `[real]` checks go red once Jeff binds the features they drive

Two browser suites are red on `integration` (`8ba9e509`) as well as on the
merged review tree. They read the real feature-identity log
(`installRealAnnotatorReads(..., binding: "real")`):

- `a suggestion names its face and the mate ranks the other side (hover, Take,
  armed mates, nothing opposite)`: **3/5**. Red:
  `[real] hovering a suggestion line in the tree lights its face in the pane`
  and `[real] Take on a suggestion line writes one accept event, for the surest
  proposal and its face`. DIAG: `MISSING: the mount's suggestion line`; `names
  face NaN; surest proposal undefined`.
- `a pattern is bound as its like faces and a face can be added (...)`:
  **5/11** on the integration export and **8/11** on the merge, in back-to-back
  `--only` runs. Red: `[real] a click on face 744 offers the bolt circle's ten
  holes, every face of them lit, writing nothing`, `...and so does the Preview`,
  `[real] binding one feature drops the filter's count by one`. DIAG: `filter
  count after binding the shoulder: 65 (was 65)`. The Shift-click on
  `piston_cover_end_stop_shoulder` superseded an existing `-add` event, so that
  feature was already bound.

## Likely cause: the log moved under the checks

Jeff ran a binding session on the evening of 2026-11-22 (local, the event
files' mtimes). Events `0101_tan_link_mount_height_accepted.json` (20:28) through
`0115_pitch_link_lower_outer_race_press_fit.json` (21:32) are in
`data/inbox/feature-identity/` (116 files). The suggestion suite's
`MOUNT_FACE` (`tan_link_mount_215175_002@tan_link_mount_hub_face`) appears in
`0101`, so the mount no longer shows a proposal line. The pattern suite's
"one feature unbound, then bound" premise fails the same way. The checks are
written against the log as it stood when they were authored. Jeff
using the annotator turns them red, with no product change.

Not verified: that every red sub-check is this cause. The 3/5 and the 5/11
vs 8/11 spread also fit the settle-too-early shape that
`a_body_row_in_the_nav_takes_a_resting_hover_every_time` measured. Both suites
settle on `__sweep.bodies`, which is true ~15 s before the pane's queue drains.

## Fix direction

These `[real]` checks pick their subject feature *from the log at run time*
(the first unbound feature with a proposal, and the first unbound pattern), or
run on a pinned copy of the log. They should not hard-code a feature Jeff can
bind. If no such feature remains, they report it by name and do not go red.
Also settle on the `scene-view` queue barrier, not `__sweep.bodies`.

Evidence: review `REVIEW_20261122_a_body_row_in_the_nav_takes_a_resting_hover_every_time.md`.
Ledger rows 2026-11-23T07:45–07:57Z, tier `partial`, and the whole-tier row
2026-11-23T07:35:06Z (47/49).
