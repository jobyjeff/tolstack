---
priority: high
depends_on: [the_first_end_of_a_joint_offers_the_contact_faces_the_pane_already_holds]   # chain order only: that handoff and the one before it edit apps/viewer/topology_app.js and the browser suite
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — a_map_pin_faces_each_partner_and_no_two_routes_share_a_run: on the map a feature gets a pin toward each partner, and no two routes run on top of each other

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19), reviewing the
merged page: "multiple edges coming out of one node, the flanged bushing pitch
link has an edge (bore to pitch link bore) that passes through the bushing
part, takes a u-turn, and then connects back to itself, and has a node (boss
in a bore) in the middle of the part. Lots of edges overlap each other for
parts of their length and then diverge, which makes it look like there are
extra branches with no nodes." His three screenshots (read them first):

- `C:\workspace\forge\data\inbox\atomic-notes\attachments\20261119T142516_ci28ci\paste-20261119T134821.png` (the pitch plate region)
- `…\paste-20261119T141226.png` (the U-turn at the pitch link's flanged bushing)
- `…\paste-20261119T141321.png` (one pin, two routes, on the tangential link's flanged bushing; his red question marks)

This is link 1 of a chain of seven that ends on a review page (the walk,
`the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page`).
Links 4 and 5 re-author the model round the links and the pitch plate, so
this handoff fixes the drawing rules, not the model.

Baseline: tolstack `master` at `ccfe4926` plus the two handoffs ahead of this
one. Scope: `apps/viewer/map.js` (`VA.mapLayout` and its helpers),
`apps/viewer/views/map.js` only where a pin's hover or lighting must follow,
their fast tests in `apps/viewer/tests.js`, the map suites in
`scripts/run_viewer_browser_tests.mjs`, witness specs for guards you add or
change, `docs/DAG_TOPOLOGY.md` "The map". Do NOT touch the topology JSON
(`docs/topologies/topology_vpa_end_stop_v2.json`) or
`docs/topologies/map_vpa_end_stop_v2.json`'s `places`, `tolerance_stack/`,
`apps/annotate/`, the grid, or the Groups control.

## What the code does today (read 2026-11-19, `apps/viewer/map.js`)

- One pin per feature, on the side facing the counterpart of the feature's
  **first** interface only (:520–525). Every other interface of that feature
  leaves through the same pin and the same 30-unit stub, then diverges. That
  is the "branch with no node". Four features in v2 have two interfaces:
  `pitch_plate_link_attach_bore`, `pitch_plate_tan_link_attach_bore`,
  `pitch_link_flanged_bushing_bore`, `tan_link_flanged_bushing_bore`.
- `pitch_plate_tan_link_attach_bore` meets the tangential link on its left
  and the bushing on its right; the pin is on the left because that edge
  comes first in `edges[]`, so the other route runs back across the part's
  own box. The 11-18 lesson says the edge order was chosen to get that.
- A child with no place sits under its parent in the same cell; an interface
  between the two gets "bottom" pins on both (:210), the route leaves the
  child's bottom and bends back up through the child's box, and the symbol
  lands on the child (`symbolPoint`, :408).
- No layout note fires for any of it: the "routed through" check exempts the
  two end parts' boxes (:775–780). No test counts shared runs.
- `docs/issues/ISSUE_20261118_a_map_feature_with_partners_on_two_sides_crosses_its_own_box.md`
  (deferred to 12-19) names two of these and two fix shapes.

## Deliverables

1. **A pin toward each partner.** A feature whose interfaces face different
   sides has a pin on each of those sides; a route never crosses the box of
   the part it starts or ends on beyond its own stub. Hovering or selecting
   the feature lights all of its pins, and each pin still names the one
   feature. A pin's side never depends on the order of `edges[]`: the same
   model with its edges shuffled draws the same map.
2. **No two routes on one run.** Routes of different interfaces never share
   a collinear run. Where two interfaces of one feature face the same side,
   they leave from separate pins or as visibly separate lanes from the first
   pixel; nothing reads as one line that forks.
3. **No route doubles back.** A route between two boxes in the same cell, or
   between a child and its parent, takes the short way between facing sides;
   an interface's symbol sits on the route between the two boxes, never
   inside a box.
4. **The notes say so.** `geo.notes` gains a note for a route crossing a box
   it ends on beyond its stub, and one for two routes sharing a run, so the
   existing checks that hold v2's notes at zero (`[real]`,
   `scripts/run_viewer_browser_tests.mjs` :3296–3299) cover both. The real
   wrong outcome these two would have caught: the merged page of 2026-11-19,
   Jeff's screenshots above. They fire in tests and on an agent's layout
   scoring, never at Jeff.
5. **v2 as it stands draws clean** under the new rules with its `places`
   unchanged: zero notes, no route through a box, no shared run. If a clean
   drawing needs a `places` change, say which in the lesson and leave the
   file alone (link 5 re-places that region).
6. **Look at it.** Shots of the pitch plate region and the whole map, before
   and after, at 3840 Side by side and at 1536 wide, beside Jeff's three
   screenshots; hover each of the four two-interface features. Read every
   shot before writing the lesson.

## Definition of done

- Fast checks, value-level, on fixtures: a feature with partners left and
  right has two pins and neither route enters its own box; two interfaces
  of one feature toward one side do not share a run; a child joined to its
  parent has its symbol between the boxes; shuffling `edges[]` leaves every
  pin and route where it was; each new note fires on a fixture built to
  break its rule.
- `[real]`: v2's map has zero notes and the drawn counts still equal
  `model.counts`.
- Tiers as the repo's `CLAUDE.md` table says for a tactical session. A
  witness spec for each guard added.
- `ISSUE_20261118_a_map_feature_with_partners_on_two_sides_crosses_its_own_box`
  is resolved by this handoff.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_a_map_pin_faces_each_partner_and_no_two_routes_share_a_run.md`):
  the rule a pin's side now follows, in two sentences; the before and after
  shots; any drawing of v2 the rules still get wrong, with its shot.
