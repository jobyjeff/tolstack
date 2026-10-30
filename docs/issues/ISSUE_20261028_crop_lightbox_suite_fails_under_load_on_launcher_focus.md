---
type: bug
priority: low
status: resolved
area: viewer/browser-tier
reporter: agent
class: timing_assertion_under_load
handoff: docs/sessions/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
---

# The crop-lightbox browser suite fails under load: "the launcher takes keyboard focus"

Seen in the tactical run of `the_dag_is_zoomable_and_a_length_mode_draws_to_scale` (two full
runs overlapping other heavy jobs) and again in the review's first full browser run:
`ABORTED after 2 sub-checks` on "the launcher takes keyboard focus and becomes visible when it
does", then a 10s `waitForSelector('#crop-lightbox[open]')` timeout. Run alone (`--only "crop
lightbox"`) it is 20/20. The branch does not touch `lightbox.js`, `app.js` or `style.css`, so
the cause is timing (focus stolen when the detail pane re-renders late), not that change.
A fixed-timeout wait on focus should poll for it instead. Same night, one witness
(`browser__real-a-node-selected-on-the-dag-is-selected-in-the-scene__47750d7d`) reported
"tier red before the mutation" in a loaded `--changed-since` run and WITNESSED on a rerun.

## Resolved 2026-10-29

Fixed in 083ba71b (handoff `viewer_browser_checks_wait_on_settled_state`): the check waits on a settled state under a deadline of seconds.
