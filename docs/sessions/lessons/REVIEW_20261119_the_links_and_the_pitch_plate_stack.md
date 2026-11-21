# The links and the pitch plate stack, read against Jeff's 11-19 note

> **Where this ran:** I served `integration` at `8082bad0` (this branch's
> base, with all seven links of the chain merged) on drawing-checker's mount
> shape, port 8879. The projections were rebuilt from that tree into
> `data/scratch/walk1119`, with a copy of your log. Nothing was served on
> 8000. The driver passed drawing links and the rebuild-status call through to
> 8000 read-only, so the "Data is older than the latest code" banner in the
> shots describes your main checkout, not this tree. **Your real log held 101
> files before and 101 after** (100 events and the README). The sorted listing
> hashed to `f1e06978…` both times, and the hash of every file's contents to
> `0cdc8fc8…` both times. The one bind of the walk went into the scratch copy
> (event 0101). No code was changed.

**29 rows: 22 does it · 5 partly · 2 does not.** Shots:
`shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/`.
Each was read before its row was written. Issues are cited by name.

**What you can do now that you could not on 11-19:**

- **See 215177-001 as the container.** In the tree it reads "3 parts · 0
  features" and holds the plate 215735-001 (9 features) and both NAS77A3-015A
  flanged bushings. On the map it is a dotted outline round exactly those
  three. The plate's features moved onto 215735-001, and your pilot-boss
  binding came with them.
- **Read each lug as the bolt stack you described.** Each lug has a shoulder
  bolt, a straight bushing, a flanged bushing and the inner race. Every
  bore-boss and flange connection in your list is a drawn route.
- **See each link as a machined part and two bearings, each bearing two
  races.** The ball joint sits between the races. The inner race is in the
  mating part's body, and the link's body is its machined part plus the two
  outer races. Both links have the same shape.
- **Switch Bodies, Assemblies and Parts on the map.** Each switch hides its
  containers on the map as well as the grid, and nothing else moves.
- **Choose what the grid brackets first.** Assemblies or bodies, never both:
  the one you switched on last wins.
- **See where each open dimension's drawing stands.** Every one of v2's 75
  open dimensions wears a chip: drawing read, other dash read, no drawing
  yet, or spec sheet.

**What is still wrong:**

- **A Take on a lug feature can bind the other lug's face** (row J7). On
  `215735-001 › pitch link straight bushing bore`, the offered face is
  "r 4.2600 … fits the mating pin". One Take bound faces 1370/1371, which are
  the **tangential** link's Ø8.520 bore; yours are 1380/1381. Both lugs are
  offered the same faces. Until that is fixed, use Pick a face on the lugs,
  not Take. Filed as an addendum to
  `ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means`
  (deferred, and now a wrong write).
- **The page says nothing is missing on v2.** No edge carries a value, yet
  under the grid it reads "Nothing is recorded as missing for this assembly."
  Filed as an addendum to
  `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list`.
- **Map boxes change colour after the pointer passes over them.** A box is
  teal on load and takes its body's colour on the first hover. Your 11-19
  shot was all orange. Filed:
  `ISSUE_20261120_a_map_box_wears_its_bodys_colour_only_after_the_pointer_has_passed_over_it`.
- **The map is clean by count, not yet tidy** (row J20). In the region, no
  route runs through a box, none shares a run, and none crosses another. But
  two long diagonals remain, and each link's length draws as a long
  rectangular lane.
- **Five small findings** are in
  `ISSUE_20261120_small_findings_of_the_links_and_pitch_plate_stack_walk`
  (F1–F5).

## The map beside your screenshots (deliverable 2)

Your three shots are of the 11-19 page: master's viewer at the time, with the
projection built from `f510260e`. That projection is still the one in the
main checkout. I counted both maps with the page's own `VA.mapLayout`,
judged by **today's** route rules. Your tree's geometry was taken from its
own `map.js`, and the rules came from this tree's `VA.mapRouteNotes`. The
region is the pitch plate, tangential link and pitch link districts: any
route with a point inside them.

