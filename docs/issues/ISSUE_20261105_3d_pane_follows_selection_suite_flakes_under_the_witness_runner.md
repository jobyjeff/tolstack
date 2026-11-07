---
type: bug
priority: low
status: deferred
area: viewer/browser-tier
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
class: flaky_check
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# "3D pane follows the selection" fails a different sub-check on some witness-runner runs

Guard `browser__real-a-reload-reopens-the-pane-the-reader-left-open-at-t__09a1cf0a` read
"tier was red before the mutation" twice in the witness runner, each time on a different
sub-check ("clicking a contributor row in the nav selects it in the scene", then "resting on a
body row in the nav lights that body in the scene"). The same suite was 32/32 in the full
browser tier and in two isolated `--only` runs. Not baselined against integration, so whether
this change's pane-open/close glide widens the window is unknown; the checks click and hover
rows while the page may still be settling. The witness for this guard is therefore unproven on
this branch; the sweep should re-check it.
