---
type: bug
priority: high
status: triaged
handoff: docs/sessions/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
area: tests/browser-truth
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
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