| In the region | 11-19 (your shots) | now |
|---|---:|---:|
| routes | 23 | 35 |
| routes through a box, or past their stub across their own box, or with a symbol on a box | 4 routes (6 notes) | 0 |
| pairs of routes sharing a run | 6 | 0 |
| pairs of routes that cross | 3 | 0 |

- **11-19, by name:**
  - through or across a box: the pitch link's flanged bushing "bore to
    pitch link bore", which crossed its own bushing with its symbol on the
    box (your U-turn), and the tangential link's, which did the same on
    215177. Also both straight bushings' "bore to flanged bushing bore", one
    of which ran through the tangential flanged bushing.
  - shared runs: five pairs round the two flanged bushings and their
    attach bores (your "edges overlap … then diverge"), and the piston
    body's two pilot bosses.
  - crossings: the pitch-plate link joint across both of the pitch link
    lug's routes at one point, and the pitch link straight bushing's route
    across the tangential link's attach-bore route.
- **Now:** the whole map has one crossing, hub ↔ tangential link mount, in
  the base column, outside the region. The layout reports no notes.

**Does it "look clean"?** Cleaner, yes: there are no U-turns, no forks
without a node, and no route through a part. It is not yet tidy, though:

- two long diagonals in the plate district: tangential flange to its race,
  and the plate's lower pin to the tangential straight bushing;
- an empty lower-left corner in the plate district;
- the tangential link's outline is a large rectangle that crosses the ground
  and pitch plate districts;
- each link's length is a long lane that reads as another box (F3).

Shots:

- 3840: `02_map_3840_pitch_plate_region` (your framing), `03_map_3840_tangential_link`,
  `04_map_3840_pitch_link`, `01_map_3840_plate_and_links_region` (all three).
- 1536: `05_map_1536_side_by_side`, `05b_map_1536_side_by_side_map_crop`, `06_map_1536_dag_view`,
  then zoomed: `07_map_1536_dag_zoomed_pitch_plate`, `08_map_1536_dag_zoomed_tangential_link`, `09_map_1536_dag_zoomed_pitch_link`.

At 1536, Side by side leaves the map 274 px and nothing can be read at fit
(F2). Zoomed, it reads as well as at 3840.

"Side by side" means the view setting. The 3840 map shots have the 3D pane
closed, as the chain's own probes took them. `30_sweep_opened` is 3840 with
the pane open.

## Only you can decide

