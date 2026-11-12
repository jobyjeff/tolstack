---
type: bug
priority: med
status: resolved
area: tests/browser
reporter: agent
found_by: docs/sessions/HANDOFF_20261110_the_browser_tier_says_where_its_half_hour_goes.md
class: flaky_browser_suite
handoff: docs/sessions/HANDOFF_20261111_the_topology_real_loop_runs_on_one_origin.md
resolution: triage 2026-11-11 -- folded with the topology-pair cut into one browser-runner handoff (same file, same tier) -- handoff completed 2026-11-11 -- closed automatically by dispatch when handoff `the_topology_real_loop_runs_on_one_origin` moved to completed/; not independently verified.
---

# The kinematic study page browser suite ABORTED on a verdict wait, on an untouched tree

Full browser run, 2026-11-10, from the handoff worktree (no `apps/` change; only
the runner's timing), `--repo C:/workspace/tolstack`: 43/44 passed, and
`kinematic study page (deep link, chart hover, contributors, no projection)`
printed `ABORTED after 26 sub-checks, 0 of them already FAILED` with
`page.waitForSelector: Timeout 15000ms exceeded ... waiting for locator
'div.kmverdict, .banner__notice' to be visible` — the locator resolved to two
elements and proceeded with the first, `<div class="kmverdict" data-stop="plus72">`,
which never became visible. That suite took 274.8 s. Not reproduced a second
time (not re-run); may be the same family as
`ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`.
Candidate fix: wait on the visible one (`:visible`/`.first()` is the hidden twin) or
name why the `plus72` verdict is hidden.
