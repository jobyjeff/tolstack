---
type: bug
priority: high
status: open
area: annotate/sweep-rail
reporter: agent
found_by: docs/sessions/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
---

# A body's part with no 3D model has no row kind in the sweep rail, so "annotate rail holds still" is red on integration

On integration, `annotate rail holds still` fails one sub-check:
`[real] the scene tree's rows say what they are: body, part, joint, end and
candidate rows each carry their kind, ...`. It was found while reviewing
`the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`,
whose fix took the suite from 11/17 to 17/17 on its own branch. After the
review merge with integration, the suite is 16/17.

**Cause.** `a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list`
(`6e0058ca`) made the Bodies list read the model's bodies
(`AA.sweepModelTree`, `apps/annotate/sweep.js`). A body now lists every part
the topology declares for it, including parts with no installed mesh. Those
parts are drawn by `missingPartRow` (`apps/annotate/app.js`, called from
`treePartRows`), and it never calls `railLook`. So the row has no
`data-kind`. `buildPartRow` does call `railLook(li, AA.RAIL_ROW_KINDS.part)`.

Rows with no kind (the check's own log, printed with the keys):

- `#sweep-tree/body=base/fastener family`
- `#sweep-tree/body=pitch_plate/flanged bushing nas77a3 015a`
- `#sweep-tree/body=pitch_plate/flanged bushing tan link`
- `#sweep-tree/body=pitch_plate/flanged bushing unidentified`

**Why nobody saw it.** The suite was already red, 11/17, when that handoff
landed, and the failing sub-check was among the six. So the new defect was
hidden behind the old red.

**Smallest fix.** Give the missing-part row the part kind
(`railLook(li, AA.RAIL_ROW_KINDS.part)`) or, if a missing part should read
differently, a kind of its own in `AA.RAIL_ROW_KINDS`. Do not loosen the
check: a rail row with no kind gets no glyph and no type-filter chip.

Measured: `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "rail holds still"`
on review branch `36c0cda3` (integration `e3795300` plus the handoff),
against main-checkout projections built from `3d04f5cd`.

**Cause confirmed.** A scratch probe added that one `railLook` line to
`missingPartRow` on the merged tree, and the suite went 17/17. The probe was
reverted and not committed, because the fix belongs to a tactical handoff.

**This also blinds witnesses.** While the suite stays red, the mutation-witness
gate skips every entry hosted in it as `the tier is already red with NO
mutation applied`. Measured at the review merge with
`--changed-since integration`: `d97c0520` and `0037f3b0` were reported NOT
WITNESSED for that reason. The pane-seek witness `f697d046` is hosted in the
same suite. This is the same blinding that the 2026-11-09 handoff was staged
to end.