| # | Question | What the walk shows | Recommendation |
|---|---|---|---|
| D1 | **The swage.** Is the swaged outer race a press fit, or its own interface? | Each of the four bearings has a `press_fit` gap from the outer race's cylinder to the machined bore (`03_…`, `04_…`: the filled symbol between race and machined part) | Keep press fit. A swaged race never moves, and a gap edge with a band is your "zero distance gap with a tolerance" |
| D2 | **The bolt numbers.** The STEP products are NAS6403U11D (pitch link) and NAS6403U14D (tangential link). Their instances are named NAS6403U10D.3 and NAS6403U12D.1. v1 says NAS6403U13H, which the STEP puts at the piston heads | v2 uses the products' numbers, and the boxes lead with them (`02_…`) | None until a drawing says. The 215177 assembly drawing's parts list would settle it |
| D3 | **213863's number.** Mesh and Enovia say 213863-004; the STEP instance is named 213863-002.1. The pitch link is the same: 213861-002 against 213861-001.1 | v2 says 213863-004 and 213861-002. 213863-004's drawing is read (the chip says "drawing read") | Products' numbers. A transcription session can check 213863-004's title block on the way |
| D4 | **NAS77A3 against NAS77C3.** The mesh and Enovia say NAS77A3-015A; the 215177 STEP names its instances NAS77C3-015.1 to .8 | v2 says NAS77A3-015A (`23_tree_215177_open`) | None: it is the number on your drawing |
| D5 | **The hardware at the pitch arm and at the mount.** What clamps each inner race, in order? | Both inner races sit on a `pin_in_bore` stand-in to the arm's and the mount's bores. Meshes within ~12 mm: a pitch link washer (217970-001, IN_WORK) and an NAS1149V0332H washer at the arm; three parts under 215175-001 at the mount | None. Until you answer, the stand-ins carry the chain, and the end-stop study does not need the washers |
| D6 | **MS14103-3 is one solid.** Ask rotorkit for a split mesh? | Both races are authored on one mesh. Its bore leans on the lug's axis: its distance from that axis runs from 1.8 to 3.0 mm along it (link 5's measurement) | Not yet. Only a bind on its sphere needs it, and the ball centre is already bound |
| D7 | **The tangential link's bolt has no mesh.** Ask for NAS6403U14D? | The sweep reads "3 nodes not placed: shank at straight bushing; shank at inner race; shank at flanged bushing" (`31_sweep_playing`). Its shank cannot be bound | Yes, if the end-stop study will bind the bolt axis rather than the bushing bores. Otherwise no |
| D8 | **The bolt head on the straight bushing.** Kinematic model, or the grip-length studies? | Not authored. In the pitch link lug, the head bears on the straight bushing's end (link 5's projection of the meshes) | Grip-length. Your note puts washers and grip there, and the head seat sets no position the end stop reads |
| D9 | **The grid when both are on** (link 3 took your fallback) | Assemblies outermost: one "212956-005" bracket from inner race to inner race, and each bearing a dotted bracket inside (`14_grid_all_on_assemblies_last`). Bodies outermost: the grid as before, with no assembly bracket (`16_grid_all_on_bodies_last`). With Bodies off, assemblies lead (`11_grid_bodies_off`). Folding the tangential link with bodies outermost puts its one row inside ground's bracket and leaves the link's body two gap rows (`18b_…`), which is filed. The popover shows both ticked (filed) | Keep the fallback. The nested drawing is still modelled (`VA.gridBraces`) if a later design can name a run |
| D10 | **The hub and the tangential link mount drawings.** The runs read are the hub assembly 214373-003 and the mount assembly 215175 rev A, whose finds are the machined mounts 215198-001/-002 | 3 hub and 6 mount dimensions read "other dash read". Should the model's mount part be 215198-00x? | Ask whether the assembly sheets carry the -002 hub's own dimensions. For the mount, probably name 215198 (`ISSUE_20261113_five_end_stop_parts_have_no_drawing_checker_run_of_their_own`, addendum) |
| D11 | **Your four ball-centre bindings** sit on the inner races' balls; v2 puts the centre on the outer race's seat | Concentric within 0.001 mm; the four fits did not move | Keep them. A re-pick changes no number |

D1, D3, D6 and D11 were only in link 4's lesson and are now filed:
`ISSUE_20261120_the_links_leave_four_questions_for_jeff_the_swage_the_machined_numbers_ms14103s_one_solid_and_the_ball_faces`.
D2, D4, D7 and D8 are `ISSUE_20261120_the_pitch_plate_bolt_stacks_leave_questions_for_jeff`,
and D5 is `ISSUE_20261120_the_inner_races_at_the_pitch_arm_and_the_mount_sit_on_a_stand_in_for_hardware_nobody_has_authored`.

**Strings link 6 kept, for you to judge** (it removed 23):

- "Binding — Propeller Pitch System", the 3D pane's head. A heading, but it
  names the pane's mode.
- The element-step prompts in the 3D pane's bar ("… Click the first one in
  the 3D view."). They are instructions.
- "Pick an element on the left to bind this face to.", said when a face is
  clicked with nothing armed.
- The Help lines, including sweep mode's "Nothing here changes the model,
  and nothing is written."
- One it did not list: **"Nothing is recorded as missing for this
  assembly."** It is always visible under the grid, it is a negation, and on
  v2 it is false (above).

**Bindings that need a re-pick.** All are in your real log, and none changes
by itself.

