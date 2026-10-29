---
type: bug
priority: low
status: open
area: contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
---

# A ball's seat ranks the plate's companion Ø8.520 bore over the Ø7.950 attach bore the topology itself cites

Found reviewing `the_contact_engine_asks_the_ends_what_shape_they_are`
(`docs/sessions/reviews/REVIEW_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md`).

That handoff put the seat's radius into `ball_in_seat` ranking, as it was asked
to: `interface_contact.rank_score` adds `|seat_radius - ball_radius| / ball_radius`.
Against a build of the merged tree, both plate joints now rank a
drawing-consistent bore first, which is what the DoD asked for:

| edge | rank 1 | rank 2 |
|---|---|---|
| `pitch_plate_link_joint` | r 4.26 (Ø8.520), 2.0759 | r 3.975 (Ø7.950), 2.2281 |
| `tan_link_plate_joint` | r 4.26 (Ø8.520), 2.3675 | r 3.975 (Ø7.950), 2.4099 |

**What decides rank 1 between the two callouts has no physical basis.** The
ball (r 5.147 / 6.73) sits in a bearing, which sits in a bushing, which is
pressed into the lug. A lug hole's radius is not "near" the ball's in any sense
the joint cares about; r 4.26 wins only because it is the larger of two
numbers both below the ball's. Meanwhile `docs/topologies/topology_vpa_pitch_linkage.json`
already names **Ø7.950** as the attach bore (`3X Ø 7.950 … ⌖Ø0.2 A B` for the
tangential links, `5X Ø 7.950 … ⌖Ø0.2 A B C` for the pitch links), and calls
the Ø8.520 the companion bore positioned from it (datum F). So the engine's
rank 1 on both joints is the bore the topology says is *not* the one the
attach point is toleranced on.

Both rows are "not clear" (the runner-up is within the clear margin), so no
proposal pass treats either as settled today. The risk is a later pass or a
reader taking rank 1 at face value.

**Options.** (a) Leave the rank as a proximity heuristic and have the annotator
say the two are close (they already are "not clear"). (b) Rank a cylindrical
seat by something the joint has: the bushing's OD fit, or a seat that shares
the ball's axial extent (`along_axis_mm` already measures it). (c) Let a
drawing callout that the topology already cites break the tie. Recommendation:
decide (b) vs (c) in strategy; (c) is the repo's "a drawing citation still
wins" rule, but the engine is fenced from reading values, so it may belong to
the proposal pass rather than the engine.
