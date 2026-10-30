---
type: feature
priority: low
status: open
area: viewer/preview
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
---

# The Preview has no "this part on its own in 3D", which the component card had

The grid's merged component cell used to open a component card. For a part with
an installed mesh, that card offered **view this part in 3D →**: the annotator
opened with that part isolated (`{topologyId, part}`). The card retired on
2026-10-30, when the hover popups were replaced by the Preview, and its
affordance went with it.

What is left:

- the 3D pane follows the selection, so clicking any row of the part opens the
  scene on that row's edge (`VA.annotateParamsFor`);
- an untraced edge's Preview offers **attach to 3D (part)**, which isolates the
  part, but only where a binding is still wanted.

So a traced part has no one-click "show me just this part". The question is where
that action belongs now:

- on a node's Preview, beside each side's part name;
- on the merged component cell itself, as a click (it selects nothing today);
- or nowhere, because following the selection is enough.

Recommendation: a quiet per-side button in a node's Preview, gated on
`record.sides[i].meshed`. That is where the part is named.
