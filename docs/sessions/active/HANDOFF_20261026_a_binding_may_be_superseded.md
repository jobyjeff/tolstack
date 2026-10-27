---
priority: med
depends_on: [the_rail_and_the_scene_point_at_each_other]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — a_binding_may_be_superseded: a later event names the earlier one it corrects, the fold hides it, history keeps it

Source: `docs/strategy/BRIEF_20261022_how_a_feature_binding_is_corrected.md`,
decided by the strategy session of 2026-10-26 (option 1 of the brief, in its
`supersedes:` form), from
`docs/issues/ISSUE_20261021_a_binding_written_at_the_wrong_end_has_no_correction.md`.
Baseline: `master` with `the_rail_and_the_scene_point_at_each_other` merged
(it reshapes the sweep rail; this handoff touches the bind form). Scope:
`tolerance_stack/feature_identity.py`, `scripts/build_feature_identity_projection.py`,
`scripts/fit_bound_features.py`, `tolerance_stack/feature_geometry.py` (if
the fold is read there), `apps/annotate/` **bind form and element rows
only**, `docs/ANNOTATION_SURFACE.md`, `CLAUDE.md` (one sentence under the
third load-bearing decision), `data/inbox/feature-identity/README.md`,
`tests/`, mutation specs. Do NOT touch the sweep rail's tree, the DAG, or
the spec library's parse events.

## The decision

- **A `bound` event may carry `supersedes: <event id>`**, naming an earlier
  event on the **same `(topology, edge)` key**. The verdict vocabulary
  (`VERDICTS = ("bound", "owner_not_in_set")`) does not change; no new word
  reaches `vocab.gen.js`. The schema stays `feature-identity/v0`: the field
  is optional and additive, and every existing reader that ignores it reads
  the superseding event as one more binding — which is wrong only in the
  projection, and the projection is what changes.
- **The fold hides the superseded event and keeps it**: the projection's
  bound list for a key excludes any event another event supersedes; the
  record gains `superseded: [...]` (the hidden events, in order) so a reader
  can see that a correction happened. "Two faces at one end" stays a
  legitimate state — two `bound` events on one key with no `supersedes`
  between them.
- **A correction may change the face, the direction, or both**, because it
  is a new `bound` event with its own `(sha256, face, direction)`. Flipping
  the direction is the one-click case of the general control.
- **General rule, implemented once.** The rule is written for every
  append-only stream in this repo (the spec library's parse events are the
  other one): a later event may name the earlier one it corrects; folds
  hide, history keeps. The spec library adopts the field the first time a
  parse event needs correcting — not in this handoff, and said so in its
  README.
- **Consumers fold the same way.** `scripts/fit_bound_features.py` and
  anything that turns bindings into fitted nominals read the projection (or
  the same fold function), so a superseded binding never produces a fit. The
  solver in the sibling repo reads `fits.json`, so this is the contract
  surface for it; name it in the lesson.

## What happened, so the test has a real case

On 2026-10-21 Jeff bound face 110 of the upper piston head (mesh `8899ea5d…`)
to `vpa_pitch_linkage` / `piston_head_upper_thickness` with `direction:
"from"`; the topology's node notes put face 110 at the step face, the edge's
`to` end. The form's direction dropdown had defaulted to `from`. The only fix
was deleting `C:/workspace/tolstack/data/inbox/feature-identity/0001_piston_head_upper_thickness.json`
by hand. The form no longer defaults (`a_face_pick_survives_an_orbit_and_names_its_end`,
merged 2026-10-22). The inbox holds only its README today.

## Deliverables

1. **Schema and fold** in `tolerance_stack/feature_identity.py`: the optional
   `supersedes` field, validated (must name an existing event on the same
   key; a dangling or cross-key `supersedes` is a loud load error naming both
   ids); `build_projection` hides superseded events and records them;
   `main` / the projection builder write it through.
2. **Fits follow the fold**: `fit_bound_features.py` reads only unsuperseded
   bindings; a test with a superseded event proves no fit is produced for it.
3. **The annotator offers the correction.** On a bound end, the element row
   and the bind form show **Correct this binding** (re-pick a face and/or
   choose the other direction; the write carries `supersedes`) and the
   one-click **Flip direction** Jeff asked for (same write, same face, other
   direction). The row shows the superseded history under a disclosure, in
   the UI-copy rules (no event ids on the surface; dates and faces).
4. **Docs**: `docs/ANNOTATION_SURFACE.md` (a "Correcting a binding"
   section), the inbox README (the field, the rule, the spec-library note),
   `CLAUDE.md`'s third decision gains one sentence, and the brief gets its
   `**CONSUMED 2026-10-26 — …**` marker (the strategy session writes the
   marker; you confirm the handoff name in it is yours).

## Definition of done

- `pytest -q` green with value-level tests: a two-event stream where the
  second supersedes the first projects one bound face (the second's) and a
  `superseded` list of one; a stream with two independent bindings on one
  key projects two; a dangling `supersedes` fails to load naming both ids;
  `fit_bound_features` over the first stream fits one feature.
- In the annotator (`?topology=vpa_pitch_linkage&edge=piston_head_upper_thickness`,
  mock data), binding a face then clicking Flip direction writes a second
  event with `supersedes` and the row reads the corrected direction with one
  history entry. Browser check in `run_browser_check.mjs`.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_a_binding_may_be_superseded.md`):
  the contract line for the solver repo (what `fits.json` now guarantees),
  and the exact shape of the field for the spec library's later adoption.
