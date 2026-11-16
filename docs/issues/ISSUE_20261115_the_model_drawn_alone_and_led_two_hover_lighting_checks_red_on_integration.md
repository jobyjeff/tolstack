---
type: bug
priority: med
status: open
area: tests/browser-tier
reporter: agent
class: flaky_check
found_by: docs/sessions/active/HANDOFF_20261115_the_scene_suite_opens_its_own_pane.md
handoff: the_model_drawn_alone_and_led_hub_hover_check_goes_green
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

## Measurement 2026-11-16, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261116_triage_sweep.md)

Master fast-forwarded `a0e1ac5a` → `4ad98772` (72 commits) with this red known.
`node scripts/run_viewer_browser_tests.mjs` in the main checkout, right after a
fresh `scripts/rebuild_projections.ps1` (every stamp `sha12=4ad987726aa1
dirty=False behind_trunk=0`): **46/47**, and this suite is now **22/23** — the
gap-edge sub-check passes; only the hub-hover one is still red:

- `[real] a part hovered in the tree lights the same thing on all four surfaces, in two tiers ...`

Re-run alone (`--only "the model drawn alone and led"`, 75 s): 22/23, the same
sub-check — deterministic, not a flake. The 2026-11-16 review of
`the_map_draws_the_end_stop_model` measured the same 22/23 on both its baseline
export and its merged tree.

What the suite's own log line prints for the hover (the observed side of every
conjunct except the blade's look; the expected `hubDims` / `hubNodes` / `PILOT`
values are not printed, so those three are unconfirmed): tree own 5 rows incl. `hub`; touching includes
`hub_blade1_root_bearing_bore`; grid own 3 dimensions, touching
`hub_boss_in_tan_link_mount_pilot`; 4 DAG dots; bars 3+1; legs 0; container
`hub`; pane own layer partOverlays 1 / faceOverlays 6, faceOpacity 0.6 >
partOpacity 0.22; looks hub `ghost`, mount `faint`, link `faint`. **The one
conjunct the log does not print is `lookOf(hubLooks, bladeSha).look ===
"faint"`** (`scripts/run_viewer_browser_tests.mjs` ~16208), and the pane's
touching layer now carries 2 faces — the served feature-identity log binds
`blade_root@hub_blade1_root_bearing_bore` (the suggestion suite needs exactly
that binding). Suspect, not proven: the blade now lights as the hub's
interface partner rather than staying faint, and the guard predates that
binding. Routed: `docs/sessions/HANDOFF_20261116_the_model_drawn_alone_and_led_hub_hover_check_goes_green.md`.
