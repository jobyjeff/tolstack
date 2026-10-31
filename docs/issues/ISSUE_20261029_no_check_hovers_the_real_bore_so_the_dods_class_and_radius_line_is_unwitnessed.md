---
type: bug
priority: low
status: deferred
area: tests/browser
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
class: dod_line_not_shown
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# No check hovers the real bore, so the DoD's "class and radius in the state line" is unwitnessed end to end

The handoff's definition of done says: hovering `hub blade-1 root bearing
bore` "pre-highlights it with its class and radius in the state line". Here is
what the tiers check today:

- The `[real]` reproduction (`scripts/run_viewer_browser_tests.mjs`, "[real]
  Pick on hub blade-1 root bearing bore …") checks arming only: the pose, a
  solid hub, the others faint. It neither hovers nor binds.
- The mock check matches `/^face 1( · |$)/`, so the class and radius may be
  absent and it still passes. The mock triangle has no curved face to fit.
- `AA.preselectWords` is unit-tested in the fast tier, on hand-made input.

There is also a race the tests can't see. `cmdArm` starts
`ensureFaceClasses(...)` without awaiting it. `onPreselect` reads
`state.faceClasses` at hover time and is never re-run when the classes
arrive. So a hover that lands before classification finishes reads
"face N" alone until the pointer moves to another face.

Fix: in the `[real]` reproduction, hover the bore's face (after the classes
resolve), assert the line carries a surface word and an `r … mm`, then `arm
off`. Never click there, because that suite reads the real inbox. Separately,
refresh the armed line when `ensureFaceClasses` resolves.
