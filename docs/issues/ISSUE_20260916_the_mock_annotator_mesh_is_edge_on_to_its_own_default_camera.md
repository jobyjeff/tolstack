---
type: bug
priority: low
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect.md
class: fixture_never_checked_against_the_view_that_renders_it
defer_until: 2026-11-28
resolution: woke 2026-10-29 -- date trigger passed; re-triage -- triage 2026-10-29: still low, deferred again by default to 2026-11-28
---

# The annotator's `?mock=1` demo mesh renders as a hairline — it is edge-on to the camera that frames it

`apps/annotate/fixtures.js` ships one synthetic mesh so the 3D pane has
something real to raycast against with no rotorkit dependency. Its three
vertices are

```
(0, 0, 0)  (1, 0, 0)  (0, 1, 0)
```

— a triangle lying flat in the **z = 0** plane.

`AnnotateScene.frameParts` (`apps/annotate/scene.js`) places the camera at

```
center + UP_AXIS * (size · UP_AXIS) * 0.3 + BACK_AXIS * dist
```

With `UP_AXIS = +Z` and `BACK_AXIS = -Y`, and `size.z === 0` for a flat
triangle, the elevation term vanishes entirely and the camera lands at
`(0.5, -51, 0)` looking along **+Y**. The triangle is therefore viewed **exactly
edge-on**: it renders as a hairline, and there is no camera state the demo
arrives in from which it looks like a surface.

## Why it matters, and how it was found

Measured while adding the browser tier's face-deselect checks
(`scripts/run_viewer_browser_tests.mjs`, `[annotate rail filter + face
deselect]`, 2026-09-16). A ray aimed at the face's own manifest centroid
**grazes** the triangle rather than crossing it, so `scene.pick()` at the
projected centroid answers `true` or `false` depending on whether the
y coordinate comes out of the projection as `0` or as `1.3e-16`:

```
evaluate before the click:  ndc [-0.0065689686514340435, 1.3231871098197712e-16]  hit true
inside the pointerdown:     ndc [-0.006568938610600483,  0                     ]  hit false
```

That is not a defect in `pick()` — it is a degenerate target. The tier orbits
the camera to face the triangle before it clicks, and says so; nothing in the
product needed changing for it.

The reader-facing half is the one worth fixing: someone opening
`apps/annotate/index.html?mock=1` to see what this surface does is shown a line.

## The fix, and what it would touch

Give the triangle a plane the default camera faces — `(0,0,0) (1,0,0) (0,0,1)`,
i.e. the **XZ** plane — or give it a non-zero extent on all three axes so
`frameParts`' elevation term has something to work with. Either way
`meshManifests[DEMO_SHA].faces[0].centroid_native` moves with it, and so does
the `centroid_native` on the fixture's own bound event
(`featureIdentityProjection.stack_keys[0].bindings[0].geometry_key`), which
several checks in `apps/annotate/run_tests.cjs` read. Not done here: it is a
fixture change with a pinned blast radius and nothing in this handoff depended
on it.

## Addendum 2026-10-21: five reds in a row, mid-registry, under the new CPU cap

The review of `browser_runners_take_the_slot_and_free_the_box` ran
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --full`
from 19:00 to 20:15 and got **256/261**. All five misses were
`annotate rail filter + face deselect` clean runs that were red on this one
sub-check, "a real click on the face tints it". Those clean runs were
consecutive (entries `65435fcd`, `148e0e1f`, `298e017c`, `2c2e291c`,
`ecfb1a63`). Straight afterwards, the suite was green alone (34/34), and each of
the five entries replayed with `--only <id>` was green and WITNESSED.

So this flake no longer shows up as a single red that a replay clears. During
the full registry run it held for about five consecutive suite runs and cost
five witnesses. Whatever the timing component is, it may be larger now: since
that handoff, every runner's Chrome is in a job hard-capped at 4 cores
(`scripts/browser_runner.mjs`, `BROWSER_CORES`), so SwiftShader frames are
slower under machine load. The batch merge's `--full` run is where this will
next read as "an enrolled guard that no longer reddens". Replay the misses with
`--only` before treating them as decayed.
