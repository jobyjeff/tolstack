---
type: feature
priority: low
status: open
area: viewer/element-record
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
---

# The element record says whether a binding is wanted, not which face is bound

The handoff's record was to carry "the binding state". The viewer's projections
hold no feature-identity events, so `apps/viewer/element_record.js` carries what
the page can know and nothing more:

- `binding.wanted`: whether the element still needs a binding
  (`VA.needsAnnotation`; for a node, no citation of its own);
- `binding.meshed`: whether its part has an installed mesh to bind on;
- `binding.params`: the way out to the annotator where both hold.

It does **not** say whether a binding already exists, which face, or whether that
binding is stale. That state lives in `data/inbox/feature-identity/` and is folded
by the annotator. As a result the Preview of a bound-but-untraced edge still offers
"attach to 3D" as if nothing were bound. The 3D anchor knows where it came from
(`AA.modelAnchorWords`: a bound face, a section, a body origin). The DAG dot and
the grid row of the same node do not.

## Options

1. **A projection field.** `scripts/build_topology_projection.py` folds the
   feature-identity events (`scripts/fit_bound_features.py` already reads the same
   log) into
   a per-node / per-edge `binding: {state, face, event}` block, and the record
   carries it. This is the simplest option for the record. The cost is that every
   bind needs a rebuild before the viewer shows it.
2. **The scene tells the page.** The annotator already folds bindings. It could
   post them with its anchors (`annotate:anchors` gains a `bound` map), and the
   record would read them while the pane is open. This is live, but it is absent
   whenever the pane is closed.

Recommendation: option 1. It is the same "built once, from the projections" rule
the record follows everywhere else. It also keeps the record identical whether or
not the 3D pane is open.
