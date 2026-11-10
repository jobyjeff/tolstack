---
type: bug
priority: high
status: resolved
handoff: docs/sessions/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
area: tests/browser-truth
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
resolution: the check, not the product -- Jeff had accepted both pitch-link ends (and every other end the study lists), so the end had nothing to Take; the check now serves accept-only records as they stood before the accept and picks its joint at run time. 17/17 on main-checkout projections rebuilt from 3d04f5cd (handoff the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection)
---

# The "annotate rail holds still" browser check is red on integration

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "rail holds still"`
was run against the main checkout's projections (integration `d9062b2d`, before
any of this handoff's changes) on 2026-11-08. It reports 11 of 17 sub-checks
passed, and the suite is
`annotate rail holds still (bodies under Bodies, joint words, framing, the second face)`.
These six sub-checks fail:

- `[real] a Take keeps the nav's scroll, and the joint row stays where it was on screen`
- `[real] after one end is taken the other end's candidate list is open and selected, still suggested, and no edge-feature row is listed`
- `[real] the scene tree's rows say what they are: body, part, joint, end and candidate rows each carry their kind, and every joint end carries a mark from the annotator's vocabulary`
- `[real] the end taken this session wears the picked-now mark, filled in the scene's pick orange, and its partner does not`
- `[real] each level of the tree steps in by a full indent: an end from its joint, a candidate face from its end`
- `[real] a body, a part, a joint, an end and a candidate face each draw a glyph`

The same six fail against projections built from the branch that found this,
which does not touch the pitch link's edges. The check takes the pitch link
upper end's suggested face
(`scripts/run_viewer_browser_tests.mjs`, ~line 9083, regex `UPPER`).

Likely cause: the live end has no `Take`-able `face=` candidate row. The
bindings projection is now rebuilt by
`the_bindings_projection_folds_the_events_jeff_accepted`, and the end may be
bound already, or v2 may be the default model the rail opens on. That needs
checking by whoever takes this. The remaining 42 of the 43 browser suites pass.

## Resolution 2026-11-09

The check, not the product. On main-checkout projections rebuilt from
`3d04f5cd`, `bindings.json` has `pitch_link_length` bound at both ends by
`annotate-app:jeff`, accepting `proposal-0001`/`-0002`, with no open
proposal and no contact row. A bound end with nothing open lists no
candidate, so the check found no `Take`. Every joint in the study had the
same problem: the rail logged its nine ends as
`bound bound bound bound open bound bound bound bound`, and no joint had both
ends of one edge open.

The fix is in `scripts/run_viewer_browser_tests.mjs`.
`acceptedOnlyProposals()` reads the inbox and picks out the records whose
only answers are accepts of agent proposals. That is `pitch_link_length`,
`pitch_plate_slide_bushings_to_piston_body` and `tan_link_length` today. The
annotator is then served those records as they stood before the accept: the
real proposal events, open, and no binding. Everything else is the projection
as built. `takeTarget` then picks the first joint in rail order whose two rows
are the two ends of one edge, both open and both listing faces. Today that is
`plate_slide`. Result: 17/17.
