---
type: bug
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_viewer_hover_deslop_and_banner_purge.md
---

# Both preview panes still restate the document the crop came from, one line under the citation that already named it

`viewer_hover_deslop_and_banner_purge` (2026-09-16, deliverable 2) fixed this on
the **hover cards**: a card states its document once, in its own where-line, and
the crop under it renders no head. The handoff scoped the deliverable to cards,
so the two **preview panes** were left exactly as they were and have the same
defect.

**Where.** Both panes print a citation where-line and then a crop head:

| pane | the where-line | the head under the picture |
|---|---|---|
| stack-side (`views/detail.js`) | `detail__where` ← `VA.citationWhere(element.source_ref)` | `detail__crop-head` ← `VA.cropReference`'s `entry.pdf_name + " · sheet " + entry.page` |
| DAG-side (`views/topology.js`, `citation()` + `cropSection()`) | `detail__where` ← `VA.citationWhere(sourceRef)` | the same builder, same prefix |

So a reader selecting `pitch_link_to_pitch_plate | bolt_grip_11` sees
`NAS6403-NAS6420 Rev 4.pdf · rev … · sheet 3` and then, a few lines down,
`NAS6403-NAS6420 Rev 4.pdf · sheet 3` again — Jeff's original complaint, on a
surface the fix did not reach.

The DAG-side pane has the second half of it too: `citation()` calls
`VA.citationWhere(sourceRef)` with no `alreadySaid` argument, so an edge whose
part is *named after its own drawing* prints the part number on two consecutive
lines exactly as the edge card used to. Four live edges are in that shape
(`bushing_214820`, `pitch_plate_flange`, `gas_spring_mount_position`,
`pitch_flange_thickness`).

**The fix is already built and is one argument each.** `VA.cropReference` takes
`opts.omitHead` since 2026-09-16 and `VA.citationWhere` takes a second
`alreadySaid` argument; both panes need only pass them. What needs deciding
first, and why this is filed rather than fixed:

* a pane is not a card. It is persistent, it is the surface a reader lands on
  from a deep link, and it may legitimately want the file's own name (which is
  the *export* filename, e.g. `215197 A.1.pdf`) beside the citation's document
  (`215197`) — those are two different claims, and the crop head is the only
  place the export filename appears at all;
* if the head goes, the crop's `provfold` is the only thing left naming the
  file, and that fold is closed by default.

Repro: `apps/viewer/topology.html`, any stack, select an element with a resolved
crop; then any topology, select an edge with a resolved crop.
