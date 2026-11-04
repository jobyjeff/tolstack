# LESSONS 2026-11-03 — a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there

Handoff: `docs/sessions/HANDOFF_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there.md`,
from Jeff's forge note `20261103T165357_43vf96`. Every end with an agent's
proposal or the contact engine's faces now has a ▸ in front of its row. It
opens the end's candidate list: proposals first, then the engine's faces, one
row per face, each saying why it is there. Hovering a row washes the face in
the pre-selection's yellow, Take binds it, and Pick another face ends the
list. This works on the kinematic rail, on bind mode's element rows (both ends,
each under its name) and in the shell's mirror of either.

## What "10 candidates" was

The closed row's count was the contact engine's **ranked pairs** on the edge,
not faces at this end. All 10 pairs on `hub_to_pitch_plate_spindle_coaxiality`
share the pitch plate end's two faces (439, 465). So "candidates · 10" on that
end meant two faces. On the hub end the 10 pairs cover 26 distinct faces. The
count is now the faces listed (`AA.endContactFaces`, one row per face, in the
order of the best-ranked pair each appears in). The fast tier pins the
de-duplication. Nothing was lit because selecting a candidates end outlined
only the top pair's first face, dashed. No hover existed.

## The reach table, after (real projection, 55 open proposals)

| entry | open proposals reachable as a candidate row |
|---|---:|
| topology row (bind mode, every edge, each element's ▸ lists both ends) | **55 / 55** |
| kinematic study `vpa_pitch_linkage_blade_pitch_at_the_stops` (joint ends) | 5, as before: the kinematic rail lists only the 9 joint-end rows |

The 55/55 is re-measured on every run by the annotate `[real]` check "every
open proposal is a candidate row on an end of some edge…". Across the
topology, 61 ends have a list: 55 carry a proposal and 20 carry contact faces.
That is 145 rows, 90 of them the engine's.

## Which reasons the engine can state

The words are keyed by the generated relation and pairing vocabularies
(`AA.CANDIDATE_RELATION_REASONS`, `AA.CANDIDATE_CONTACT_REASONS`, in
`apps/annotate/suggestions.js`), so a new relation throws at load. The mate's
noun comes from the evidence (`bore`/`ball`/`plane` sides), else its surface.
Counts on the real projection:

| reason | rows |
|---|---:|
| agent suggested · high / medium | 45 / 10 |
| seated against the mating ball | 39 |
| coaxial with the mating pin | 16 |
| coaxial with the mating round face | 10 |
| square to the mating face | 8 |
| seated against the mating race | 7 |
| seated against the mating bore | 6 |
| square to the mating axis | 3 |
| coaxial with the mating bore | 1 |

- **No end has a candidate with no stateable reason.** The `[real]` check
  fails if one appears.
- **"Parallel with the mating face" (Jeff's example) cannot be said.** The
  engine's relations are `contact`, `coaxial` and `across` only. It has no
  parallel relation, so no row claims one. "Coincident with the mating face"
  (plane-on-plane contact) is in the table, but no real end produces it today.
- **"Coaxial with the mating round face"** is a coaxial pair where the engine
  could not say which side is the bore (no `bore` in the evidence: both
  convex, or both concave).

## Decisions not in the handoff

- **One row per face, not per ranked pair.** A binding is one face, so Take
  binds what its row names. A pair's side can hold two to four faces (a split
  cylinder's halves). Grouping them would make Take guess one.
- **The twisty is a `span role=button`, not a `<button>`.** The rail's
  `:scope > button` children are a row's actions. The shell mirrors them as
  its controls, and two browser checks pin "Accept and Pick a different face,
  and nothing else". The mirror carries the twisty as `row.twisty` (its title)
  plus `row.open`. `nav.js` draws it as a real button in front of the row, and
  the row's own click still selects. A twisty row is not a `<details>`: that
  would take the select away (the fast spec for the nav check is exactly that
  mutation).
- **Bound ends keep their list.** The face standing there reads "· bound" and
  has no Take, and any other face can still be taken (it supersedes). A
  proposed face that the engine also ranked is listed once, as the proposal,
  with the engine's reason in its hover.
- **The surest proposal's Take is `accept`**, as the handoff says. Any other
  row runs the new `take <edge> <end> <mesh> <face>` verb. It is an armed click
  with the face named: `AA.planArmedClick`, then `AA.planAnswer`'s `pick`, then
  `writeAnswer`. `take` on a proposed face ratifies it, and on any other face it
  writes `rejected` for each open proposal there and then `bound`. `cmdAccept`
  and `cmdTake` share their after-write steps (`answeredAtEnd`). One change in
  behaviour: `accept` now shows the toast in bind mode too.
- **Bind mode's "Pick another face…" selects the element.** The CAD-style arm
  is sweep-only. Bind mode's pick is a click in the scene, and the bar asks
  which end.
- **`hover face` works in either mode.** In bind mode a part that is not open
  is loaded first and the camera is put back. In sweep mode only open parts
  wash. A token keeps a slow load from washing a face the pointer has left.
- **The wash is the pre-selection's own drawing** (`scene._drawWash`, which
  `_drawPreselect` now calls). `washFace` needs no pick filter, sets no cursor
  and calls no `onPreselect`. The `[real]` hover spec is the mutation that
  gates it on a pick filter, the shape of Jeff's "nothing is visibly
  hilighted".
- **Debounce.** The pane's candidate hover is trailing, at
  `AA.CANDIDATE_HOVER_DEBOUNCE_MS`. The fast tier pairs that value against
  `VA.PANE_HOVER_DEBOUNCE_MS` by reading `viewer.js`.
- **Cap at `AA.CANDIDATES_LISTED` (8) with "show all n"** (the handoff's first
  suggestion). The hub end has 26 faces. A list one longer than the cap is shown
  whole, because a "show all 9" row would cost as much as the ninth row.
- **Not built: grouping a two-part end's candidates by part** (the handoff's
  second suggestion). Measured on the real projection: none of the 61 lists
  spans two parts, proposals included, so a grouping would never show.
