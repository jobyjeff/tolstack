---
type: bug
priority: med
status: open
area: tests/browser-tier
reporter: agent
class: flaky_check
found_by: docs/sessions/active/HANDOFF_20261115_the_scene_suite_opens_its_own_pane.md
---

# "The model drawn alone and led" is 21/23 on integration: two hover-lighting sub-checks

Measured 2026-11-15 in the review of `the_scene_suite_opens_its_own_pane`, with
`--repo C:/workspace/tolstack`, both with the merged runner (whole tier: 43/44, this the
only failure) and with `integration`'s **unchanged** runner (`git show integration:scripts/run_viewer_browser_tests.mjs`,
`--only` this suite): 21/23, the same two reds, so not caused by that handoff.

- `[real] a part hovered in the tree lights the same thing on all four surfaces, in two tiers ...`
- `[real] a gap edge hovered from the grid lights its row, its bar and its two end dots as own ...`

Not the resolved `ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_...`
(that was an off-screen DAG dot in a different sub-check). Not diagnosed: the failing
sub-check text is the first thing to read; suspect a viewer change on integration since
that fix, or a projection built from an older tree.
