---
type: bug
priority: low
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_rail_and_the_scene_point_at_each_other.md
class: two_visibility_facts_one_control
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# The parts panel's checkbox cannot show an occurrence a body checkbox hid, and reads ticked while it is hidden

Found in review of `the_rail_and_the_scene_point_at_each_other` (2026-10-26).

In sweep mode the scene keeps two visibility facts apart (`apps/annotate/scene.js`,
`setVisible` → `userData.shown`; `setOccurrencesVisible` → `userData.hiddenKeys`),
on purpose: "showing a part never re-shows an occurrence a body checkbox hid".
The parts panel's row is the whole-mesh row (`buildPartRow` with no `scope`), and
its checkbox reads `scene.isVisible(sha)`, which is `shown` alone.

Sequence on P2: untick `blade` in the sweep rail (blade 1's pitch arm hides,
four stay). The parts panel's `215071-001` row still reads **ticked**, with the
count `×5` whose tooltip says *"drawn at 5 positions; the checkbox shows or hides
all of them"*. Untick then tick that row: four pitch arms come back, the fifth
stays hidden — the checkbox did not "show all of them", and nothing on the row
says one is hidden.

Smallest fixes, either one:

- the parts-panel row's checkbox reads `occurrencesShown` over every drawn key
  (indeterminate when a body hid some), and its `show` clears the mesh's
  `hiddenKeys` too; or
- keep the separation and change the tooltip/count so it does not promise "all".

Read from the code, not driven in a browser. A related pre-existing wrinkle the
fix should look at: `applySweepFrame` re-applies `setVisible(sha, layers.bodies)`
to every anchored mesh on every frame, so a parts-panel *hide* of an anchored
mesh is undone at the next frame while the run plays.

Leaving sweep mode already puts every hidden occurrence back (`leaveSweep`), so
this is confined to sweep mode.
