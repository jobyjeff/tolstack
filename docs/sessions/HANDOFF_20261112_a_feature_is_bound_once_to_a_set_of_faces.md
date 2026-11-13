---
priority: high
depends_on: [a_part_links_to_its_drawing_before_it_has_a_tolerance]
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — a_feature_is_bound_once_to_a_set_of_faces: a binding attaches to a part's feature, not to a dimension's end; it may hold several faces; the existing log is read through, never rewritten

Source: Jeff, 2026-11-10, answering the strategy session's question 65: "agreed,
once per feature", and the same day: "We will need to support multi-surface
features at some point" with three cases (below). Jeff, 2026-11-12 (note
`20261112T114449_f3anmp`): "at what point is it going to be stable enough that I
can go through and bind all of them?" — this handoff is that point. Strategy
record: `dispatch/docs/strategy/HANDOFF_20261112_strategy.md`; the design is in
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
sections "65 answered" and "A feature may be several faces" — everything this
handoff needs from them is restated here.

Baseline: `integration` after the three handoffs staged the same day
(`a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown`,
`hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque`,
`a_part_links_to_its_drawing_before_it_has_a_tolerance`). **Read their lessons
first** — the bindings lesson says what it left for this one. Line numbers below
were read on `master` on 2026-11-12; function names are the anchors. Scope:
`tolerance_stack/feature_identity.py`, `tolerance_stack/feature_geometry.py`,
`tolerance_stack/model_view.py` (a feature's binding), `scripts/fit_bound_features.py`,
`scripts/propose_bindings.py`, `scripts/build_feature_identity_projection.py`,
`scripts/build_contact_suggestions.py` only as far as its key, `apps/annotate/`,
`apps/viewer/` (the feature body and status), `docs/ANNOTATION_SURFACE.md`,
tests. Do NOT change the DAG's or grid's layout, the model files' nodes and
edges, or the mesh cache.

**The real log is Jeff's work and it is immutable.** Nothing in
`C:\workspace\tolstack\data\inbox\feature-identity\` is edited, renamed, moved or
deleted, and no test writes there. "Migration" here means the **fold** reads old
events through a mapping; new events are written in the new shape. All writes
this handoff exercises go to a scratch data root.

## What exists (read 2026-11-12)

- An event's feature side is `stack_key = {kind: topology_edge, topology_id,
  edge_id}` plus `direction` (from / to) — **an edge end**. Its face side is
  `geometry_key = {source_step_sha256, face_id, area_native2, centroid_native}`
  — **one face** (`tolerance_stack/feature_identity.py:179-262`). 78 events on
  2026-11-12: 15 bound, 53 proposals open, 1 rejected; keys are split between
  topology ids `vpa_pitch_linkage` and `vpa_end_stop_v2` (v2 reads v1's ids
  through `ids_from`, `tolerance_stack/model_view.py:231-233`).
- The model already has the feature: a node on a part is `<part>@<node>`
  (`model_view.py:148-161`); a node two parts share is two features.
- Consequence today: the hub's locating boss is the starting end of four hub
  dimensions and of the pilot fit, so it is picked once per dimension, and two
  picks can disagree.
- `scripts/fit_bound_features.py` fits one face to a nominal (a sphere centre, a
  bore axis) per assembly occurrence, for the solver in the `linkage` repo.
- Proposals (`scripts/propose_bindings.py`) and contact suggestions are keyed by
  edge end too.

## Deliverables

1. **The key is the feature.** A new event shape (the next schema version of
   feature identity; name it in `docs/ANNOTATION_SURFACE.md`) whose subject is
   `{model topology id, part, node}` and whose geometry is **a list of faces**
   (each the present `geometry_key`), with the verdict vocabulary unchanged
   (including the retraction the bindings handoff added). Every reader —
   status, the feature body, the pane's marks, proposals, contact suggestions,
   `fit_bound_features.py` — asks for a feature's binding; none asks for an
   edge end's.
2. **Old events fold through, by rule, with nothing lost.** The fold maps each
   old edge-end event to its feature (edge end → node → the edge's part → the
   feature). Where several old events land on one feature:
   - same face → one binding;
   - different faces that share a surface (coaxial with equal radius, or
     coplanar; the tolerance is a named constant with its measured basis) → one
     binding holding the set;
   - different faces that do not → **a disagreement**, shown on the feature
     ("2 faces disagree") with each face hoverable and a **Keep** action on
     each; nothing is chosen silently, and until Jeff keeps one the feature
     reads `suggested`, not `bound`.
   An old event whose edge or node no longer exists stays in the orphan line the
   bindings handoff added. The fold's summary line states, from the real log:
   features bound, features holding a set, disagreements, orphans — and the
   lesson carries that line.
3. **A pick may take several faces.** Jeff's three cases:

   | Case | Example | What the tool does |
   | --- | --- | --- |
   | One surface the STEP file split | a cylinder exported as two arc segments | swept in automatically — picking one face takes its siblings on the same underlying surface (same axis and radius, touching); never a question |
   | A real feature that is interrupted | the gas-spring bushing seats: two coaxial seats, one datum; several coplanar feet | offered as a group when the picked face has like faces on the same surface that do not touch; Jeff's click confirms the group or keeps the one |
   | A pattern | a hole pattern (fastener clocking) | **not in this handoff** — the event shape must be able to hold it (N like faces), the pattern fit is a later handoff; file it |

   The feature body lists the faces of a set ("3 faces"), each hoverable; Correct
   re-picks the whole set; a face can be removed from a set.
4. **One fit over the set.** `fit_bound_features.py` fits one nominal through
   all of a feature's faces (one cylinder through both seats, one plane through
   all the feet). Its output keeps the shape the `linkage` repo reads; if a
   field must change, version it and say so at the top of the lesson — do not
   edit `linkage`. Re-run the fit on the real log (read-only inputs, output to
   the main checkout's projections as the rebuild rail does) and compare every
   nominal that existed before: unchanged, or changed with the reason.
5. **Proposals follow.** `propose_bindings.py` proposes on a feature; the 53
   open proposals fold through the same mapping and stay open.

## Definition of done

- On the real log, read-only: the fold's summary line; every one of the 15
  bindings accounted for in a table (old key → feature → faces → state).
- On a scratch copy, in the browser on v2: bind the hub's locating boss once and
  see all five ends that use it read bound; pick one half of a split cylinder
  and see its sibling taken; pick one gas-spring bushing seat and accept the
  offered pair; create a disagreement from two old-shape events and resolve it
  with Keep. Shots at 3840×2160, each looked at, in
  `docs/sessions/lessons/shots/<slug>/`.
- The fitted nominals' before/after table; the kinematic study still builds.
- The exploratory click-around the repo requires for a viewer change.
- Tests: value-level for the mapping (each of the three collision outcomes), the
  shared-surface rule's threshold, the set fit against a known cylinder and
  plane; default `pytest -q` once; the two fast node tiers; the browser runner
  with `--only` for each suite added or changed; the witness runner with
  `--only` for each spec added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_a_feature_is_bound_once_to_a_set_of_faces.md`):
  the summary line and the two tables; any disagreement in the real log Jeff
  must settle, named; one sentence Jeff can act on: "bind them all now", or
  what still stands in the way.
