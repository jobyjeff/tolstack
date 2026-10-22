---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md
---

# Design: the bind form's interface choices read as text inputs

The annotator's bind form now lets the reader choose which interface a face
is. Each choice is a `.bind-form .an__end` button with a plain 1px
`#4a515a` border and left-aligned text (`apps/annotate/style.css`). The
optional text inputs one row below have the same border, the same height and
the same text alignment. In
`docs/sessions/shots_20261021_a_face_pick_survives_an_orbit_and_names_its_end/1_mock_both_ends_open_no_default.png`
the two unchosen choices look like two pre-filled text fields. Nothing marks
them as a pick-one control: there is no radio dot and no hover hint until the
pointer is on one.

Only the chosen state is distinct (an orange border). With both ends open,
which is exactly when the reader has to act, neither choice looks clickable.

Possible directions, for whoever takes it: a radio indicator before each name;
a segmented-control look, with a filled background instead of an input-like
outline; or a hint on the "This face is" label ("choose one"). Keep the long
names wrapping, which the handoff requires.

Found in review of `a_face_pick_survives_an_orbit_and_names_its_end`. It is
judgement-call aesthetics, not a named-rule violation, so `low`.
