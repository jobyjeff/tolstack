---
type: bug
priority: low
status: deferred
class: reading_surface_copy
defer_until: 2026-12-21
resolution: deferred 2026-11-21 (triage) -- low, the default knob
area: viewer
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261119_the_viewer_says_nothing_about_itself.md
---

# The stale-data banner says "needs a rebuild" twice, two lines apart

Found by `the_viewer_says_nothing_about_itself` (2026-11-20), out of that
handoff's scope: a warning about the data is a fact about the data and stays.
Only its echo is the problem.

On any page whose projection is older than the code, where the server has no
rebuild endpoint (a file:// page, `ops.toml`'s `serve`, any probe server), the
banner shows:

- the alarm's summary: *"Data is older than the latest code — needs a rebuild"*
  (`apps/viewer/views/banner.js`, the `banner__stale` disclosure), and
- directly under it: *"The data is older than the code and needs a rebuild."*
  (`rebuildAffordance`'s `banner__rebuild-hint`, the no-capability arm).

The second line restates the first. The house prose budget says no echo. With
the rebuild capability the second line is a **Rebuild** button instead, which
is fine. The fix is probably to render nothing in the no-capability arm, and to
rewrite whatever pins the hint's text (`apps/viewer/tests.js`, the rebuild
affordance checks; `scripts/run_viewer_browser_tests.mjs`, "rebuild affordance
(stub sibling mount)").

Screen: `docs/sessions/lessons/shots/the_viewer_says_nothing_about_itself/after_v1_no_study.png`,
top right.
