---
type: bug
priority: low
status: open
area: annotate/form
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
---

# The feature's form names two split shoulders with the same words

On the tangential link mount's pilot bore, the form's two lines both read
"round · r 107.9754 mm · 9 segments" (`AA.editLineText`): two coaxial
shoulders of one radius, each split into nine segments. Only hovering a line
(which lights its ring in the scene) tells them apart. Jeff's sketch named
them "outer shoulder" / "inner shoulder". Shot:
`docs/sessions/lessons/shots/editing_a_feature_opens_its_form_where_the_tree_was/a2_pilot_second_shoulder_clicked_1536.png`.

A distinguishing word needs something the class records carry, for example
the position along the axis relative to the other line ("nearer the hub",
"z +6.8 mm"). Today they do not carry that in a form the form can read.

## Also: browser coverage the retired suites carried

Retiring the feature-body suites (2026-11-23) dropped three browser checks
whose code did not change: an armed side whose counterpart is bound pre-lights
the faces that mate with it (and ending the pick takes them down), the Parts
filter's count is the number of unbound features (and drops by one on a bind),
and the Preview shows a bound pattern's fit line ("10 holes Ø5.5 on a Ø240
circle"). The form suite (`a feature's form …`) could take them back on: the
form arms the same pick, and its tick is a bind.
