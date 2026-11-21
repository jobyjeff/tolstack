---
type: bug
priority: low
status: open
area: viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack.md
---

# An outline's name crossed by a route raises no map note

On model v2's map after `the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`
(shot `docs/sessions/lessons/shots/the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack/map_3840_pitch_plate_region.png`,
lower right), the pitch link assembly's outline name "213862-002 pitch link"
and the bearing's "MS14101-3 spherical bearing, pi…" are struck through by
the route of `pitch_link_upper_inner_race_clamp_seat` (the straight bushing's
end on the race). The map's notes (`apps/viewer/map.js`, `VA.mapRouteNotes`
and the outline checks) cover "a name with no corner clear of another" name,
but not a name crossed by a route. So the layout scorer agents use reports
zero notes for a layout where a name is struck through. A box's name already
keeps clear of its own jumpers and pins (`placeName`); an outline's name has
no such rule.

Fix shape: an outline's name tries its corners against routes as well as
names (top-left, then top-right, as today), and a note fires where none is
clear. Then the v2 layout is re-scored.
