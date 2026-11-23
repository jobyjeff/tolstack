---
priority: high
depends_on: [the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — the_walk_reads_the_v2_study_and_the_map_on_the_merged_page: walk the merged page against Jeff's 11-22 note and write his review page

Source: Jeff's note `20261122T211136_iubdsx` (2026-11-22), his two chat
messages of the same evening, and the six handoffs staged ahead of this one
(`the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds`,
`v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks`,
`v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets`,
`v2s_standard_parts_cite_their_spec_sheets`,
`a_seat_and_a_pattern_get_contact_suggestions_too`,
`the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map`). This is the
chain's last link and Jeff's review point: he reads one page and decides what
is next. No code changes here; a defect you find is an issue, cited by name
on the page. Write
`docs/sessions/lessons/REVIEW_20261122_the_first_study_on_v2.md`.

How to serve and what not to touch: as the 11-19 walk did
(`docs/sessions/lessons/LESSONS_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md`,
"How the tree was served" and "Traps for the next walk"): `integration` with
all six merged, projections rebuilt into a scratch data root under
`C:\workspace\tolstack\data\scratch\`, a scratch port, never 8000, never its
Rebuild. Jeff's log
(`C:\workspace\tolstack\data\inbox\feature-identity\`) is read-only to you:
count and hash it before and after; every bind of the walk goes into the
scratch copy.

The note, whole (every sentence is a row to check, or a row that says why it
has none):

> # binding
> tried binding the pilot bore for the tangential link mount. The pilot bore
> is actually the two shoulder faces for and o-ring gland, which is also
> split into multiple faces due to the way the part was radially patterned
> during creation. I was able to select a face on either of the shoulders,
> and it selected all the rest of the segments of that shoulder, however if I
> click "add a face" to add the second shoulder, the new selection replaces
> the old one. I need to select both. Same with gas spring mount bushing
> bores and the tangential link mount flanged bushing (there is an integral
> o-ring groove in the flanged bushing, so there are two shoulders)
> tan link mount fastener pattern: I selected one of the fastener holes, and
> it appeared to hilight the rest of the patterned holes, but the structure
> view gave zero feedback that nything was selected. Actually now I see it-
> the tiny little popup at the top of the canvas to confirm. needs to be more
> prominent
>
> The green circles/triangles seem confusing/inconsistent. For example piston
> cover flange shows blue empty circle (missing binding), then it's child
> 'piston cover flange to feather stop face' has a green circle, but it
> hasn't been bound yet, it only has suggestions. Then it's two children
> (piston cover flange and feather stop face) all have random triangles
> (empty blue, empty purple, and solid green). The face 3 (empty blue) and
> face 1080 (solid green) both say agent suggested, high. I see it now- the
> green one is bound. If the face is already bound/confirmed, then it's
> irrelevant whether it was agent suggested, or at least that information
> should be hidden behind some kind of progressive disclosure (tooltip,
> collapsible etc).
> MS14101-3 shows the ball center as not bound, yet the spherical surface is
> hilighted green. I'm re-selecting it, but this implies it is bound to
> something else already. OK- now I see a second instance of MS14101-3 (the
> outer race only) in the tangential link body, but this still doesn't
> explain the duplicate inner race.
> Main takeaway... I'm not sure anything is completely wrong/broken, but it
> still feels clunky and unintuitive. The way the menu jumps to a different
> scroll position is very jarring and disorienting, because the there's very
> little contrast between different layers/objects etc, so when it redraws
> and moves you lose your visual reference and it feels like the entire menu
> might as well have been replaced by something totally different until you
> figure out what you're looking at again. Having any element that gets
> expanded/collapsed get pinned to the same location during the redraw would
> help. Adding animations to show the elements collapsing/opening would help.
> Again more visual hierarchy, outlines around elements, deeper indents, font
> size/color/boldness etc so that it doesn't just look like a homogenous wall
> of text. I feel like I keep asking for the same things over and over again
> and it is improving, but very gradually/marginally with each pass.
>
> I added a few more bindings, I'm not sure at what point having all the
> surfaces bound starts to limit progress. Let me know and I can take a pass
> at adding the rest of them. The interface is getting usable-ish, though
> it's still pretty clunky and seems to get better with each pass so I'm not
> in a huge hurry to work through all the rest of them. Got to the pitch
> plate, and none of those (at least the first few that I checked) seem to
> have any suggestions yet. Worth having the agents take another pass and
> giving suggestions each so hopefully I can just rubber stamp most of the
> rest of them. 2d graph view looks pretty good as well, I couldn't see any
> errors in the topology. Could probably use another small pass at
> re-arranging/redrawing the boundaries since it is getting more busy with
> all the extra interfaces/DOFs. Particularly the area around the pitch plate
> and link attachments is a little cramped. The radial stack from inner race,
> to bolt, to bushing, to plate takes a somewhat meandering path, would be
> more intuitive to understand if those elements were lined up. Same with the
> tangential link- it's a linear two force member so it would be easier to
> understand visually if the elements were lined up in a row, and the
> tangential link in particular really forces the entire map to have a lot of
> empty space in the middle due to the way it's drawn. Minimizing line
> crossings whenever possible is also helpful.
>
> Other than that, what are next steps?

**The binding pane and the tree were deliberately not changed by this
chain.** Jeff's later messages the same evening asked whether the tree
should live in the 3D pane and whether commands should move to a panel or a
right-click menu; a layout sketch is with him and its handoffs follow his
answer. So the binding sentences get a row each that says what the page does
**today**, with a shot, so the redesign starts from measured behaviour, and
deliverable 3 below.

## Deliverables

1. **The page's top**: what Jeff can do now that he could not on 11-22, and
   what is still wrong, each a line; then the counted verdicts.

2. **The study.** A table of v2's study as the page shows it: per row, the
   edge, valued on v2 / read from v1 / open, the citation it opens to, its
   sensitivity at each stop. The totals at each stop and the range, beside
   v1's, and for any difference which reading moved it (from the three
   citation lessons). v2 edges with a value, of the total. Then **what the
   study still needs**, as a short ordered list: drawings not in hand, the
   questions only Jeff can answer (D1–D11 of
   `REVIEW_20261119_the_links_and_the_pitch_plate_stack.md` are all still
   unanswered; carry the ones that gate a number, with what each gates), and
   the two-diameters table from the spec-sheet lesson (what the play of each
   joint is missing).

3. **Add a face, replayed.** On the scratch copy, reproduce Jeff's first
   paragraph on the tangential link mount's pilot (the hub boss in the mount
   pilot; his events 0102–0104 are the trace: 0103, nine faces, superseded
   0102 by the replace path and carries no add marker): bind one shoulder,
   press Add a face, click the other shoulder. Before and after each click
   record the pane's armed state (`__embedTree.armedLine`, the `adding`
   flag) and which writer ran. Try the variants a hand would: clicking a
   suggestion line's Take while adding, pressing Correct (it sits beside Add
   a face), re-clicking a held face. The row says exactly which sequence
   replaces. A read-only strategy pass could not find it in the code.

4. **Jeff's sentences**, a row each as on the 11-19 page: his sentence
   (short), what the page does now, the shot, the verdict. The map sentences
   are judged against the re-arranged map beside the 11-19 shots; "none of
   those seem to have any suggestions" against the pitch plate's features
   opened one by one in tree order, with the count of v2 ends that still
   offer nothing.

5. **Everything this chain added, flipped once**: the study selected and
   deselected (the lit route on the map), each row kind opened to its
   citation, each stop's grid, the gap card, a seat, a pattern and a ball
   centre opened to their offered faces, the three Groups switches on the
   new map.

## Definition of done

- The review page exists, every row with a shot you read before writing it,
  at 3840 and 1536 wide where the row is about layout. Shots under
  `docs/sessions/lessons/shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/`.
- Jeff's log: files and hash before and after, on the page's first lines.
- Every defect is an issue with frontmatter, cited by name on the page; a
  finding that needs Jeff is `needs: jeff` with a one-line ask.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_the_walk_reads_the_v2_study_and_the_map_on_the_merged_page.md`):
  how the tree was served, what the walk could not check and why, traps for
  the next walk.
