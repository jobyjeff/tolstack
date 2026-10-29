---
type: bug
priority: low
status: open
area: viewer/browser-tier
reporter: agent
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
