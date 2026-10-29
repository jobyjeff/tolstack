---
priority: high
depends_on: [the_plus72_stop_is_the_travel_datum]
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place: the kinematic rail's "no face bound" becomes "suggested · high", selecting the row lights the proposed face, and Accept / pick-another live on that row

Source: Jeff, live, 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`), after trying to
ratify the 55 proposals `an_agent_proposes_a_face_binding_and_a_human_ratifies_it`
wrote: they were only reachable from the **standalone** annotator page's
bind-mode rail and bar (`apps/annotate/app.js`), filtered by chain study, so
he found 4 of 55. The rail he actually uses — the shell's KINEMATIC STUDIES
rail, drawn by the embedded pane (`apps/annotate/sweep.js`, the
`no face bound` line ~1663, the **Pick** action per joint end) — shows no
proposal at all. Jeff:

> The "no face bound" should indicate that there is a suggestion to approve,
> when you select that row in the menu, it should hilight the surface in the
> 3d viewer, and give you an option to approve or select a different surface.

Baseline: `master` with the datum handoff landed (it rewrites
`apps/viewer/views/kinematic.js`; this handoff does not touch that file).
Scope: `apps/annotate/sweep.js` (the kinematic rail), `apps/annotate/scene.js`
(highlight + camera framing of a proposed face), `apps/annotate/binding_state.js`
/ `suggestions.js` as needed, the proposal read in `apps/annotate/app.js`
(**move** the Accept/Reject write path — `AA.buildAcceptEvent` /
`AA.buildRejectEvent` and the bar's handlers, ~lines 4250–4291 — out of the
standalone bar into a module both rails can call; do not leave two copies), `apps/annotate/tests.js`,
`apps/annotate/run_browser_check.mjs`, `scripts/run_viewer_browser_tests.mjs`,
`docs/ANNOTATION_SURFACE.md` ("Proposals" and "On the surface"). Do NOT touch
the standalone page's own chrome (dropdowns, "Set up automatically", its rail)
— `the_annotator_has_no_front_door` deletes it next, and depends on this.

## The data (all in the main checkout, read by absolute path from a worktree)

`C:\workspace\tolstack\data\inbox\feature-identity\0001_…0055_*_proposed.json`:
55 `verdict: proposed` events, all `stack_key.kind: topology_edge` on
`vpa_pitch_linkage`, **33 distinct edges**, each with `direction`
(`from`/`to`), `geometry_key` (sha + face id + fingerprint), `confidence`
(45 high, 10 medium), a one-line `basis`, `surface_class`. The fold
(`binding_state.js`, Python twin `tolerance_stack/feature_identity.py`) already
yields `proposals[]` per key and the states `proposed` / `unbound` / `bound`.

## Decisions (made)

- **The rail row is the surface.** A joint end (or any edge end the rail
  lists) whose key has an open proposal reads **"suggested · high"** (or
  medium) in place of "no face bound", in the suggestion colour, with the
  `basis` as the hover text. An end with both a binding and a stale proposal
  reads as bound (bound wins, as the fold says). The study filter is the
  rail's own: every proposal whose edge is in the active study's model is
  visible from that study; from the topology-level entry, all 55 are.
- **Selecting the row lights the face.** Click the row (not Pick): the
  proposed face is drawn **solid** in the suggestion tint on every occurrence
  of its part (today's dashed outline is the un-selected state), the camera
  frames the occurrence the node's body anchors, and the model-layer hollow
  marker becomes emphasised. The rest of the scene dims the way a hovered
  body does today.
- **Two actions on the selected row: Accept, and Pick a different face.**
  Accept writes the ordinary `bound` event with `ratifies: <proposal id>`
  (the existing write path, moved). "Pick a different face" arms the pick
  exactly as Pick does today; the face the human then clicks writes
  `rejected` (`rejects: <proposal id>`) **and** `bound` for the picked face,
  both under `annotate-app:<reviewer>`, in that order, in one gesture — the
  proposal leaves the open list and the engine never re-proposes that face
  for that key. A row with no proposal keeps plain Pick.
- **An end the engine ranked but did not propose** (contact-suggestion
  candidates exist, no `proposed` event) reads "candidates · n" and selecting
  it lights the top-ranked face dashed; Pick behaves as today. This is the
  trial/debug Jeff asked for on 10-28 and costs nothing extra.
- **Reader-facing words only**: "suggested", "candidates", "Accept", "Pick a
  different face"; never "proposal event", "ratifies", a sha or a face id on
  the row (they stay in the hover and the event).

## Deliverables

1. The rail states and actions above, in `sweep.js`, with the write path
   shared with (and removed from) the standalone bar.
2. Scene: select-to-light, camera framing, solid vs dashed states.
3. Browser check against the real inbox (main checkout data): the rail on the
   topology-level entry shows **55** "suggested" ends across 33 edges; on the
   kinematic study `vpa_pitch_linkage_blade_pitch_at_the_stops`, the joints
   section shows every proposal whose edge is a joint of that study (count
   it, record it); Accept on a scratch proposal (write one with
   `scripts/propose_bindings.py` to a scratch data root, never the real
   inbox) produces one `bound` event with `ratifies`; "Pick a different face"
   produces `rejected` then `bound`.
4. `docs/ANNOTATION_SURFACE.md`: the "On the surface" paragraph rewritten for
   the rail; the standalone bar sentence deleted.

## Definition of done

- Jeff can open `http://127.0.0.1:8000/tolstack/viewer/`, select the kinematic
  study, open the 3D pane, and see every joint end's suggestion, light it,
  and accept it — nothing he needs is on the standalone page. State the exact
  click path in the lesson.
- `node apps/annotate/run_tests.cjs`, `node apps/viewer/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses
  `--changed-since integration` clean (the bar's witnesses re-anchor to the
  rail).
- Lesson: the 55/33 reachability count per entry (topology-level, kinematic
  study, each chain study), and anything the fold needed changing for the
  reject-and-bind gesture.
