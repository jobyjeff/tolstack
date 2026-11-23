---
priority: high
depends_on: [a_seat_and_a_pattern_get_contact_suggestions_too]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map: re-arrange v2's map so each lug's stack is one straight line and each link reads as a two-force member

Source: Jeff's note `20261122T211136_iubdsx` (2026-11-22), whole on the map:

> 2d graph view looks pretty good as well, I couldn't see any errors in the
> topology. Could probably use another small pass at re-arranging/redrawing
> the boundaries since it is getting more busy with all the extra
> interfaces/DOFs. Particularly the area around the pitch plate and link
> attachments is a little cramped. The radial stack from inner race, to bolt,
> to bushing, to plate takes a somewhat meandering path, would be more
> intuitive to understand if those elements were lined up. Same with the
> tangential link- it's a linear two force member so it would be easier to
> understand visually if the elements were lined up in a row, and the
> tangential link in particular really forces the entire map to have a lot of
> empty space in the middle due to the way it's drawn. Minimizing line
> crossings whenever possible is also helpful.

Baseline: trunk with the links ahead merged (v2 has one more edge than on
11-21: the pitch link lug's axial height, a jumper on the plate). Scope:
`docs/topologies/map_vpa_end_stop_v2.json`, `apps/viewer/map.js`,
`apps/viewer/views/map.js`, the map's styles and tests, `docs/DAG_TOPOLOGY.md`
("The map"). Do NOT touch: the topology's ids, nodes or edges; the nav tree;
`apps/annotate/`; the grid. Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

## Measured 2026-11-22

- The layout file is `places: {part: [column, row]}` only: 29 entries on 7
  columns by 10 rows, hand-authored. Everything else is computed in
  `apps/viewer/map.js`. There is no notion of alignment: integer cells, pins
  facing the partner's cell (`sideTowards`, about :224-230), routes of stub +
  45° + straight (`bend` :252-259, `route` :263-269). The diagonals come from
  cells that are not in line.
- The tangential link's five parts sit at (3,5), (2,5), (1,5), (1,6), (0,6).
  An assembly's outline is the axis-aligned union of its children's boxes and
  its own jumper lanes (`map.js`, about :1215-1216, :1243-1248), so its
  rectangle spans columns 0–3 across three districts. The pitch link is
  already one column, (6,5)–(6,9).
- A link's length (`tan_link_length`, `pitch_link_length`, whose `part` is
  the box-less assembly) is drawn by `map.js`, about :1007-1067: straight if
  clear, else `lanePast` (:1040-1051), a three-sided lane round the boxes,
  drawn as an ordinary jumper (`views/map.js`, about :352-361). The 11-19
  walk: "each link's length is a long lane that reads as another box".
- The page counts through-box, own-box, symbol-on-box and shared runs
  (`VA.mapRouteNotes`, about :553-581) and has **no crossing count**. Two
  sessions counted crossings with scratch scorers that are not in the repo.
  The 11-19 walk's count: one crossing on the whole map, hub ↔ tangential
  link mount, and two long diagonals in the plate district.
- What an arrangement must keep (each refuses or notes today): body
  rectangles do not overlap (:1196-1200), every box sits inside its district
  (:1202-1207), no outline takes in a foreign box (:1262-1270).
- Tests that pin v2's map: `tests/test_topology_map.py` (placed ids, not
  coordinates) and the browser suite `testTheMap`
  (`scripts/run_viewer_browser_tests.mjs`, about :3399: zero notes on the
  real model, fits its region, no jumper over a part's number or name, the
  outline notes).
- A box is teal on load and takes its body's colour only after the pointer
  passes over it
  (`docs/issues/ISSUE_20261120_a_map_box_wears_its_bodys_colour_only_after_the_pointer_has_passed_over_it.md`).

## Deliverables

1. **Each lug's stack is one straight line.** On both lugs, inner race, bolt,
   bushings and plate sit in one row or one column in the order the load
   passes through them, so the routes between them are straight and short.
2. **Each link is a row of five.** Inner race, outer race, machined link,
   outer race, inner race, in line, for both links, with the link's outline a
   narrow band rather than a rectangle across districts. If a straight
   outline cannot be had without breaking one of the three rules above, say
   which rule and show the nearest arrangement.
3. **A link's length is a plain dimension along the row**, end to end over
   its five boxes, reading as a dimension and not as a sixth box.
4. **The pitch plate and link attachment region has room**, and the empty
   middle of the map shrinks: the whole map's bounding area for the same
   content is no larger than today's, and the plate district's routes do not
   run closer together than the map's own spacing elsewhere.
5. **The page counts crossings.** `VA.mapRouteNotes` reports each pair of
   routes that cross (jumpers aside), the way it reports a shared run, so the
   count is the page's and not a scratch script's. It is a note, as the
   others are. Then bring v2's count to zero if an arrangement allows it,
   the hub ↔ mount crossing included; if not, the lesson shows the best
   found and why.
6. **A box wears its body's colour from the first paint** (the issue above),
   since every shot of this handoff would otherwise show it.

Search arrangements by script if that helps (keep the script in the repo
this time, beside the tests' debug tools, so the next arrangement does not
start from nothing), but the judge is your eyes on the rendered map, at both
sizes.

## Definition of done

- The map's suites green, the real model reporting zero notes with the
  crossing rule in; `tests/test_topology_map.py` green; the layout file's
  `provenance.arrangement` and `docs/DAG_TOPOLOGY.md` say what the
  arrangement is.
- Looked at with vision, from a scratch-root serve on a scratch port (never
  8000): the whole map and the plate-and-links region at 3840 and at 1536
  wide, beside the 11-19 walk's shots of the same framing
  (`docs/sessions/lessons/shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/`,
  `01_…`, `02_…`, `03_…`, `04_…`). With v2's study selected, its lit route
  still reads. Bodies, Assemblies and Parts each switched off once. Read
  every shot before citing it; say in the lesson what still looks untidy to
  you.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md`):
  before and after counts (routes, crossings, diagonals, bounding cells);
  the arrangements tried; which of Jeff's six sentences the page now meets,
  and which only partly.
