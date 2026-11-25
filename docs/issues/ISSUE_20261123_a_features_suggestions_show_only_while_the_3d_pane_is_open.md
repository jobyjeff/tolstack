---
type: bug
priority: med
status: deferred
area: viewer/nav feature body
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md
class: unsurfaced_or_buried_signal
defer_until: 2026-12-09
resolution: deferred 2026-11-25 (triage) -- med beyond BUDGET=3
---

# A feature's suggestions show only while the 3D pane is open

Jeff, note `20261122T211136_iubdsx`: "Got to the pitch plate, and none of those
(at least the first few that I checked) seem to have any suggestions yet."
Thirteen of those ends had a contact row in the served projection at the time.

**Reproduced 2026-11-23** on a scratch root (this handoff's walk, shots
`docs/sessions/lessons/shots/a_seat_and_a_pattern_get_contact_suggestions_too/`):
open v2, expand 215177-001 > 215735-001 in the nav, click "pitch link straight
bushing bore". With the 3D pane closed the feature row opens to the preview
only: no twisty, no "not bound", no suggestion line (`01_no_pane_straight_bore.png`).
Open the pane (the 3D tab) and click the same row: "2 faces · round ·
r 4.2600 … fits the mating pin · Take" (`02_pane_open_straight_bore.png`).

**Cause.** The nav's feature body (`apps/viewer/views/nav.js`,
`VA.featureBodyPlan`) reads its suggestion lines from `tree.mates`, which only
the embedded annotator posts (`apps/annotate/app.js` `treeMates` in
`postEmbedTree`). No pane, no tree message, no lines. The rows themselves
are in the page's own data: `contact_suggestions` is inside
`projections/viewer/kinematic/annotate.json`, so the shell could list contact
rows without the pane (a Take still needs the pane, or the shell's own write
path).

**Why not fixed here.** The handoff fenced `apps/viewer/` and how the tree
and its buttons behave (the binding pane redesign is with Jeff:
`the_tree_sits_beside_the_3d_canvas_and_holds_still` and its chain). That
chain moves the tree into the 3D pane, which may dissolve this on its own; the
question for it is whether a feature's suggestions must ever be visible with
the 3D view closed. Recommendation: list the contact rows from the page's own
data and grey the Take until the pane is up, so a reader is never shown
"nothing" for a feature that has rows.
