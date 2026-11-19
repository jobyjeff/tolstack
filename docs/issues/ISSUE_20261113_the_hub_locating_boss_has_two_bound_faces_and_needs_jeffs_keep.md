---
type: chore
priority: high
status: resolved
area: feature-identity
reporter: agent
needs: jeff
ask: In the binding pane, press Keep on the hub's locating boss -- face 3460 (the 95 mm bore) or face 144 (the 215.9 mm boss)
found_by: docs/sessions/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
todo: 20261115T182758_vx7y2v
resolution: done by Jeff 2026-11-16: event 0079_hub_spindle_bore_axis_kept binds face 144; the rebuilt bindings.json no longer folds hub@hub_spindle_bore_axis to a disagreement (triage 2026-11-19)
---

# The hub's locating boss has two bound faces, and only Jeff can keep one

Since `a_feature_is_bound_once_to_a_set_of_faces`, a binding is per feature.
The real feature-identity log folds to one disagreement:
`hub@hub_spindle_bore_axis`.

- 2026-11-06, v1's spindle coaxiality start: **face 3460**, a Ø95 cylinder
  (r 47.5).
- 2026-11-12, v2's pilot fit start: **face 144**, a Ø215.9 cylinder
  (r 107.95).

They are coaxial, but they are not one surface. The node is an axis, and
either face realises it. Which one is the datum is an engineering call.

Until one is kept:
- the feature reads *suggested*, not bound, at all five ends that use it;
- `fit_bound_features.py` leaves it unresolved (reason `disagreement`), so
  linkage gets no fitted axis for it.

Pressing **Keep** under the hub's locating boss in the nav tree writes the
binding. This needs the batch merge that brings this handoff to trunk first.
It is the one thing the handoff's lesson names as standing between Jeff and
"bind them all now".

## 2026-11-19 triage sweep -- Keep pressed

Event `0079_hub_spindle_bore_axis_kept.json` (2026-11-16T03:29:45Z,
`annotate-app:jeff`) binds `vpa_pitch_linkage` / `hub` /
`hub_spindle_bore_axis` to face 144. The main checkout's
`data/projections/feature-identity/bindings.json` holds one disagreement, and
it is `pitch_plate_215177_001@pitch_plate_link_attach_bore`, not this one. The
todo (`20261115T182758_vx7y2v`) is stale and can be withdrawn.
