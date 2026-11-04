---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-03 — a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there: every side of every joint expands into its suggested faces, hover lights one in 3D, and any of them can be taken

Source: Jeff's forge note `20261103T165357_43vf96` (2026-11-03), after trying
to bind on the shell's kinematic rail: *"doesn't seem like the selection
candidates are working correctly. Hub and pitch plate spindle bore axis both
claim to have 10 candidates, but nothing is visibly hilighted when I try to
select those. I also don't see any evidence of the agent's attempt at binding
all the surfaces. I think a better way to do the UI would be for each side of
each joint to have a collapsible element that lists out all the suggested
surfaces, mouse hover causes the surface to hilight in the 3d view and gives a
tooltip showing why it is suggested (ie coincident/coaxial with mating
feature, parallel with mating feature, agent suggested, etc) and then lets you
select any item from the list, or 'select other' which lets you choose any
surface from the 3d picker."* That paragraph is the design. This handoff
builds it; it does not re-decide it.

Baseline: `master` with `a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place`
(10-29), `a_face_is_picked_the_way_cad_picks_it` (10-29),
`an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed` (10-30) and
`the_annotator_has_no_front_door` (10-30) landed. Scope: `apps/annotate/`
(the pane: `sweep.js`, `binding_state.js`, `app.js`'s rail rows and
`postEmbedTree`), `apps/viewer/views/nav.js` (the shell's mirror of those
rows, `sceneControls`), `docs/ANNOTATION_SURFACE.md`, their tests. Do NOT
touch `docs/topologies/` or the contact/proposal scripts (owned this batch by
`the_slide_joint_is_the_mounts_bushings_against_the_piston_body`), nor
`apps/viewer/views/kinematic.js` / `topology.js` (owned by
`the_kinematic_grid_is_a_stack_of_sub_stacks`).

## What the rail does today, measured 2026-11-03

- A joint end's row carries one suggestion line from `AA.endSuggestion`
  (`apps/annotate/app.js` ~2977): `{kind: "proposed", …}` renders
  "suggested · high" and selecting the row lights that one face solid;
  `{kind: "candidates", n, face}` renders **"candidates · 10"** and selecting
  the row lights **nothing** — the count is all the reader gets. The words are
  in `apps/annotate/binding_state.js` ~351 (`candidates: "candidates · {n}"`),
  the kinds in `apps/annotate/sweep.js` ~1486 (`AA.SUGGESTION_KINDS`).
- The ranked faces exist: `state.contactSuggestions` (built by
  `scripts/build_contact_suggestions.py` into the viewer projection; read by
  `AA.contactRowsFor` / `AA.findContact`, `app.js` ~980/1058) carries, per edge
  end, the faces with their evidence (coaxial / coincident / parallel with
  the mating feature, radius, rank). Agent proposals (`scripts/propose_bindings.py`,
  `feature-identity/v0` events) carry `who` and `why`.
- Only **5 of the 55** open proposals sit on a joint end any sweep lists; the
  other 50 are on edges answered from the topology row's bind-mode bar
  (`docs/issues/ISSUE_20261029_fifty_of_the_fifty_five_proposals_are_answered_from_bind_modes_bar_not_a_rail_row.md`,
  with its measured table). Jeff saw none of the agent's pass on the
  kinematic rail because that rail only lists joint ends.
- The shell mirrors the pane's rail rows into its own nav
  (`postEmbedTree` → `views/nav.js`); the sub-line selectors are an allowlist
  (the 10-29 lesson: a chip missing from that list was invisible in the shell).

## Deliverables

1. **Each joint end is a collapsible element.** In sweep mode (the kinematic
   rail) and in bind mode (the topology row's and a chain study's element
   list), every end row gets a disclosure (▸) that opens its **candidate
   list**: the agent's proposal first when one exists (marked as such, with
   who/why), then the contact engine's ranked faces, each row reading
   `face <id> · <surface class> · r <mm>` and the **reason it is there**
   (reader words: "coaxial with the mating bore", "coincident with the mating
   face", "parallel with the mating face", "agent suggested", in the
   `AA.SURFACE_WORDS` vocabulary; never an engine field name). The closed row
   keeps a one-line summary (`suggested · high`, `candidates · 10`,
   `bound · face 104`, or nothing). The reach rule: **every end with a
   proposal or candidates, in every rail that lists ends** — so all 55
   proposals become reachable the same way. Measure and record the reach
   table (the issue above has the before).
2. **Hover lights the face; the tooltip says why.** Resting the pointer on a
   candidate row paints that face in the 3D pane with the pre-selection wash
   the armed pick already uses (yellow wash + outline, 10-29 gesture table),
   frames nothing (the camera stays), and shows the reason as the row's
   title/tooltip. Leaving the row clears it. Same debounce discipline as the
   pane's hover (`VA.PANE_HOVER_DEBOUNCE_MS`).
3. **Any candidate can be taken.** Clicking a candidate row's **Take** binds
   that face through the one write path (the `accept` verb when it is the
   proposal, otherwise `rejected`-then-`bound` as the armed pick does for a
   non-proposed face — `AA.answerSupersedes` rules unchanged). A **Pick
   another face…** row at the end of every list arms the CAD-style pick on
   that end (plain `arm`). The row then reads `bound · face N` and a toast
   names the write, as today.
4. **The shell shows all of it.** The disclosure, the candidate rows, the
   reason text, Take and Pick another face are mirrored into the shell's nav
   rows (`postEmbedTree` / `nav.js` allowlist widened by name), hover from a
   mirrored row reaches the pane, and Esc from the shell still disarms. A
   candidate list wraps onto its own lines in the ~330 px rail; nothing is
   clipped (Jeff's 10-29 complaint).
5. **The gesture table grows one section.** `docs/ANNOTATION_SURFACE.md`,
   "Picking a face — the gestures": add "Taking a suggested face" with the
   rows above. One statement.

Suggestions to investigate, labelled as such: cap the open list at the top
8 candidates with a "show all N" row; group candidates by part when an end
spans two parts (the 10-30 `arm part` switch exists).

## Definition of done

- `http://127.0.0.1:8000/tolstack/viewer/` → Kinematic studies → Blade pitch
  at the end stops → joints → the hub spindle bore axis end: its row expands
  to the ranked faces with reasons; hovering one lights it in the pane
  (screenshot with the wash visible); Take on one writes a binding on a
  scratch data root (never the real inbox — copy
  `C:\workspace\tolstack\data\inbox\feature-identity\` as the rail-row
  handoff's lesson did) and the row reads `bound · face N`.
- The topology row (bind mode): every one of the 55 open proposals is a
  candidate row on some end; the reach table in the lesson shows 55/55.
- `node apps/annotate/run_tests.cjs` and `node apps/viewer/run_tests.cjs`
  green; `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  green with a new check that hovers a candidate row and asserts the face's
  material state; `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  witnesses the new guards. `venv-win/Scripts/python.exe -m pytest -q` green.
- Issues routed here (`status: triaged` + `handoff:` before starting,
  `resolved` after): `ISSUE_20261029_fifty_of_the_fifty_five_proposals_are_answered_from_bind_modes_bar_not_a_rail_row.md`,
  `ISSUE_20261029_no_check_hovers_the_real_bore_so_the_dods_class_and_radius_line_is_unwitnessed.md`
  (the new hover check covers it or the lesson says why not).
- Lesson (`docs/sessions/lessons/LESSONS_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there.md`):
  the reach table after; which reasons the engine can state and which ends
  have candidates with no stateable reason; shell-mirror selectors added;
  three screenshots (closed row, open list with hover, after Take).
