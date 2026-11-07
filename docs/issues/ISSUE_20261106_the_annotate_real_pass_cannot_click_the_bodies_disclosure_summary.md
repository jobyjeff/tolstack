---
type: bug
priority: low
status: deferred
area: apps/annotate/run_browser_check.mjs
reporter: agent
defer_until: 2026-12-06
class: flaky_check
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# The annotate `[real]` pass times out clicking `.an__sweep-bodies > summary`

On an `integration` checkout (no piston-heads change in it) and on the rework branch alike,
`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957` stops at
`page.locator(".an__sweep-bodies > summary").click()` -- "locator resolved to
`<summary>17 of 17 parts placed</summary>` ... waiting for element to be visible, enabled and
stable", 30 s. Every `[real]` check after it ("the bodies disclosure lists the parts the run does
not move", the bushings note, the fps measurement, ...) is therefore never reached. Suspect: the
canvas re-rendering under software rasterisation keeps the element from being "stable" (the 2026-11-06
run had the viewport re-laid out by the bar's frame note). A `click({ force: true })` or a
`dispatchEvent("click")` would sidestep it; not tried here (out of scope).
