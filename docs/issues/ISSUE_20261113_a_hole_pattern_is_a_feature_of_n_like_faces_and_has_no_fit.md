---
type: feature
priority: med
status: deferred
area: feature-identity/fit
reporter: agent
found_by: docs/sessions/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
defer_until: 2026-11-29
resolution: deferred 2026-11-15 (triage) -- med beyond budget; the 11-12 chain rule allows one viewer handoff at a time, and most of these are inputs to the strategy session's map handoff (REVIEW_20261112_the_merged_page.md)
class: feature_model_gap
---

# A hole pattern is a feature of N like faces, and nothing fits or offers it yet

Jeff's third multi-surface case (handoff `a_feature_is_bound_once_to_a_set_of_faces`,
the table under deliverable 3): a hole pattern -- the tangential link mount's
fastener clocking -- is one feature made of N like faces on DIFFERENT
surfaces (parallel bores on a bolt circle). The handoff fenced it out.

What exists now: a `feature-identity/v1` event holds any number of faces of
one mesh (`geometry_keys`), so the shape can already carry a pattern.

What is missing:
- the pick does not offer a pattern (`AA.surfaceSiblings` offers only faces on
  the SAME surface; holes of a pattern are separate surfaces --
  `feature_geometry.same_surface` refuses the 5.5 bolt circle by design);
- `feature_geometry.fit_face_set` fits one surface through all faces, which
  is wrong for a pattern: a pattern's nominal is a circle of axes (centre,
  radius, clocking angle), not one cylinder -- it returns `other` today when
  the faces are not one surface only if their classes differ, so a pattern of
  bores would be fitted as one (bad) cylinder. Until the pattern fit exists,
  `fit_face_set` should refuse a set whose faces are not pairwise
  `same_surface` (left as is: no pattern can be bound through the UI yet);
- the feature body has no word for a pattern.
