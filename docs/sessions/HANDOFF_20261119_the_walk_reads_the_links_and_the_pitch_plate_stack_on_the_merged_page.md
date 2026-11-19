---
priority: high
depends_on: [the_viewer_says_nothing_about_itself]
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page: walk the merged page against Jeff's 11-19 note and write his review page

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19) and the six
handoffs it staged. This is the chain's last link and Jeff's review point:
he reads one page and decides what is next. No code changes here; a defect
you find is an issue, cited by name on the page.

The note, whole (every sentence is a row to check):

> new tolstack updates are up, a few comments. Attached is a screenshot of
> the region of the 2d map/graph with the most issues:
> Pitch plate assembly: the assembly is now in the map, but the
> components/composition is a bit strange. 215177-001 IS the pitch plate
> assembly, yet is shown as a child of the assembly collector, parallel to
> the 215735-001 pitch plate part (which is actually a child of the
> assembly). The flanged bushings both have some serious weirdness going on:
> multiple edges coming out of one node, the flanged bushing pitch link has
> an edge (bore to pitch link bore) that passes through the bushing part,
> takes a u-turn, and then connects back to itself, and has a node (boss in
> a bore) in the middle of the part. Lots of edges overlap each other for
> parts of their length and then diverge, which makes it look like there are
> extra branches with no nodes.
> What it should actually be: The container (215177-001), contains the pitch
> plate (215735-001) and each flanged bushing. Each flanged bushing has a
> bore-boss and a flange connection to the pitch plate. Each flanged bushing
> also has a flange connection to the spherical inner race and a bore-boss
> to the shoulder bolt (not included in this model yet). The shoulder bolt
> has a bore-boss to the spherical inner race. This also means the spherical
> bearings themselves are compound (they consist of inner and outer race
> with a spherical joint between them). The shoulder bolt also has a
> bore-boss to the straight bushing which then has a bore-boss back to the
> pitch plate part.
> Pitch link and tangential link: Tan link assembly has both bearings, but
> neither of them interact with the graph. In reality they need to be in the
> chain. As mentioned above, the spherical bearing itself is two bodies
> joined by the spherical joint. Outer race is located with a boss-bore to
> the machined link part, it's actually swaged into the housing so I'm not
> sure how to represent this (zero distance gap with a tolerance?). Inner
> race has a bore and a set of flanges (one side is located to the pitch
> plate's flanged bushing, the other side is clamped by the straight
> bushing). The pitch link assembly currently only has one of the bearings
> included, also not wired into the graph yet. Pitch link and tan link have
> identical topology (resolves to a two force member with spherical joints
> at both ends, so the machined part and two outer races should resolve to a
> single value: it's length). This also means both link assemblies are
> flexible, and contain a single rigid body plus part of two other rigid
> bodies (the inner races are actually part of the mating parts' rigid
> bodies)
> I think that once the current container incorrectly titled 215177-001 is
> merged with the other 215735-001 pitch plate, all the screwy crossed lines
> in the dag will get rearranged, but the agent will likely need to re-draw
> the map based on the new topology to make it look clean.
> Two extra screenshots showing the screwy edges that take u-turns and run
> through the container etc.
> Other observations:
> The bodies and parts groups under the view controls only affect the grid
> view. They should also show/hide their respective containers in the 2d
> map.
> Things are going to get a bit interesting in the grid view since the
> boundaries of the bodies and assemblies overlap each other (they're not
> perfectly nested). I *think* this should be doable but I'm not sure. The
> grid view might need to be either assemblies or bodies, rather than both
> simultaneously. The real PITA are the spherical bearings: they are a
> single part number that contains two bodies.
> I didn't go into the rest of the fastener stack around the spherical
> bearings. The straight bushing length, washers, fastener grip length etc.
> are all irrelevant to the kinematic model/end stop tolerance study, but
> they are relevant to the grip length tolerance studies. At some point
> should get those in there, as we already established, a study simply
> traces a subset of the full graph. Getting the kinematic end stop study
> fully incorporated is top priority, the ancillary studies can always be
> added later.

His screenshots, to set beside yours:
`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261119T142516_ci28ci\paste-20261119T134821.png`,
`…\paste-20261119T141226.png`, `…\paste-20261119T141321.png`.

Baseline: `integration` with all six links merged. Scope: docs only —
`docs/sessions/lessons/REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`,
its shots, your lesson, issues. Serve the merged tree the way the 11-18 walk
did (a scratch data root with a **copy** of Jeff's log, a port of your own;
never 8000, never his real log: hash its listing before and after and say so
on the page).

## Deliverables

1. **The review page**, written for Jeff, in the shape of
   `docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`:
   what he can do now that he could not on 11-19, what is still wrong, then
   one row per sentence of the note (his sentence short, what the page does
   now, the shot, a verdict: does it / partly / does not). Each shot is read
   before its row is written.
2. **The map beside his screenshots**: the pitch plate region and both link
   regions, same framing as his, at 3840 Side by side and 1536 wide. Say
   plainly whether it now "looks clean"; count routes through a box, shared
   runs and crossings in that region, before (his shot) and after.
3. **"Only you can decide"**, one table, each row a question with what the
   walk shows and a recommendation or "none". Gather the question lists of
   links 4 and 5 (the swage's word, the bolt numbers, 213863's number,
   NAS77A3 against NAS77C3, the hardware at the pitch arm and the mount,
   MS14103-3's one solid), the grid behaviour link 3 shipped (show both
   shots if it took the fallback), any string link 6 kept, and the bindings
   that need a re-pick with the two or three clicks each takes.
4. **What the end-stop study still needs**, the 11-18 page's table brought
   up to date against the new model: per joint, ends bound on his log, and
   whether any value is cited. Then the table from link 4's lesson: each v1
   id the kinematic study uses and the v2 chain that now stands for it.
   This is what the first tolerance study on v2 is written from, so say
   what is missing for it in one short list.
5. **Flip everything once**: each Groups switch on the map and the grid,
   fold and unfold an assembly that sits in two bodies, select a race, a
   bolt, the 215177 outline; play the sweep. Anything that surprises you is
   a row or an issue.

## Definition of done

- The review page exists, opens with where it ran and the proof his log was
  untouched, and every row cites a shot that exists.
- Issues filed with frontmatter for each defect, cited by name on the page.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md`):
  what the walk could not check and why.
