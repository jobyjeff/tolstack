---
type: feature
priority: med
status: resolved
area: topology/v2
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md
strategy: dispatch/docs/strategy/HANDOFF_20261118_strategy.md
---

# Which part the pitch plate's two attachment bores sit on, now 215177 is an assembly

Since 2026-11-18 model v2's `pitch_plate_215177_001` is an assembly: the machined
plate 215735-001 and two NAS77A3-015A flanged bushings, with the two 214820-002
straight bushings beside it at the top level. `pitch_plate_link_attach_bore` and
`pitch_plate_tan_link_attach_bore` were left exactly as they were (on the
assembly, same ids) so no standing binding changed meaning; each bushing's bore
reaches them through a `pin_in_bore` (the bolt, which the model leaves out).

**The question for Jeff, through a strategy session:** what should each
attachment bore finally be a feature of?

| Option | The feature is | Faces it would be (pitch link; tangential link) | Cost |
|---|---|---|---|
| a. keep it on the assembly (today) | the attachment's axis, made of its members' faces | any of the faces below | none; the two `pin_in_bore` edges stay |
| b. the plate's bore | 215735-001's Ø7.950 lug bore (215735-A SECTION A-A, 5X / 3X Ø7.950 +0.015/0.000) | 1385/1386; 1375/1376 (same ids on `asm217755_215735_001` and solid 0 of the 215177 mesh) | the binding moves to a new key on the detail: a re-pick |
| c. the flanged bushing's bore | NAS77A3-015A's Ø4.826 bore, the bolt's seat | NAS77A3 mesh faces 2/3, or 215177 mesh 1509/1510 (solid 4); 1452/1453 (solid 1) | as b |

Jeff's own bind of `pitch_plate_link_attach_bore` is in **disagreement** on the
log today (state `disagreement`, standing before this handoff and unchanged by
it): one bind takes faces 1380/1381 alone -- the plate's **Ø8.520** straight
bushing bore, empty in the 215177 mesh because the straight bushing is not in it
-- and the other adds 1509/1510, the flanged bushing's Ø4.826 bore. Neither
set is a single surface: 8.520 and 4.826 are the two different lug holes Jeff
described ("the holes are all different sizes"). The keep-or-let-go flow
settles which set stands; this issue is which part the feature belongs on.

Recommendation: (c) for the pitch-link and tangential-link joints, since the
bolt -- and so the bearing's ball -- is located by the bushing bores, and keep
the plate's bores as the press- and transition-fit seats they now are. The
re-key table is in
`docs/sessions/lessons/LESSONS_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md`.

## Addendum 2026-11-19 (walk `the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page`)

The question is restated as D6 on Jeff's review page,
`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`,
with the walk's grounds. In a scratch copy, Keep on "faces 1380, 1381" settles
the disagreement, but those faces are the plate's empty Ø8.520 bore, where the
straight bushing (a transition fit, installed at the top level, per Jeff's
11-17 note) sits. No bolt touches that bore. So pressing Keep on his own page
before this is answered would bind the bushing's seat as the pitch link's
bore. The page recommends (c), and Unbind first.

## 2026-11-19 triage sweep -- routed to the strategy thread, no new brief

This clears the brief bar (which part a feature belongs on is a domain call
the meshes do not settle), but no open tolstack brief asks it and the
question is already on Jeff's page as D6
(`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`,
recommendation (c)), inside the pitch-plate thread of
`dispatch/docs/strategy/HANDOFF_20261118_strategy.md`. A second file would
make it less decidable, not more. Linked there with `strategy:`.

## Resolved 2026-11-20 by Jeff's note (handoff `the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`)

Jeff's note `20261119T142516_ci28ci` answers it: the link attaches through a
bolt stack, and the bolt is located by the bushing bores -- option (c), and
more. Neither attachment bore is a feature in model v2 any more: v2 has the
bolt at each lug (NAS6403U11D at the pitch link, NAS6403U14D at the
tangential link, read off the 217755-001 A.1 STEP), its shank a `pin_in_bore`
in the flanged bushing, the inner race and the straight bushing. v1 keeps
both bores, their radii and the bindings on them. The faces of Jeff's
disagreeing binds (events 0093 to 0100 on `pitch_plate_link_attach_bore`) and
the v2 feature each set belongs to are listed in
`docs/sessions/lessons/LESSONS_20261119_the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack.md`,
"Bindings that need a re-pick", so the review page can offer the re-pick.
