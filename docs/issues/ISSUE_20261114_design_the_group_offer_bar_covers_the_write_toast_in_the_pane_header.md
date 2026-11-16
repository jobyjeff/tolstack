---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
defer_until: 2026-12-15
resolution: deferred 2026-11-15 (triage) -- low defers by default
class: merged_page_walk_20261112
---

# The group offer covers the write toast in the binding pane's header

Shot `docs/sessions/lessons/shots/a_feature_is_bound_once_to_a_set_of_faces/round3/04_bushing_seat_group_offered.png`
shows the problem. The armed pick's group offer is `#an-offer`: "4 like faces
on this surface · Take all 4 · Just this one". It sits on top of the toast for
the previous write, which reads "Bound locating bo…" and is cut off under the
offer. Both share the pane's top line.

Nothing is lost: the toast is transient, and the offer is the thing to
answer. But a reader who binds two features in quick succession cannot read
what the first bind wrote while the second offer is up. Either stack the two,
or let the offer replace the toast.
