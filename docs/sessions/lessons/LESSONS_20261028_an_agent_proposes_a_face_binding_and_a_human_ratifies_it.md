# LESSONS 2026-10-28 — an_agent_proposes_a_face_binding_and_a_human_ratifies_it

Session ran 2026-10-29. The lane is built: `proposed` / `rejected` verdicts,
`ratifies` / `rejects`, a real actor on every write, the agent's one write path
(`scripts/propose_bindings.py`), and the annotator showing proposals apart and
answering them in one click. The first pass wrote **N = 55 proposals** (45
high, 10 medium, 0 low) into `C:\workspace\tolstack\data\inbox\feature-identity\`
(`0001`–`0055_*_proposed.json`, actor
`agent:an_agent_proposes_a_face_binding_and_a_human_ratifies_it`). **Nothing is
bound.** The rebuilt `bindings.json` says `0 bound, 55 proposed, 55 open`.

## Decisions not in the handoff

- **The shape rule moved to Python.** `AA.SUGGESTION_RULES`' keys, surfaces
  and words are now `tolerance_stack/feature_geometry.py`'s
  `SUGGESTION_RULE_*`, generated into `vocab.gen.js`. Only the reader-facing
  sentence stays in JS (a `VOCAB.table`). Without the move the CLI's "a
  diameter on a flat face is refused" would have been a second copy of the
  rule. The matching itself exists twice (Python `\b`, JS `\b`). One fixture,
  `tests/fixtures/suggestion_rule_cases.json`, is run through both, by pytest
  and by `run_tests.cjs`.
- **Accept/Reject live in the bar, not on the rail row.** The handoff put them
  on the rail row. An edge can carry two proposals (one per end), and two
  button pairs in a 260 px rail row is the emphasis the design rules forbid. The
  rail row carries the chip ("proposed by agent · high") and a dashed stripe.
  Selecting the row puts each proposal in the bar with its two buttons. The
  basis is in the title.
- **`proposed` is a quiet state.** No alert badge, because the chip is the
  signal. `AA.QUIET_BINDING_STATES` names it beside `bound`, and the alert
  pairing check now reads that list.
- **The fold's state gained `proposed` and can say `unbound`.** Precedence is
  bound > owner_not_in_set > proposed > unbound. A record whose only events are
  rejected proposals is `unbound`. JS `elementBindingState` follows the same
  order. One old JS fixture had a record with `bindings: []` and *no*
  owner-not-in-set event and expected `owner_not_in_set`. The real fold never
  produces that shape, so the fixture now carries the finding.
- **`recorded_by` is read, never required.** Old events (`"annotate-app"`,
  test strings) still load. The schema refuses only an `agent:` actor on
  `bound` or `rejected`. The human actor is `annotate-app:` + `AA.CONFIG.reviewer`
  (`"jeff"`, hand-edited like the rest of `config.js`).
- **One proposal names one face.** The contact engine's candidates are
  feature groups (a bore split in halves: `[78, 79, 275, 276]`). The pass
  proposes the group's first face and names the siblings in the basis where
  they matter. The fit of either half gives the same axis or centre.
- **The CLI covers topology edges only.** A `stack_element` key is
  `no_such_key` today. Nothing in the first pass needed one.

## The first pass — per node

Topology `vpa_pitch_linkage`; mesh by its first 8 hex. "Rank" is the contact
engine's rank where a gap edge's candidate was used.

| # | edge | end | mesh face | conf | rank | basis |
|---|---|---|---|---|---|---|
| 1 | `pitch_link_length` | from | b221f534 104 | high | — | lower ball face; the two ball centres sit 105.9906 mm apart in this mesh, the edge's 105.9908 nominal |
| 2 | `pitch_link_length` | to | b221f534 140 | high | — | upper ball face; the two ball centres sit 105.9906 mm apart in this mesh, the edge's 105.9908 nominal |
| 3 | `pitch_link_bearing_bore_to_ball_centre` | from | 815597cb 30 | high | — | the r 2.41 mm (.190 in) bore through the ball, the only bore the ball has |
| 4 | `pitch_link_bearing_bore_to_ball_centre` | to | 815597cb 26 | high | — | the r 5.147 mm ball (the r 5.198 face is the race), centred on the bore axis |
| 5 | `pitch_link_bearing_ball_centre_offset` | from | 815597cb 0 | high | — | the r 7.141 mm outer-race OD, seated in the link eye at 0.003 mm clearance (contact engine) |
| 6 | `pitch_link_bearing_ball_centre_offset` | to | 815597cb 26 | high | — | the r 5.147 mm ball, not the r 5.198 race |
| 7 | `pitch_link_lower_centre_is_this_bearing` | from | 815597cb 26 | high | — | the bearing's r 5.147 mm ball; the engine's pair is its OD in the eye, coaxial at 0.003 mm |
| 8 | `pitch_link_lower_centre_is_this_bearing` | to | b221f534 104 | high | — | the lower ball, which every pitch-arm joint candidate names |
| 9 | `pitch_link_upper_centre_is_this_bearing` | from | 815597cb 26 | high | — | the bearing's r 5.147 mm ball; the same bearing part sits in both eyes |
| 10 | `pitch_link_upper_centre_is_this_bearing` | to | b221f534 140 | high | — | the upper ball, which every pitch-plate joint candidate names |
| 11 | `pitch_arm_link_joint` | from | e1c41692 78 | medium | 1 | r 2.413 mm bore = the .190 in joint bolt, on the ball-centre axis; rank 2 (r 6.35 mm) ties to 6e-6 |
| 12 | `pitch_arm_link_joint` | to | b221f534 104 | high | 1 | the r 5.147 mm ball every candidate the engine lists names |
| 13 | `pitch_plate_link_joint` | to | b221f534 140 | high | 1 | the r 5.147 mm ball every candidate the engine lists names |
| 14 | `tan_link_length` | from | 8f519ff4 64 | medium | — | mount-end ball; centres 61.45 mm apart vs 61.4 nominal: this bearing sits 1 deg tilted, 0.05 mm off its eye |
| 15 | `tan_link_length` | to | 8f519ff4 0 | medium | — | plate-end r 6.73 mm ball (MS14103-3); centres 61.45 mm apart vs the 61.4 nominal |
| 16 | `tan_link_ms14101_ball_centre_offset` | from | 34f032f0 0 | high | — | the r 7.141 mm outer-race OD, in the link eye at 0.003 mm clearance (contact engine) |
| 17 | `tan_link_ms14101_ball_centre_offset` | to | 34f032f0 26 | high | — | the r 5.147 mm ball, not the r 5.198 race |
| 18 | `tan_link_ms14103_ball_centre_offset` | from | e4414548 22 | high | — | the r 7.9375 mm outer-race OD, in the link eye at 0.0005 mm clearance (contact engine) |
| 19 | `tan_link_ms14103_ball_centre_offset` | to | e4414548 0 | high | — | the r 6.73 mm ball, the bearing's only spherical feature |
| 20 | `tan_link_mount_end_centre_is_this_bearing` | from | 34f032f0 26 | high | — | the bearing's r 5.147 mm ball; the engine's clear pair is its OD in the eye, refused by shape |
| 21 | `tan_link_mount_end_centre_is_this_bearing` | to | 8f519ff4 64 | high | — | the link's mount-end ball, the face the mount joint's every candidate names |
| 22 | `tan_link_plate_end_centre_is_this_bearing` | from | e4414548 0 | high | — | the bearing's r 6.73 mm ball; the engine's clear pair is its OD in the eye, refused by shape |
| 23 | `tan_link_plate_end_centre_is_this_bearing` | to | 8f519ff4 0 | high | — | the link's plate-end ball, the face the plate joint's every candidate names |
| 24 | `tan_link_mount_joint` | from | 9913d0cf 1569 | medium | 1 | r 2.415 mm bore = the .190 in joint bolt through the ball centre; rank 2 is r 7.66 mm |
| 25 | `tan_link_mount_joint` | to | 8f519ff4 64 | high | 1 | the r 5.147 mm ball every candidate the engine lists names |
| 26 | `tan_link_plate_joint` | from | 8f519ff4 0 | high | 1 | the r 6.73 mm ball every candidate the engine lists names |
| 27 | `piston_head_lower_thickness` | from | 5dbbe4e1 7 | high | — | the head's -Z face; the only flat pair 2.491 mm apart (the drawing's 2.491); named in the node note |
| 28 | `piston_head_lower_thickness` | to | 5dbbe4e1 0 | high | — | the +Z face, coplanar with the upper head's face 113 to 0.0004 mm (contact engine) |
| 29 | `piston_head_upper_thickness` | from | 8899ea5d 113 | high | — | the -Z face seated on the lower head (contact engine); the only flat pair 6.556 mm apart |
| 30 | `piston_head_upper_thickness` | to | 8899ea5d 110 | high | — | the +Z step face Jeff named 2026-10-20; the only flat pair 6.556 mm apart |
| 31 | `gas_spring_mount_flange_to_end_stop` | from | 6d5b1321 3 | high | — | the cover flange face, 8.667 mm below face 1080 (Jeff's 8.667); named in the edge note |
| 32 | `gas_spring_mount_flange_to_end_stop` | to | 6d5b1321 1080 | high | — | the end-stop face named in the node note; also the far end of the unique 76.86 mm pair |
| 33 | `gas_spring_mount_datum_a_to_end_stop` | from | 6d5b1321 83 | medium | — | the only flat face 76.86 mm from face 1080; the hub contact itself is unreadable (no occurrence) |
| 34 | `gas_spring_mount_datum_a_to_end_stop` | to | 6d5b1321 1080 | high | — | the end-stop face named in the node note; the only flat pair at the 76.86 nominal |
| 35 | `bushing_214820` | from | 64fc8465 13 | high | — | the bushing face the bolt head's face 31 lies on (contact engine, 99% overlap); 4.7625 mm pair |
| 36 | `bushing_214820` | to | 64fc8465 12 | high | — | the bushing face on the bearing's face 35 (contact engine); 4.7625 mm vs the 4.76 nominal |
| 37 | `pitch_link_eye` | from | 815597cb 35 | medium | — | the ball face on the bushing (contact engine); pair 7.112 mm vs 7.14 -- bearing identity unconfirmed |
| 38 | `pitch_link_eye` | to | 815597cb 34 | medium | — | the ball's other flat face; pair 7.112 mm vs the 7.14 nominal -- bearing identity unconfirmed |
| 39 | `washer_nas1149v0332` | from | 3b641a00 5 | high | — | the washer face on the pitch-plate lug's face 1432 (contact engine); 0.813 mm pair |
| 40 | `washer_nas1149v0332` | to | 3b641a00 4 | high | — | the washer's other flat face; 0.813 mm vs the 0.8128 nominal |
| 41 | `shank_out_pitch_link` | from | 3b641a00 4 | high | — | the washer's far flat face (off the lug); the engine's clear pair is the washer BORE, refused by shape |
| 42 | `bolt_length_11` | from | f9d87921 31 | high | — | the head's bearing face, on the bushing's face 13 (contact engine) |
| 43 | `bolt_length_11` | to | f9d87921 12 | medium | — | the point face, the only flat face 25.654 mm from 31 vs the 25.679 nominal |
| 44 | `fastener_grip_pitch_link` | from | f9d87921 31 | high | — | the head's bearing face, on the bushing's face 13 (contact engine) |
| 45 | `under_head_chamfer_washer` | from | 689de6a7 7 | high | — | the washer face under the bolt head's face 31 (contact engine); 1.600 mm pair |
| 46 | `under_head_chamfer_washer` | to | 689de6a7 6 | high | — | the washer's other flat face; 1.600 mm vs the 1.6002 nominal |
| 47 | `fastener_grip_vpa_out` | from | 1b082a0d 31 | high | — | the head's bearing face, on the countersunk washer's face 7 (contact engine) |
| 48 | `tan_link_mount_height` | from | 9913d0cf 134 | high | — | the mount face on the hub's face 526, 90% overlap at 0.05 mm (contact engine) |
| 49 | `tan_link_mount_height` | to | 9913d0cf 1569 | medium | — | r 2.415 mm bore = the .190 in joint bolt; the same face the mount joint proposes |
| 50 | `hub_spindle_to_tan_link_mount_face` | to | e28285d1 526 | medium | — | the hub face under the mount's face 134 (contact engine); gap 0.05 mm, at the reach limit |
| 51 | `pitch_plate_attach_radius` | from | 37e9f606 439 | high | — | one half of the plate's central bore (439/465), which is the assembly Z axis (tests pin it) |
| 52 | `pitch_plate_attach_height` | from | 37e9f606 439 | high | — | one half of the plate's central bore (439/465), which is the assembly Z axis (tests pin it) |
| 53 | `pitch_plate_gas_spring_offset` | from | 37e9f606 439 | high | — | one half of the plate's central bore (439/465), which is the assembly Z axis (tests pin it) |
| 54 | `pitch_plate_tan_link_attach_radius` | from | 37e9f606 439 | high | — | one half of the plate's central bore (439/465), which is the assembly Z axis (tests pin it) |
| 55 | `hub_to_pitch_plate_spindle_coaxiality` | to | 37e9f606 439 | high | — | one half of the plate's central bore (439/465), which is the assembly Z axis (tests pin it) |

## What decided it — the vision leg versus the shape class alone

The shape class alone decides **nothing** on its own here: every part has
several faces of the class an end asks for (the pitch plate has 430 flat
faces, the gas-spring mount 228). What decided the 55 was, in order of how
many it settled:

1. **The edge's own nominal, as a distance between two candidate faces.**
   This settled 13 thickness, length and offset pairs to one feature pair
   each, for example the pitch link's two ball centres at 105.9906 mm against
   105.9908. It is a scratch script, not a tracked tool. It is also the
   strongest discriminator the engine does not use.
2. **Contact with the other part an interface names**, which says which face
   is which end. This oriented seven pairs (bolt face 31 on bushing face 13,
   washer 5 on lug 1432, mount 134 on hub 526, and so on). The engine was run
   by hand on interface nodes it never compares.
3. **The topology's own node notes**: piston heads (7/0, 113/110) and the
   mount (3, 1080). These agree with (1) and (2) to the face.
4. **The contact engine**, for the ball side of the four ball joints: every
   candidate it lists names the same ball faces.
5. **The drawing crops**, read as images. On the pitch-plate bores they
   *overturned* the engine rather than confirmed it: drawing 215735 calls out
   the lug holes as ⌀7.950 / ⌀8.520 (r 3.975 / 4.26), and the engine's ranks 1
   and 2 are r 5.55 and r 2.413. So both plate ends went to the gap list, not
   to a medium proposal. On the tangential link the crop's ⌀14.288 eye matches
   face 84 (r 7.144) and supports the mount-end call. The two pitch-plate
   edges' "crops" are the whole sheet (`located_by: sheet_full`, no zone cited),
   so reading them took a full A2 sheet and a hunt for the callout.

**Time.** The pass took about an hour of this session, after the lane was
built. Most of it was writing the three scratch analyses: every edge against
the engine, nominal-distance matching per part, and node contacts. Each one
runs in seconds to a minute against the installed meshes. The hub (363k
triangles) was never fitted, and that is the largest single block of the gap
list.

## Debugging the engine — the deliverable Jeff asked for

Filed, each with face ids and numbers:

- `ISSUE_20261029_contact_engine_pairs_by_the_interface_word_against_what_both_ends_name.md`.
  **All four "single clear top" pairs are refused by the shape rule**: the
  pairing comes from the interface word, and the ends name ball centres or
  flat faces. The literal rubric ("clear top → high") would have proposed
  eight wrong-shape faces.
- `ISSUE_20261029_contact_engine_ranks_a_balls_seat_without_its_radius_and_the_drawing_refutes_its_plate_bores.md`.
  A 6e-6 tie between a bolt hole and a larger coaxial cylinder; planar seats
  ranked against a ball; the plate-bore ranks refuted by the drawing.
- `ISSUE_20261029_contact_exists_and_the_engine_finds_none.md`. The gas spring
  sits 51.54 mm from the plate it is pinned to; a coaxial slide is gated on a
  1.0 mm surface reach; the gas-spring mount has no placement; structural
  interfaces are never compared.
- `ISSUE_20261029_contact_occurrences_borrow_another_part_numbers_slot.md`.
  The U11D bolt is measured at a slot named `NAS6403U10D.3`.
- Already filed on integration, reproduced, not re-filed: which blade's lug
  (`ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`).
- Observed, not filed (a mesh observation, carried in two bases): in the
  tangential link mesh the mount-end MS14101-3 sits 1.0° tilted and 0.05 mm
  off its eye bore. So the two ball centres are 61.45 mm apart, not the edge's
  61.4.

## Gap list

190 edge ends; 55 proposed; 45 on parts with no installed mesh; **90 with a
mesh, left open**. Filed as `ISSUE_20261029_first_proposal_pass_left_ninety_meshed_ends_open.md`
(grouped by cause). The candidates where there were any:

- `pitch_plate_link_joint.from` and `tan_link_plate_joint.to`: plate 37e9f606
  r 5.5499 (1559/1560, 1502/1503) and r 2.413 (1547/1548, 1490/1491) are the
  engine's ranks 1/2. The drawing's lug holes are r 4.26 (1435/1436, 1496/1497)
  and r 3.98 (1553/1554, 1390/1391), ranks 3/4. Blade unknown.
- Plate lug faces (`pitch_plate_flange`, `pitch_flange_thickness`): 148 flat
  pairs sit 4.06 mm apart (5X lugs, 3X lugs, pockets). Lug face 1432 touches
  the washer at one blade.
- `fastener_grip_*.to`, `shank_out_*.to`, `thread_region`, `cotter_hole_from_point`:
  "end of the full shank" and "cotter-hole centreline" are positions along a
  cylinder. Shank faces are pitch-link bolt 7/9/36/37 (r 2.4065) and VPA bolt
  7/9/36/37. No face is the END.
- `shank_out_vpa_out.from` / `straight_bushing_vpa_out`: plain bushing 0cdfaf20
  faces 12/13 are 4.7625 mm apart, and nothing says which touches the
  (unmeshed) bearing.
- Rotor stack `washer_ms21299c3` (b426a7f9 6/7), `washer_nas1149v0332_tt`
  (3b641a00 4/5), and `straight_bushing_tan_link` (64fc8465 12/13): thickness
  matches, but no contact orients them (`no_contact` between the two rotor
  washers and between the 13H bolt and its bushing).
- `spherical_bearing_tan_link` (width 11.1): no flat pair on 34f032f0 at 11.1.
  The bearing width is not this mesh's.
- Everything on the hub (e28285d1), the blade root (bb3745d2), the gas spring
  (673d2ced) and the rest of the mount (6d5b1321): see the issue.

## Anchor census

By `model_layer.js`'s precedence (joint > bound > section > origin) over all 74
nodes of `vpa_pitch_linkage`. `section` is counted as "the node's home part has
an installed mesh". The P2 joints are the four the run's features name
(`pitch_link_{lower,upper}_sphere_centre`, `tan_link_{lower,upper}_sphere_centre`).

| | joint | bound | section | origin |
|---|---:|---:|---:|---:|
| bind mode, today | 0 | 0 | 59 | 15 |
| bind mode, every `high` accepted | 0 | 23 | 37 | 14 |
| bind mode, every proposal accepted | 0 | 28 | 32 | 14 |
| sweep P2, today | 4 | 0 | 55 | 15 |
| sweep P2, every `high` accepted | 4 | 19 | 37 | 14 |
| sweep P2, every proposal accepted | 4 | 24 | 32 | 14 |

(The 10-26 lesson's 36/4/0/7 was the pre-fold topology's 47 nodes; the folded
one has 74.)

## Found on arrival

Nothing: the worktree was clean, and this session wrote nothing tracked into
the main checkout. It wrote only gitignored inbox events and projections there.

## Verification, as recorded

Every `[real]` and browser run of the viewer read a scratch root,
`C:\workspace\tolstack\data\scratch\agent_proposes\` (gitignored). It holds
this tree's `apps/` and `docs/`, junctions to the main checkout's
`data/meshes` and `data/inbox/{linkage-sweeps,specs,drawings,feature-identity,tolerance_stacks}`,
and **every** projection rebuilt there from this branch: topology, viewer,
part names, crops, contact suggestions, kinematic, feature identity and fits
(58 s). The shared viewer projections in the main checkout were not written,
so master-based worktrees are not locked out. **Delete the scratch root after
the review** (small: the meshes are a junction).

| tier | where | result | wall |
|---|---|---|---:|
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` | worktree, at `161913cf` | **1654 passed, 1 skipped, 1 failed**. The failure is `test_viewer_js_suite`, the by-design worktree red; its tier ran 621/621 below. The skip is the pitch-link bearing re-extraction test (no such mesh installed). An earlier full run at `a41ee614` had one more red, `test_no_persisted_field_vocabulary_is_an_inline_literal`, on two inline verdict sets; that was fixed in `161913cf` as `FACE_VERDICTS` / `HUMAN_ONLY_VERDICTS` | 319 s, inside budget |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | scratch | 621/621, node-fs tier ran | 9 s |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | scratch | 33/35 full run. The two reds are the ones `ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md` (on integration) already records. "crop lightbox" passes alone, 20/20. "3D pane follows the selection" failed `[real] ...and leaving it takes the light down` alone once, then passed 32/32 alone on this branch's `apps/` and 32/32 on the base `bf180b3d`'s. Not filed again | 463 s |
| `node apps/annotate/run_tests.cjs` | worktree | 255/255 | — |
| `node apps/annotate/run_browser_check.mjs` | worktree | 103/105. The two reds are the mock-anchor checks, red on the base commit too (80/82 there, measured this session) and already filed as `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`. Every check in the two new proposal passes (accept and reject) passes | 39 s |
| `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack` | main data | 28/28 reached in 6m10s, 0 left to the sweep; **all 8 new specs WITNESSED**. 13 browser entries NOT WITNESSED with "the tier was red before the mutation": that first run read the main checkout's projections, built from master | 6m10s |
| the same, `--repo <scratch>` | scratch | **28/28 witnessed, 28/28 reached**, 0 left to the sweep; exit 0 | 8m31s |
| real-data annotator check (`data/scratch/agent_proposes/check_proposals_real.mjs`, served over HTTP from the scratch root) | scratch | the first study's rail: 4 chips; `pitch_link_length` dashed outlines on faces 104 and 140, on all 4 occurrences; both proposals in the bar with Accept and Reject. Anchors unchanged: bind 59 section / 15 origin, P2 sweep 4 joint / 55 section / 15 origin (equal to the Python census). Hollow markers: 28 bind, 24 sweep. No page error | — |

Pytest wall time recorded with `dispatch suite-time record` (default tier):
inside budget.

## Things to know before merging

- **The main checkout's inbox now holds 55 `proposed` events, and only this
  branch's schema can read them.** A hand run of master's
  `scripts/build_feature_identity_projection.py` or `scripts/fit_bound_features.py`
  will fail on `verdict must be one of ('bound', 'owner_not_in_set')` until this
  merges. No master test and no step of `scripts/rebuild_projections.ps1` reads
  the live inbox; I checked with `git grep` on master. The main checkout's
  `data/projections/feature-identity/bindings.json` was rebuilt from this
  branch (the DoD's "after a projection rebuild"), so its stamp is this
  branch's.
- `node_modules` in this worktree is a junction to the main checkout's
  (gitignored), so the browser tier can import `playwright-core`.
- The scratch analysis scripts (every edge against the engine, nominal-distance
  matching, node contacts, census, gap list, the report builder) were not
  tracked. The report they produced is the 55 inbox files themselves.

