---
type: chore
priority: low
status: open
area: tests/propose_bindings
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
---

# The proposer's declared-face refusals are tested only by a source grep

Since 2026-11-03, `scripts/propose_bindings.py`'s `check()` reads a node's
declared `face`. It refuses a face on any part other than `face.part`
(`wrong_part`), and a face of any class other than `face.surface`
(`wrong_shape`, "its declared face").

The one test of that wiring is the second half of
`tests/test_topology.py::test_the_contact_builder_and_the_proposer_read_a_declared_face`:

> `assert "node.face_surface" in source and "node.face_part" in source`

That is a text match over the script. It still passes if the two names stay
in the file but stop deciding anything, for example
`end_parts = list(node.parts or [])  # node.face_part`. It also says nothing
about the refusal a reviewer cares about: a face on the *other* part of a
two-part node with a declared face (`pitch_plate_pilot_in_piston_id`, whose
face is on the plate and not on the piston) must come back `wrong_part`.

The contact-builder half of the same test is behavioural (it calls `_end`
with a stub store), and `tests/test_propose_bindings.py` already builds a
data root and runs `check()`. So the fix is two cases there: a declared-face
node that refuses the other part's face as `wrong_part`, and one that refuses
a wrong-class face as `wrong_shape` with "its declared face" in the message.
Then delete the substring assertion.
