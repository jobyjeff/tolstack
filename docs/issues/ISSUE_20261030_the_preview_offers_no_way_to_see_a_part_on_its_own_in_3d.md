---
type: feature
priority: low
status: deferred
area: viewer/preview
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
class: preview_reach
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
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

## Addendum 2026-11-03 (every_study_opens_in_3d_showing_only_its_parts)

The pane now has a part-set filter, `isolate parts <part…>` (`docs/ANNOTATION_SURFACE.md`),
so a one-part scope is one command. Nothing offers it yet: this issue's question —
where the control lives (a node Preview's per-side button, the component cell, or
nowhere) — is unchanged and still the open design call. Not resolved by that handoff.
