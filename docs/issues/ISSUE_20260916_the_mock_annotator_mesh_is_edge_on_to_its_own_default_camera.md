---
type: bug
priority: low
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect.md
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