| Your events | What they bind (v1) | The v2 feature to pick | Clicks |
|---|---|---|---|
| 0093, 0094, 0098–0100 (standing), faces 1380/1381 | the pitch link attach bore on 215177 | `215735-001 › pitch link straight bushing bore` (the same face ids on the plate's own mesh) | 5: open 215177, open 215735, open the feature, Pick a face, click the bore. **Not Take**: it offers the tangential link's bore (`24_…`, `25_after_take_bound`) |
| 0095–0097, faces 1509/1510 | the same bore, the flanged bushing's half | `NAS77A3-015A flanged bushing, pitch link › bore` | 4: open the bushing, open the feature, Pick a face, click |
| (if you meant the bolt's axis) | — | `NAS6403U11D › shank at inner race` (and its two siblings: one cylinder, faces 36/37) | 3: open the bolt, open the feature, Take. The bolt mesh has one set of faces, so its Take is safe |
| proposals 0051, 0054, 0058, 0061 | the pilot boss end of the two attach radii | the pilot boss, already bound (event 0005 reads through) | 0 |

## Jeff, 11-19

Your greeting and the two sentences that only introduce screenshots have no
row.

| # | Your sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| J1 | "the assembly is now in the map, but the composition is a bit strange" | The tree and map now have the composition you drew (J2, J4) | `23_tree_215177_open`, `02_map_3840_pitch_plate_region` | does it |
| J2 | "215177-001 IS the pitch plate assembly, yet is shown as a child of the assembly collector, parallel to 215735-001" | 215177-001 is the top: "3 parts · 0 features", holding 215735-001 (9 features) and the two NAS77A3-015A rows. It has no box of its own, only its outline | `23_…`, `02_…` | does it |
| J3 | Flanged bushings: "multiple edges coming out of one node … u-turn … a node in the middle of the part" | A feature now has one pin per interface, each on the side facing its partner. A child's route drops from its parent's pin straight to its own (link 1). The routes that made the U-turn are gone with the attach bores. No symbol sits on a box (0 notes) | `02_…`, `07_map_1536_dag_zoomed_pitch_plate` | does it |
| J4 | "Lots of edges overlap … then diverge … extra branches with no nodes" | 0 shared runs in the region (6 on 11-19). Each pin has its own route | `02_…`, `11_map_bodies_off` | does it |
| J5 | "The container contains the pitch plate and each flanged bushing" | The 215177 outline holds exactly those three (link 5's probe: `held` = those three). Selecting the outline lights them, opens them in the tree and lights their rows | `22_select_215177_outline` | does it |
| J6 | "Each flanged bushing has a bore-boss and a flange connection to the pitch plate" | Two parallel routes per bushing: press fit (‖) and flange seat (filled ◉) | `02_…` | does it |
| J7 | "a flange connection to the spherical inner race and a bore-boss to the shoulder bolt" | Both are drawn: flange-side face (contact) to the race, shank in bore (pin in bore) to the bolt. The bolt is in the model now. But binding it is unsafe: the lug's suggested faces come from the other lug (above) | `02_…`, `25_after_take_bound` | partly |
| J8 | "The shoulder bolt has a bore-boss to the spherical inner race" | `*_upper_inner_race_on_bolt`, pin in bore, both lugs | `02_…` | does it |
| J9 | "the spherical bearings themselves are compound (inner and outer race with a spherical joint)" | Each bearing is a dotted outline round two race boxes, with the spherical symbol between them, on all four bearings | `03_map_3840_tangential_link`, `04_map_3840_pitch_link` | does it |
| J10 | "a bore-boss to the straight bushing which then has a bore-boss back to the pitch plate part" | The bolt has a pin to the straight bushing; the straight bushing has a transition fit into 215735 and a clamp on the race | `02_…`, `07_…` | does it |
| J11 | "Tan link assembly has both bearings, but neither interacts with the graph" | Both MS bearings are in the chain: mount ↔ inner race ↔ (ball) ↔ outer race ↔ machined link ↔ outer race ↔ (ball) ↔ inner race ↔ bolt | `03_…`, `08_…` | does it |
| J12 | "In reality they need to be in the chain" | They are. In 3D the sweep poses the link through them | `31_sweep_playing` | does it |
| J13 | "the spherical bearing itself is two bodies joined by the spherical joint" | Same as J9. The outer race is in the link's body; the inner race is in the mating part's | `03_…`, `20b_select_race_part` | does it |
| J14 | "Outer race … swaged into the housing … zero distance gap with a tolerance?" | A `press_fit` gap edge. No band yet: the race sheets are not parsed | `03_…` | partly (D1) |
| J15 | "Inner race has a bore and a set of flanges (one side to the flanged bushing, the other clamped by the straight bushing)" | The plate-end races have four features: bore, ball centre, flange-side face, clamped face. The flange-side face is seated on the flanged bushing, and the clamped face on the straight bushing | `20b_…` | does it |
| J16 | "The pitch link assembly currently only has one of the bearings, also not wired" | Both MS14101-3 bearings are authored and in the chain (`.1` at the arm, `.2` at the plate) | `04_…`, `09_…` | does it |
| J17 | "identical topology … the machined part and two outer races should resolve to a single value: its length" | Both links are the same five boxes. `pitch_link_length` and `tan_link_length` keep v1's ids and run seat to seat. The parts' own route (race, press fit, machined bores) is also there; a study names one | `03_…`, `04_…` | does it |
| J18 | "both link assemblies are flexible … a single rigid body plus part of two other rigid bodies" | The link body is the machined part and two outer races; each inner race is in the mating body. The link assembly itself is in no body, and its outline crosses districts | `01_map_3840_plate_and_links_region` | does it |
| J19 | "once the container is merged … the screwy crossed lines will get rearranged" | They did: region crossings 3 → 0 | `02_…` | does it |
| J20 | "the agent will likely need to re-draw the map … to make it look clean" | Re-drawn (link 5 searched 298 arrangements). Clean by count; still has two long diagonals and the link lanes (deliverable 2) | `01_…`, `02_…` | partly |
| J21 | "The bodies and parts groups … only affect the grid view" | Now three switches, Bodies, Assemblies and Parts, reaching both views | `11_map_bodies_off`, `12_map_assemblies_off`, `13_map_parts_off` | does it |
| J22 | "They should also show/hide their respective containers in the 2d map" | Bodies off hides the districts, Assemblies off the outlines, Parts off the boxes. Pins, routes and symbols do not move. With all off the map is pins, routes and the parts' jumpers (`15_map_all_off`) | `11_…`, `12_…`, `13_…`, `15_…` | does it |
| J23 | "the boundaries of the bodies and assemblies overlap … I think this should be doable" | The nested drawing was built and read badly (link 3's shots: unnamed runs, three caps on one row) | `14_grid_all_on_assemblies_last` | partly |
| J24 | "The grid view might need to be either assemblies or bodies" | Shipped: the outermost bracket is the one switched on last, stored per model | `14_…`, `16_grid_all_on_bodies_last` | does it |
| J25 | "The real PITA are the spherical bearings: a single part number that contains two bodies" | Handled the same way on the map, the grid and the tree. But each race is listed twice in the tree (filed). In 3D the two inner races are drawn as stick figures, and their rows do not name them (F1) | `14_…`, `20b_…`, `31_…` | partly |
| J26 | "the straight bushing length, washers, fastener grip length … relevant to the grip length studies" | Not in the model. No washer is authored. The bolt head seat is not authored (D8) | — | does it (as you asked: left out) |
| J27 | "At some point should get those in there … a study simply traces a subset" | v2 still has no study at all; the one kinematic study is on v1 | — | does not (not yet asked for) |
| J28 | "Getting the kinematic end stop study fully incorporated is top priority" | No constraint has a value, and 21 of 100 ends are bound. The first study on v2 needs the short list below | `11_grid_bodies_off` | does not |
| J29 | The two extra screenshots: "edges that take u-turns and run through the container" | No route crosses a box or its own box; 0 notes | `02_…`, `07_…` | does it |

## What the end-stop study still needs (deliverable 4)

**Ends bound** is the fold of your log (`bindings.json` over 100 events). The
tree and this walk agree, apart from the walk's one scratch bind, which is
not counted here. A feature counts as bound under the key it reads, which is
v1's where a v2 feature took its id from v1. **No v2 edge carries a value**:
104 edges, 0 dimensions. "One side cited" means a note cites the plate's
bore band (215735-A sh 2, SECTION A-A), which no edge carries yet.

| # | Joint | Constraints | Ends bound | Value |
|---|---|---|---|---|
| 1 | hub ↔ blade root | revolute | 2 of 2 | none |
| 2 | hub ↔ tangential link mount | contact · pattern · pin in bore | 3 of 6 | none |
| 3 | gas-spring mount ↔ tangential link mount | contact · pattern · pin in bore | 3 of 6 | none |
| 4 | gas-spring mount ↔ piston cover | contact · pattern · pin in bore | 5 of 6 | none |
| 5 | gas-spring mount ↔ lower piston head | contact (feather stop) | 1 of 2 | none |
| 6 | blade root ↔ pitch arm | contact · pattern · pin in bore | 0 of 6 | none |
| 7 | piston body ↔ pitch plate 215735 | contact · pattern · pin in bore | 1 of 6 | none |
| 8 | piston body ↔ lower piston head | contact · pin in bore | 0 of 4 | none |
| 9 | lower ↔ upper piston head | contact | 0 of 2 | none |
| 10 | piston body ↔ upper piston head | pattern · pin in bore | 0 of 4 | none |
| 11 | gas-spring mount ↔ piston body | slide | 2 of 2 | none |
| 12 | piston cover ↔ upper piston head | clearance (the stops) | 0 of 2 | the study's output |
| 13 | pitch link, arm end: arm ↔ inner race ↔ outer race ↔ machined link | pin in bore (stand-in) · spherical · press fit | 1 of 6 | none |
| 14 | pitch link, plate end: inner race ↔ outer race ↔ machined link | spherical · press fit | 1 of 4 | none |
| 15 | tangential link, mount end: mount ↔ inner race ↔ outer race ↔ machined link | pin in bore (stand-in) · spherical · press fit | 1 of 6 | none |
| 16 | tangential link, plate end: inner race ↔ outer race ↔ machined link | spherical · press fit | 1 of 4 | none |
| 17 | pitch link lug: flanged bushing, straight bushing, bolt, race, plate (7 joints) | contact ×3 · press fit · transition fit · pin in bore ×3 | 0 of 16 | one side cited in the notes: press fit, transition fit |
| 18 | tangential link lug, the same 7 joints | the same | 0 of 16 | the same |
| | **36 joints** | **50 constraints** | **21 of 100** | **0 valued; 4 with one side cited in a note** |

(11-18 counted 21 of 72. The 28 new ends are the races and the bolt stacks,
none bound yet. The four "1 of" ball rows are your sphere-centre bindings.)

**Where each open dimension's drawing stands** (the projection's
`drawing_status`, 75 open dimensions):

| Status | Count | Parts |
|---|---:|---|
| drawing read | 25 | 213668-002 gas-spring mount (7), 214700-002 piston body (6), 214698-002, 214699-002, 214958-002 (3 each), 212956-005, 213862-002, 213863-004 (1 each) |
| other dash read | 20 | 215735-001 pitch plate (8), 215175-002 mount (6), 214373-002 hub (3), 215071-001 pitch arm (3) |
| no drawing yet | 8 | 216332-001 blade (3), the two 214820-002 straight bushings (2 each), 213861-002 machined pitch link (1) |
| spec sheet | 22 | the eight MS races (12), the two NAS77A3 flanged bushings (6), the two bolts (4) |

**Read and uncited, by count:** 213668-002 (7), 214700-002 (6), 214698-002
(3), 214699-002 (3), 214958-002 (3), 212956-005 (1), 213862-002 (1),
213863-004 (1). That is 8 drawings and 25 dimensions.

**The step is now transcription, not acquisition.** 11-18 said none of those
drawings was in hand. Now 25 open dimensions wait only on someone reading a
drawing that drawing-checker has already read. 213668 and 214700 alone close
13. The other-dash sheets for 215735-001 and 215071-001 dimension their own
dash (link 7 read their notes), which adds 11 more. Acquisition is left for 8
dimensions: the blade's drawing, the straight bushings' 214820-002 and
213861-002. Two other-dash sheets (the hub's 3 and the mount's 6) need D10
first. The 22 spec-sheet dimensions need sheets parsed: NAS6403 and NAS77
are in the inbox and not parsed, and the MS races have no cited sheet on v2.

**The v1 ids the kinematic study uses, and what stands for each on v2.** The
study (`vpa_pitch_linkage_blade_pitch_at_the_stops`) has six contributors and
one study reference.

| v1 id | On v2 |
|---|---|
| `pitch_link_length` | the same id, seat centre to seat centre on the outer races. Or the parts' route: each `…_outer_race_od_to_centre`, each `…_outer_race_press_fit`, and `pitch_link_race_bores` |
| `tan_link_length` | the same, `tan_link_…` |
| `pitch_arm_radius` | the same id and ends (`pitch_arm_root_seat` → `pitch_arm_link_bore`). The ball now reaches the arm through `pitch_link_lower_inner_race_on_pitch_arm` (stand-in) → inner race bore → `…_bore_to_ball` → the ball joint |
| `tan_link_mount_height` | the same id and ends. The ball reaches the mount through `tan_link_lower_inner_race_on_mount` (stand-in) → race → ball joint |
| `pitch_plate_tan_link_attach_radius` | gone. `pitch_plate_tan_link_flanged_bushing_radius` (pilot boss → flanged bushing bore), then `tan_link_flanged_bushing_press_fit` → `tan_link_flanged_bushing_wall` → `tan_link_bolt_in_flanged_bushing` → `tan_link_bolt_shank_race_to_flanged` → `tan_link_upper_inner_race_on_bolt` → race → ball joint |
| `pitch_plate_attach_height` (the axial component of the pitch link attach offset) | **gone, with nothing in its place.** v2 has one pilot-to-bore dimension per lug (`pitch_plate_link_flanged_bushing_radius`), where v1 had a radius and a height as two edges on purpose |
| study ref `vpa_pitch_linkage_feather_stop_axial_position` | no v2 study |

**What the first tolerance study on v2 is missing:**

1. **A study.** v2 has none to lasso yet.
2. **The pitch plate's axial attach height.** No v2 edge carries it (above).
3. **Values.** 0 of 104 edges. Transcribe 213668-002 and 214700-002 first
   (13 dimensions), then 215735-001 and 215071-001 (11).
4. **Two hardware stand-ins** at the pitch arm and at the mount (D5).
5. **Sheets parsed** for the races, the NAS77 bushings and the bolts (22).
6. **Three drawings not in hand:** 214820-002, 216332-001 and 213861-002.
7. **A safe Take on the lugs** (the which-blade issue). Until then the lug
   ends are Pick-a-face work.

## Everything flipped once (deliverable 5)

- **Groups, on the map:** each switch alone, all off, all on: `11_`, `12_`,
  `13_`, `15_map_*`. Nothing moved. Pins keep their body's colour with Bodies
  off.
- **Groups, on the grid:** `11_grid_bodies_off` (assemblies lead), `14_` and
  `16_` (the one switched on last wins).
- **Fold an assembly in two bodies:** the tangential link folded, with
  assemblies outermost (`17b_…`: one "212956-005 · 8 dimensions" row, in its
  own bracket) and with bodies outermost (`18b_…`: the row sits in ground's
  bracket and the link body keeps two gap rows). The latter is filed.
- **Select:**
  - a race (`20b_select_race_part`): its four features, the tree opens it
    twice;
  - the NAS6403U11D bolt: its three shank lengths and two dimensions;
  - the 215177 outline (`22_…`): its three parts, 14 dimensions, 4
    interfaces and 17 features lit; the tree opens all three.

  The Preview is empty for each (F5). A click on a box's middle selects the
  jumper crossing it (F4).
- **Play the sweep:** it opens Side by side with the 3D pane, frames advance
  (frame 72.7 → 59.5 in 3 s, "out and back"), 22 of 24 parts are placed, and
  "3 nodes not placed" is the mesh-less bolt (`30_`, `31_`). No page errors.
- **One bind:** Take on the plate's pitch-link straight-bushing bore, 2.2 s
  to disk, wrote the wrong lug's faces (`24_`, `25_`). That is the finding at
  the top.
