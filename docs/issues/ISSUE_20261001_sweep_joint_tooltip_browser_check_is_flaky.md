---
type: bug
priority: low
area: apps/annotate
reporter: agent
status: deferred
class: wall_clock_dependence
defer_until: 2026-11-01
resolution: deferred 2026-10-02 (triage) -- `low`, deferred by default under the budget rule. Classed wall_clock_dependence: it fails intermittently with no file changed, on a hover/tooltip race. ISO date rather than a class trigger: this sweep measured 283 issues workspace-wide already deferred behind class triggers whose live count the budget rule itself drove below the CLASS_WAKE_THRESHOLD of 3 -- see dispatch/docs/issues/ISSUE_20261002_a_class_defer_trigger_cannot_fire_once_the_budget_rule_has_deferred_the_class.md.
---

# `run_browser_check.mjs`'s "hovering a joint bead" check is flaky, independent of app.js content

Found while reviewing `the_sweep_frame_loop_does_only_per_frame_work`: re-running
`node apps/annotate/run_browser_check.mjs` (mock scene) several times in a row —
with **no change to any file** — intermittently fails:

```
FAIL  hovering a joint bead says what the joint is, and for a two-force member
      says its length and the convention its pose was built under
      {"beadAt":{"name":"pitch_link","x":811.56,"y":456.82},"tip":""}
```

`tip` comes back empty, i.e. the hover never registered on the bead. Confirmed
this is not a regression from this handoff's diff: swapping in the pre-handoff
`app.js` (from `integration`) reproduces it too, and three consecutive runs of
the **post-fix** `app.js` gave 2 passes and 1 fail on this exact check with
nothing else touched. The check (`apps/annotate/run_browser_check.mjs` around
line 348) projects the bead's 3D position to page pixels via `scene.camera`,
moves the mouse there, waits 150 ms, then reads `#sweep-tip`'s text — the 150 ms
wait or the projected pixel landing just off the bead's actual hit radius are
the two likely causes, but neither is confirmed.

## Done when

The check passes reliably across repeated runs (a longer wait, a wider/retried
mouse-move, or a documented tolerance), or the flake's actual cause is found
and fixed.
