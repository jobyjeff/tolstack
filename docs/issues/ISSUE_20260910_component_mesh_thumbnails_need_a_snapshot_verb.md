---
type: feature
priority: low
status: open
area: apps/viewer
reporter: agent
audience: strategy
---

# Component cards: a mesh/annotator-rendered thumbnail needs a snapshot verb the annotator does not have

The component hover card (`viewer_hover_cards_and_deep_links`) derives its
thumbnail from a drawing crop of the part's own rows — the honest derivable
image today. The brief's other option, "a mesh/annotator render", is not
derivable from anything that exists:

- the annotator has **no snapshot/thumbnail verb** — `study_3d_flyout`'s
  lesson records the pieces (`scene.renderer.domElement` is a canvas
  `toDataURL` could read; `AA.exec` results are JSON-cloneable) and that the
  command layer is where such a verb should land, not a side channel;
- a generator would have to obey the everything-CLI rule: a rerunnable script
  writing into `data/projections/viewer/` through the projection-provenance
  gate (`scripts/projection_provenance.py` owns the writer list) — and
  tolstack's venv is stdlib-only, so the plausible shape is a Python CLI
  driving the existing headless-Chrome tier (which `study_3d_flyout` proved
  CAN render the three.js scene headless on this machine) rather than a
  Python mesh renderer;
- only one real part currently has an installed mesh at all
  (`gas_spring_mount_213668_002` via the alias table), so the payoff today is
  one thumbnail.

If built: annotator gains a `snapshot` verb (command layer), a generator
script renders installed meshes to PNGs + an index under
`data/projections/viewer/`, gets a `projection_provenance` stamp and an
ARCHITECTURE.md inventory row, and `VA.componentCard` prefers the render over
the drawing crop (or shows both). Until then a part with no crop-bearing row
gets no thumbnail — absent, never invented.
