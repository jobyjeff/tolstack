---
type: bug
priority: med
status: resolved
area: annotate/sweep-rail
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
handoff: docs/sessions/HANDOFF_20261105_the_annotator_reads_a_nodes_declared_face.md
resolution: handoff completed 2026-11-05 -- closed automatically by dispatch when handoff `the_annotator_reads_a_nodes_declared_face` moved to completed/; not independently verified.
---

# The annotator does not read a node's declared `face`

Since 2026-11-03 a topology node may declare `face: {part, surface}`. The
schema is `tolerance_stack/topology.py`'s `NODE_FACE_FIELDS`, and
`docs/DAG_TOPOLOGY.md` ("Which face an end is") documents it.
`scripts/build_contact_suggestions.py` and `scripts/propose_bindings.py` both
read it first. The topology projection's node rows carry it, along with
`hardware_ref`. The handoff fenced the apps, so the browser still guesses:

- `AA.pickEndPartIds` (`apps/annotate/sweep.js`) still arms on `node.part`
  or `parts[0]`.
- `AA.endSurfaceClass` still classes an end by its words.
  `pitch_plate_spindle_bore_axis` has been named "pitch plate pilot boss
  axis" since 2026-11-03, and that name has no shape word. So its
  suggestions colour nothing, even though it is declared `cylindrical`.

**Failure scenario:** after the batch merge and a projection rebuild, the plate
end's row suggests no faces. The proposer and the contact engine both treat
that end as a cylinder. Two surfaces then disagree about the same end, which
is the class of defect that moving `SUGGESTION_RULE_WORDS` into Python was
meant to end.

**Fix shape:**

- `AA.pickEndPartIds` takes `node.face.part` first.
- `AA.endSurfaceClass` takes `node.face.surface` before the words. This
  mirrors the `where: "declared"` case that
  `feature_geometry.end_surface_class` gained.
- Pair the JS against the Python, the way `tests/test_feature_geometry.py`
  already pairs the word rule.
