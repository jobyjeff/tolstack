---
type: bug
priority: med
status: triaged
area: annotate/form
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
handoff: docs/sessions/HANDOFF_20261125_a_write_from_the_form_or_the_menu_never_vanishes_without_a_word.md
---

# A tick that answers two proposals leaves a binding without its note and modifier

`AA.planEditCommit` (`apps/annotate/binding_state.js`) writes the set once
through `AA.buildFeatureSetEvent`, which carries what was recorded about the
feature (note, GD&T modifier, owner part, regime, composition note) over from
the binding it supersedes. When the set answers more than one open proposal,
each further answer is one more `bound` built by `AA.buildBoundEvent`, and it
supersedes the one before. Those later events carry none of those fields. The
last of them is the binding that stands, so the fields are gone from the
feature after the tick.

Measured by the review (2026-11-24) with a scratch log: a binding `b1` with
`note` and `gdt_modifier: "M"`, four open proposals on its face, one of them
dismissed. The JS plan wrote `rejected`, `tick` (note and `M` carried),
`tick-ratifies-2` and `tick-ratifies-3` (neither). The Python fold
(`build_projection(events, load_models())`) loaded the log with no proposal
open. The one standing binding, `tick-ratifies-3`, has `note=None` and
`gdt_modifier=None`.

How much this matters today: none of Jeff's 116 events carries those fields
on a binding (only one agent proposal has a `note`). The form also has no
field to write them. So this is latent, but it loses data silently the first
time a binding holds one.

Fix shape: build each further answer from the event before it, as a
correction (`AA.buildCorrectionEvent(prev, more)`) or by copying the carried
fields. Add an annotate fast check that round-trips a noted binding through a
two-proposal tick.
