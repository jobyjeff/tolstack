---
type: bug
priority: low
status: resolved
area: viewer/nav feature body
reporter: agent
found_by: docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md
---

# The shell's mate lines cannot show a suggestion without a Take

`apps/viewer/views/nav.js`'s `VA.featureBodyPlan` gives every row of the
pane's `mates` feed a Take. Since 2026-11-21 a contact row whose part's place
is not known (`AA.contactRowPlaced`) must never be a Take, so
`apps/annotate/app.js`'s `treeMates` leaves such rows out of the feed: the
shell's feature body shows "not bound" and Pick a face for that feature
rather than the row with "place not known". The pane's own list (and the
shell's mirror of it, when the feature is "suggested") does show the row with
the phrase and no Take.

Reachable today only on v1 (the two `214820-002` bushings and the two
`NAS1149V0332` washers share a mesh and declare no occurrence); every v2
shared-mesh part is placed. Fix shape: carry `placed` on a mates row and have
the plan omit its `actions` and append the phrase to `sub`. The viewer was
fenced out of handoff `a_take_on_a_lug_feature_binds_that_lugs_own_face`.

## Addendum 2026-11-23 — resolved

Fixed by editing_a_feature_opens_its_form_where_the_tree_was: the feature body and its mate lines are gone. Every suggestion is a line under the set in the feature's form, with why, and a click puts it in the set; nothing has a Take.
