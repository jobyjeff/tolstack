# LESSONS 2026-11-18 — a_bound_pattern_offers_the_whole_pattern_on_the_other_part

Once one side of an interface holds two or more holes, the other side's
suggestions now lead with one row: the whole pattern on that part. It is
`AA.rankOppositePattern` in `apps/annotate/suggestions.js`, which runs the
mate's own coaxiality test (`AA.rankMatingFaces`) once per bound hole. It adds
no second geometric rule. The row is `CANDIDATE_ROW_KINDS[3]` (`pattern`).

## The rule for several coaxial cylinders on one axis

For each bound hole, the other part's cylinders on that hole's axis are
grouped into surfaces (`AA.surfaceGroups`). Each surface must be a whole hole
(arc ≥ `AA.PATTERN.wholeArcDeg`). The surfaces are then grouped by size, using
the pattern rule's radius fraction.

- **The size that answers the most bound holes is taken.**
- **Ties go to the size nearest the bound holes' own, then to the smaller
  size.**

One size is taken, so the set fits as a pattern: `AA.holePattern` and
`fit_face_set` refuse a mix of sizes. A fastener's line through both parts is
the nearest size. The other sizes stay as their own per-face mate rows, and
the pattern row names them ("Ø6.69, Ø6.3, Ø5.8, Ø3.31 on the same axes, each
its own row"). A bound hole that the taken size does not answer is left out
and counted ("7 of 10"). It is never filled. One bound hole is no pattern,
and no row is offered.

A solid is named only when the taken faces are **off the part's own solid**,
meaning the solid that holds most of the mesh's faces. The first cut named
every solid, which printed "in solid 1 of 286" on the hub and said nothing.
The solid comes from the manifest's `solid_id`, kept per mesh in
`state.faceSolids`. The face classes do not carry it, and the Python twin of
the classifier does not either.

## Each v2 pattern joint, and what it offers today

Real meshes and the real log, read-only (scratch probe over
`AA.classifyPartFaces`):

| joint | bound in the real log | offered on the other side |
|---|---|---|
| `tan_link_mount_fastener_clocking` (tan link mount ↔ hub) | hub, 1 hole (0083) | nothing: one hole is no pattern. Bound from the mount's side, any of its five rings offers **10 of 10 Ø5.5** on the hub |
| `gas_spring_mount_fastener_clocking` | gas-spring mount, 10 × Ø5 (0086) | tan link mount **10 of 10 Ø5**, out of five sizes per axis (Ø5/5.8/6.3/6.69/3.31). Faces 72,73,161,162,169,170,175,176,179,180,1123,1124,1126,1127,1129,1130,1131,1132,1351,1352 |
| `piston_cover_fastener_clocking` | both (0088, 0092) | each way: cover → mount **5 of 5 Ø4.75** (exactly Jeff's hand-bound 0088 faces), mount → cover **5 of 5 Ø5** |
| `gas_spring_piston_fastener_clocking` | neither | plate → piston **5 of 5 Ø4.9**, piston → plate **5 of 5 Ø5.2** |
| `piston_head_upper_fastener_clocking` | neither | head → piston **3 of 3 Ø5.3**, piston → head **3 of 3 Ø5.2** |
| `pitch_arm_blade_root_clocking` | neither | nothing: no like-holes pattern on either part has an answer on the other |

No v2 pattern takes its holes from another solid. That case is pinned by the
fast tier only, on real records with two holes reassigned to another solid.

## The definition of done, walked (scratch root, real log copied)

`tests/debug_opposite_pattern_20261118.mjs` is a hand-run probe built on the
2026-11-15 probe's server and folder grant. It writes to
`data/scratch/opposite_pattern_20261118/` and removes it afterwards. **The real
log had 100 files before and 100 after.**

Neither side of `gas_spring_piston_fastener_clocking` is bound in the real
log, so the probe bound one side in the copy first:

- **Pitch plate side, in the copy.** Pick a face on the plate's fastener
  pattern, then a click on face 2. The bar read "5 like holes on one plane".
  Take all wrote `0101_pitch_plate_pilot_to_piston_fasteners.json` with faces
  2, 3, 553, 554, 559, 560, 565, 566, 571 and 572.
- **Piston body side, at rest (shot 02).** The body leads with "5 of 5 holes
  Ø4.9, coaxial within 0.000 mm / the whole pattern bound on 215177-001 pitch
  plate", then the per-face mates. The row is clipped at the rail's rest width
  and its title carries the whole line.
- **Hovered (shot 03).** The wash took faces 110–119 (20 overlays). In the pane
  the holes in view are washed yellow. The pane's framing is side-on and narrow,
  so only three holes are in view.
- **After Take (shot 04).** Take wrote `0102_piston_body_id_datum_to_fasteners.json`,
  one `bound` event on `gas_spring_piston_214700_002`, with faces 110, 111, 112,
  113, 114, 115, 116, 117, 118 and 119. The body reads "bound · 10 faces of
  214700-002" and then "5 holes Ø4.9 on a Ø72 circle". Unbound dropped from
  34 to 32.

The click-around turned up one thing outside the handoff. After the plate's
Take all, the plate's pick still read "picking … Cancel" until the piston's
Take ended it. `bindArmedFaces` disarms only after `writeAnswer` returns,
which includes the served-log rebuild (11.6 s here). This is the slow write
already filed on integration (commit d573a369, "the slow write on the pitch
plate"), so nothing new was filed.

Shots: `docs/sessions/lessons/shots/a_bound_pattern_offers_the_whole_pattern_on_the_other_part/`,
2560×1440, `01`–`04`, each read before this lesson was written.

## Every site the offer reaches

- **Feature body (shell, `nav.js`):** a line with `face.faceIds`. Its look is
  `camera face <ids>` and its Take is `take <edge> <end> <mesh> <face>
  <topology> <face>...`.
- **The pane's candidate list:** the hover is `hover face <mesh> <ids>`, and
  the Take names the set. The **armed pick** pre-lights the set's faces.
- **Head offer:** an armed click, or a single-face Take, on one of the set's
  holes shows the bar with the row's own line and "Take all N holes", in place
  of the part's like holes.
- **`scripts/propose_bindings.py` does not carry it.** It proposes one face
  per row, and the rule lives only in JS. Filed as
  `ISSUE_20261118_propose_bindings_proposes_no_opposite_pattern.md`
  (`audience: strategy`).
- The set hover fixed `ISSUE_20261118_a_disagreeing_sets_line_lights_only_its_first_face`
  along the way. A disagreeing set's line carries its ids, so that issue is
  marked resolved.

## Gotchas

- **A heredoc'd Python edit turned `"\n"` into a real newline** inside a JS
  string in `app.js`. The pane failed to load (`SyntaxError: Invalid or
  unexpected token`). My syntax loop hid it, because `node --check f | head &&
  echo ok` prints ok whatever `--check` says. A baseline run of the existing
  pattern suite on a `git archive` export of the branch point (green, 11/11)
  is what put the fault in this diff. Check with `node --input-type=module
  --check < app.js` and read the exit code.
- `svg.tv__rails` is gone with Classic (2026-11-17). Old debug probes that
  wait on it time out. Wait on a `#navtree` feature row or twisty instead.
- `parseHover("face", …)` now always returns `faceIds`. The one fast check
  that pinned the old shape was updated.

## Test record

See the report in this session's hand-back. The counts are copied there from
each run's own output.
