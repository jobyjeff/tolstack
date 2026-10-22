---
priority: high
depends_on: [browser_tiers_name_their_failure_instead_of_aborting]  # it owns every existing block of scripts/run_viewer_browser_tests.mjs and fixes the red on trunk; this handoff only appends a block
model: opus
---

# HANDOFF 2026-10-21 — a_face_pick_survives_an_orbit_and_names_its_end: a pick is a click not a press, the bind form says which interface the face is, and the instruction matches the one-face form

Source: Jeff's first live use of the bind flow in the 3D pane, 2026-10-21
(strategy session, 17:30–18:00). He opened `vpa_pitch_linkage`, blade 1, in
the viewer, pressed the page's **3D** control, selected the element
**"upper piston head height, lower face to step face"**
(`piston_head_upper_thickness`, part `piston_head_upper_214698_002`, mesh
`8899ea5d…`), clicked a face, and reported three things about the flow that
followed. Each is confirmed against the code below, and each is one
deliverable. None was filed as an issue before this handoff.

**What his session left on disk, and what to do about it.**
`C:\workspace\tolstack\data\inbox\feature-identity\0001_piston_head_upper_thickness.json`
(created `2026-10-22T00:37:17Z`, `recorded_by: annotate-app`) binds face 110
of that mesh with `direction: "from"`. The topology's own node notes
(`docs/projections/viewer/topologies.json` → `vpa_pitch_linkage`, nodes
`piston_heads_seat` and `piston_head_upper_step_face`) say face 110 at part
Z 243.216 is the **step face**, which is the edge's **`to`** end; the `from`
end (the seat against the lower head) is face 113 at Z 236.66. So the one
event in the stream is almost certainly labelled backwards, and it got that
way because the form's direction dropdown silently defaulted to `from`, the
first option. **Jeff deleted that file at 18:07 the same day** ("I'll do it
again once the UI is a bit more intuitive"), so at launch
`C:\workspace\tolstack\data\inbox\feature-identity\` holds only its tracked
`README.md` and no feature-identity projection exists. Write nothing into
that directory. Build and test against mock/fixture data (`?mock=1`,
`AA.FIXTURES`), as every annotate tier already does. The real-data checks in
the definition of done therefore see the "both ends open" state of this
element, which is the state Jeff will meet when he binds it again.

Baseline: tolstack `master` at or after `9ce8262` (2026-10-21 batch merge:
`the_3d_pane_opens_in_the_mode_the_study_wants`,
`the_sweep_rail_shows_the_mechanism`, `parts_sit_where_the_assembly_puts_them`
all in).

Scope: `apps/annotate/scene.js` (the canvas pointer handlers, ~line 174, and
one new overlay drawn the way the sweep's two-force lines are, ~line 746),
`apps/annotate/commands.js` (`AA.taskInstruction`, `AA.planPickToggle`, new
pure planners and copy constants), `apps/annotate/app.js` (**only**
`buildBindForm`, `labeledSelect`, the `state.scene.onPick` handler ~line
3500, and the `renderDetail` lines that build the task line and the form,
~2680–2740), `apps/annotate/style.css` (the bind form's rules),
`apps/annotate/run_tests.cjs`, `apps/annotate/README.md` (the bind-flow
bullets), `docs/ANNOTATION_SURFACE.md` (one short subsection under "The app"),
and one **new, appended** `testAnnotateBindForm` block in
`scripts/run_viewer_browser_tests.mjs` plus its registration line, plus the
mutation-witness specs any new guard needs.

Do NOT touch: `cmdSweep`, the sweep rail, or the contributor group in
`app.js` (staged `the_kinematic_study_checks_its_run_its_units_and_shows_its_limit`
owns them); `suggestions.js` and `face_geometry.js` (the cross-part
suggestion stage is a separate, deferred issue —
`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md` — and
this handoff does not start it); any existing block of
`scripts/run_viewer_browser_tests.mjs` (the two active browser-tier handoffs
own them); `scripts/run_mutation_witness_tests.mjs` and
`tests/test_mutation_witnesses.py` (staged
`mutation_tier_gates_on_every_pin_and_survives_a_board_move`);
`tolerance_stack/feature_identity.py` and the `DIRECTIONS` vocabulary —
`from`/`to` stay the stored words, only what the **form shows** changes;
`apps/viewer/`.

## Deliverables

1. **A pick is a click, not a press.** Today `scene.js` raycasts on every
   `pointerdown` and hands the result to `onPick`, which runs
   `AA.planPickToggle`: a press into empty space clears the pick, a press on
   the picked face clears it, a press anywhere else selects that face. So
   the first thing a reader does after picking a face — press-and-drag to
   orbit and look at the other side of the part — loses the pick. Jeff: *"as
   soon as I went to rotate the view it deselected it."* A thickness has its
   two faces on opposite sides of the part, so the flow cannot be completed
   without orbiting.

   Make the pick fire on **pointer release**, and only when the pointer did
   not travel: record the `pointerdown` position, and on `pointerup` raycast
   at the release point only if the pointer moved less than
   `AA.PICK_CLICK_SLOP_PX` (a named constant; suggestion: 4 CSS px) and the
   release is on the same canvas. A drag of any length, however it ends, is
   never a pick, and the pick that was there stays. Put the decision in a
   pure planner (`AA.planPointerRelease({down, up, slopPx})` → `pick | null`)
   so `run_tests.cjs` can check it with no browser: a 0 px release picks, a
   release just under the slop picks, one at or over it does not, a release
   with no recorded press does not. Keep `AA.planPickToggle` and its three
   existing checks exactly as they are — the toggle semantics (empty space
   clears, re-click clears) are right; the trigger was wrong. The sweep-mode
   joint tooltip uses `pointermove` against the beads only and is unaffected;
   say so in the lesson after checking it still works.

   Sites the change reaches: the `pointerdown` handler in `scene.js`, the
   `autotestPick` path (~line 1039) which calls `pick()` directly and must
   keep working, and the help line *"Click a face in the 3D view to select
   it; click it again to let it go."* (`AA.HELP_LINES`), which stays true and
   needs no edit.

2. **The direction control names the two interfaces, never `from`/`to`, and
   has no silent default.** `buildBindForm` builds `labeledSelect("direction",
   AA.DIRECTIONS, …)`: two options reading literally `from` and `to`, `from`
   preselected. A reader cannot tell which end is which without opening the
   topology JSON, and pressing Bind without touching the control writes
   `from` — which is how the mislabelled event above happened. Jeff: *"I
   don't understand what 'direction' means."*

   The stored value stays `from`/`to` (`feature_identity.DIRECTIONS`, Python-
   owned, generated into JS — do not touch). What the form **shows** is the
   two interface **node names** the edge already carries: `edge.from` and
   `edge.to` are node ids in the selected topology, and `nodes[].name` is the
   everyday-words label the rail already prints (for this edge: *"lower
   piston head upper face against the upper head lower face"* and *"upper
   piston head step face -- the extend stop's moving side"*). Decisions:

   - Replace the dropdown with **two labelled choices** (radio-style buttons
     or a segmented control — your call, within `DESIGN_TYPE_AND_COLOUR.md`),
     each showing the node name, each carrying the stored word as its value.
     Long node names are the norm: let them wrap, do not truncate.
   - **No default when both ends are open.** Bind is disabled until one is
     chosen, and the instruction line (item 3) says so. When one end is
     already bound (`AA.bindingDirectionsNeeded(record)` returns one word),
     **preselect the remaining end** and show the bound one as taken, with
     the face it has (*"already bound · face 110"*), not as a choice.
   - **A leader in the 3D view before the write.** When a face is picked and
     an end is chosen, and the *other* end is already bound, draw a thin line
     between the two face centroids (`manifest.json` `centroid_native`, placed
     at the first drawn occurrence through the same placement the part is
     drawn with — display only, like everything else drawn in the assembly
     frame; see `ANNOTATION_SURFACE.md`, "Where a part is drawn") in the
     picked-face colour, with a small label at each end: the node name. That
     is the "arrow from one face to the other" Jeff asked for, shown **before
     Bind** so a wrong end is caught before it is written. Reuse the sweep's
     line-drawing shape (`THREE.Line`, `LineBasicMaterial`, its own group
     added and removed with the pick). When only one face is involved (first
     bind), draw nothing: a leader with one end is a guess.
   - **No post-write flip.** Jeff suggested a "flip direction" button. A
     binding is an immutable event and the stream has no retraction or
     supersession verdict (`VERDICTS = ("bound", "owner_not_in_set")`), so
     flipping after Bind would need a schema decision this handoff is not
     making. The choice-before-write above is the flip. File one issue
     (`docs/issues/`, with frontmatter, `audience: strategy`) proposing a
     `superseded_by` verdict or a correcting-event convention, carrying the
     0001 event as the motivating case, and leave it there.
   - Suggestion only, do not build: deriving the end from the mating part's
     coincident face is the cross-part suggestion stage, deferred to
     2026-11-20 by its own issue. Note in the lesson that the node names
     make it unnecessary for the common case.

   Sites the change reaches: `buildBindForm` and `labeledSelect` (the GD&T
   select still uses `labeledSelect`; leave that one a dropdown), the event
   written by `AA.buildBoundEvent` (unchanged shape — add a fast-tier check
   that the stored `direction` is still one of `AA.DIRECTIONS` whichever
   choice is clicked), the read-only branch (`!canWrite`: no form, nothing
   to change), and `?mock=1`, where the fixture topology's node names must
   appear on the two choices in the TRUTH tier.

3. **The instruction line describes the flow the form actually has.**
   `AA.taskInstruction` says *"Select the two faces that define <element>."*
   and then, once a face is picked, *"Bind the selected face to <element>, or
   click another face to change it."* The form binds **one face per event**,
   so a reader expecting to pick two faces and then bind (Jeff: *"I was
   expecting it to ask me for two faces to define the thickness"*) meets a
   form that binds the one face immediately. Rewrite the three states of the
   instruction so each names the step the reader is on and how many are
   left, in everyday words, within this app's one-line budget and the
   reader-facing ban list `run_tests.cjs` already scans. Decisions:

   - both ends open, nothing picked: say the element needs two faces, one
     at a time, and to click the first;
   - a face picked: say to choose **which interface** this face is (the two
     names are on the form) and press Bind, and that the other face comes
     next;
   - one end bound, nothing picked: say which end is still needed **by its
     node name**, not by `from`/`to`;
   - one end bound, a face picked: say Bind writes it as that named end;
   - both bound: keep today's wording.

   Pin every state in `run_tests.cjs` (the existing `taskInstruction` checks
   are the place), including that no state prints the words `from` or `to`
   as a direction. The help line *"The rows on the left are this study's
   elements…"* and `AA.PICK_NEEDS_ELEMENT` are unaffected; check them and say
   so.

4. **The suggestion line says what it compared against.** Not Jeff's report,
   but the same minute: after his first bind the bar read *"11 likely faces
   -- the faces that line up with the one already bound"*, and he read "the
   one already bound" as some earlier binding he did not know about, when it
   was the face he had just written. One clause, no new logic: when the
   narrowing stage is `same_part_relation` or `mating_fit`,
   `AA.describeSuggestions` appends which face that was — *"(face 110, bound
   as <node name>)"* — read from `plan.ends[].references`, which already
   carries `faceId` and `direction`. `suggestions.js` is out of scope for
   logic; this is a copy change in `describeSuggestions` only, and if it
   needs more than a few lines, leave it and file it instead. Add a fast-tier
   check for the appended clause.

## Definition of done

- In `apps/annotate/index.html?mock=1` (served from the main checkout, see
  `apps/annotate/README.md` for the launch), with a fixture element selected:
  pick a face, orbit the part a full turn by drag, and the face is still
  orange and the form is still up; a plain click into empty space clears it;
  the form shows the two interface names and Bind is disabled until one is
  chosen; after one Bind, the form shows the bound end as taken and the
  other preselected, and picking a second face draws the leader between the
  two centroids with the two names on it. Screenshots of the leader and of
  the form in both states go in the lesson.
- Three real-data checks run by hand in the main checkout, recorded in the
  lesson (not pinned — the main checkout's event stream is Jeff's): open
  `?topology=vpa_pitch_linkage&edge=piston_head_upper_thickness`, confirm the
  two choices read the node names quoted above, confirm Bind is disabled
  with neither chosen, and confirm the instruction says two faces are needed,
  one at a time. Do not press Bind there.
- `node apps/annotate/run_tests.cjs` green with the new checks (pointer
  release planner, instruction states, direction value guard, suggestion
  clause). `node scripts/run_viewer_browser_tests.mjs` green with the
  appended `testAnnotateBindForm` block covering the orbit-keeps-pick and
  no-default-direction cases. `node scripts/run_mutation_witness_tests.mjs`
  green, every new guard enrolled or its pin raised with a stated reason.
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` green
  after `scripts/rebuild_projections.ps1`, in that order.
- Model note: `opus` because items 2 and 3 are copy-and-layout judgement on
  the one write surface this repo has (a wrong first attempt ships a
  confusing form, which no test catches), and the leader is a new 3D overlay
  in the placed-assembly frame. Item 1 alone would be sonnet.
- Lesson (`docs/sessions/lessons/LESSONS_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md`):
  the slop value chosen and why; that the feature-identity inbox was empty at
  launch (or what it held, if that changed); the exact wording of the five instruction states; whether the sweep-mode bead
  tooltip and `autotestPick` still work; the issue filed for a supersession
  verdict; and whether `describeSuggestions` took the clause or was filed.
