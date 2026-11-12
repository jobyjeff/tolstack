---
type: chore
priority: low
status: triaged
area: annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
class: one_affordance_two_places
handoff: docs/sessions/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
resolution: triage 2026-11-11 -- folded into the F1b fix-up handoff (same file; retire the button)
---

# The pane's hidden rail still wears a Pick button on contributor rows

The handoff removed the hover Pick / Re-pick button from the sweep rail's
joint-end rows everywhere, leaving the one pick action as the last row of each
end's list (`endPickAction`, `apps/annotate/app.js`). A **contributor** row
(a dimension edge under the rail's Contributors group, `contributorRow`) still
carries its `tree-row__repick` button -- "the jump to bind mode", since an edge
has two ends and no default between them.

No human sees it: the pane's own rail is laid out unseen while embedded, the
bare annotator URL redirects to the viewer, and a contributor row never
appears under a feature in the nav (it is keyed by edge, not by feature). The
browser tier reads it (`[real] every contributor row carries the Pick control
a feature row does`, `[real] re-pick on a bound feature leaves sweep mode...`
in the sweep rail suite). It is the one place the retired affordance still
exists in code; retire it with its two checks and their specs, or give a
dimension a body of its own in the nav where the jump can live as a row.