- **The armed line now refreshes when the part's classes land** (from
  `ISSUE_20261029_no_check_hovers_the_real_bore…`): a face pre-selected before
  classification finished read "face N" alone until the pointer moved.
- **The existing guard "…reads 'candidates · 3'…" keeps its name.** I gave
  its mock fixture three distinct faces instead of renaming the guard. The
  de-duplication is pinned in the fast tier, where it is cheap.

## Shell-mirror selectors added (`railRow`, `apps/annotate/app.js`)

- `.tree-cands__head` joins the heading selectors (`.an__tree-head, .el-head`).
- On a row: `:scope > .tree-row__twisty` becomes `row.twisty` + `row.open`,
  and its node is the row's `toggle` target. `railGesture`'s toggle clicks a
  control, or flips a `<details>`.
- On a row: `:scope > .tree-cands` becomes `row.rows` (railRows over the list).
- `.tree-cand` becomes `row.wrap`. `nav.js` gives such a row
  `navtree__scenerow--wrap`, whose name and state line wrap instead of
  clipping.
- `nav.js`: a row with `twisty` draws `button.navtree__scenetwisty`
  (`data-scene-part="twisty"`) in front of it, keeps its `activate`, and
  appends its `rows` under it when `open`.

## Gotchas

- A bash heredoc mangled an em dash into U+FFFD in `apps/annotate/README.md`
  (fixed). Put non-ASCII edits in a file the Write tool writes.
- The viewer's node DOM shim has no `insertBefore`. `nav.js` builds the twisty
  before the text instead of inserting it.
- A camera compared before and after a hover must be read once the selection's
  framing has stopped damping (`settledCamera` in the browser runner).
- The mock contact fixture's faces are `planar`, so its rows read
  "face 1 · flat", not "face 1".
