# Lessons — the_travel_between_the_end_stops_is_a_study (2026-10-16)

## The answer

| | mm |
|---|---:|
| Nominal travel between end stops | **58.4866** |
| Worst case | 58.2866 to 58.6866 (±0.2000) |
| RSS | ±0.1000 |

Both intervals come from the placeholder width alone (±0.05 on each of four
terms). Beside it, with no claim about which is right: the ATP's derived travel
is **65.03 mm** against a **≤65 mm** acceptance row (atp-post, S4ATS-2439) — taken
from the handoff, not re-read — and S461-516/637's nominal operating stroke is
61.67 mm.

## Placeholders, and the todo

All four terms are placeholders (`kind: assumed`, `untraced`): the two head
thicknesses and the mount thickness are mesh fits, the cover length (82.154) is
Jeff's figure with no mesh and no cross-check. Forge todo
**`20261016T165622_zy675c`** asks Jeff for the 214958-002, 214699-002 and
214698-002 PDFs; no drawing landed during the session. Repo-side issues carry
`needs: jeff` for the drawings and for the stop-face question (below).

## The face order (CAD Z; assembly Z = part Z − 23.333861, all three meshes share one placement)

Piston body far end 102.17 < lower head lower face = body shoulder 210.84 <
lower head upper face = upper head lower face 213.33 < body top 215.84 < upper
head recess floor 215.94 < upper head's stepped upper faces 217.34 … 225.84. Full
table with face ids in the worksheet. All plane fits have zero residual.

## The piston body is not a member

The heads seat against each other and the lower head sits on the body's
shoulder; they are not at the body's two ends. The body top is 0.1 mm *below*
the upper head's recess floor. Jeff's ~108.669 is exactly 234.169 − 125.500, the
body's shoulder-to-far-end length: a different question, on no edge here.

## Decisions not in the handoff

- **The handoff's one "other stop" node could not be one node.** A hard contact
  is a single node, so a study ending on it would walk both stacks to the same
  place and close a ring (the walk refuses rings). I split the far stop into the
  upper head's upper face and the mount's end-stop surface and put the derived
  gap `travel_between_end_stops` between them; the study runs from the first to
  the second with the main datum as the interior node where the head stack and
  cover stack meet. The datum is still a one-node contact. Edges are all authored
  +Z at the feather stop so the signs fall straight out of the walk (−, −, +, −).
- **Which upper-head face meets the mount's stop is unknown.** The head is
  stepped, the mount mesh has no placement, the cover no mesh. I took the topmost
  plane (face 149 → 58.487); the other three give 62.281 / 64.440 / 66.987. Issue filed.
- **A study with no check has nowhere to put `complete: false`.** The requirements
  state no number, so no check and a `no_checks_reason`; incompleteness is in the
  notes and on the edges. Issue filed for a design call.
- **One extra valueless edge**, `gas_spring_mount_hub_face_to_cover_seat`, ties the
  chain to the rest of the graph (the existing note on disconnected topologies
  says the viewer's rail needs one piece). It carries no value and is in no study.
- **Placeholder width ±0.05** on every term, the width the pitch-system file already
  uses for feature-to-feature stand-ins.

## Edits outside the stated scope, forced by guards

The handoff fenced `apps/`; the viewer's `[real]` tier pairs README/comment counts
against the live projection, and five numbers moved with the new graph:
`apps/viewer/README.md` (crossings 265 → 309; 34 of the 72 live nodes → 36 of the
77; rail allocations 12 over 11 → 13 over 11) and `apps/viewer/views/topology.js`
(the same 34/72 comment, and 26 → 28). Digits only. Also
`tests/test_tolerance_stack.py` `_RATIO_PUBLISHER_COUNT` 11 → 12 (every
`WORKSHEET_*.md` must declare the traced ratio), and the `PROVENANCE.md` row for
that test file. The parallel handoff `a_kinematic_study_folds_the_sweeps_jacobian`
reads this topology and may touch the same README lines — expect a trivial merge.

## Gotchas

- A new worksheet's `claim` fence is invisible to the guards until the file is
  **tracked** — the first run was red until I committed.
- A traced-ratio declaration must also be stated in prose beside the fence
  ("5 of 26"), or the rendered-value pairing fails.
- Topology prose fields (`description`, `notes`, `provenance`) and the DAG doc's
  section are scanned for sentences that count two or more graph things; I wrote
  none.
- Windows MAX_PATH: building crops into a deep scratchpad path fails; use a short
  path.

## Projections

I did **not** rebuild the shared projection. I built a shadow copy
(topology, results and crops builders with `--allow-older-tree` into a scratch
`data/` copied from the main checkout, docs from this tree) and ran the viewer
`[real]` tier against it: 522/522. The scratch copy is deleted.
`scripts/build_topology_projection.py` against the main checkout's data root was
not run.

## Still to do

Drawings (todo above); the stop face; mutation-witness tier not run (not touched
by this change; it is the merge's job); re-cite and widen nothing until drawings
land.
