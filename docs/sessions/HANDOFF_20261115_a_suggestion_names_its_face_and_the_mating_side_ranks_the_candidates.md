---
priority: high
depends_on: [the_hub_is_one_part_in_the_grid_and_the_dag]
model: opus
hitl: false
---

# HANDOFF 2026-11-15 — a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates: a suggested face can be seen and taken where it is announced, and once one side of an interface is bound the other side's candidates are the faces that mate with it

Source: Jeff's note `20261115T202853_xrm64b` (his walk of the merged page,
2026-11-15) and a read-only trace the same evening
(`dispatch/docs/strategy/HANDOFF_20261115_strategy.md`). Baseline: `master`
at or after `86576d72` with `the_hub_is_one_part_in_the_grid_and_the_dag`
merged. This is the viewer chain's one slot: one viewer handoff at a time.
Scope: `apps/annotate/` (`suggestions.js`, `app.js`, `face_geometry.js`),
`apps/viewer/views/nav.js`, `apps/viewer/topology_app.js`, their tests and
browser suites, `docs/ANNOTATION_SURFACE.md`. Do NOT touch the DAG's layout or
render (`apps/viewer/topology.js`, `apps/viewer/views/topology.js`), the grid,
`scripts/` runners, or `tolerance_stack/feature_geometry.py` (the next handoff
in the chain owns the fit).

**Jeff's real bindings are in `C:\workspace\tolstack\data\inbox\feature-identity\`
(83 events on 2026-11-15). Never write an event there.** Every bind, unbind and
accept this session makes is against a scratch data root holding a copy of that
log; say in the lesson where the scratch root was and that the real log's
event count was the same before and after.

## What Jeff said, and what the code does (lines as of `86576d72`; search by name)

> "hub blade root bore was bound to the wrong blade bore. I unbound it, then
> went and selected the mating side (one of the bearing seats on the blade
> itself). Was hoping the hub would then recommend cylindrical surfaces that
> are coaxial with the blade's selected cylindrical seat. It didn't so I
> selected it manually."

> "under tangential link mount base face, there's a line that says 'suggested,
> high', but there is only a 'pick a face' button, no indication of what the
> suggested face is."

- Proposals are one-shot events from `scripts/propose_bindings.py`; nothing
  regenerates them and an unbind re-proposes nothing
  (`apps/viewer/identity_fold.js:126-137`). That stays as it is: a face Jeff
  unbound is not offered again as a proposal.
- Contact suggestions (`scripts/build_contact_suggestions.py`,
  `tolerance_stack/interface_contact.py`) are the only code that compares two
  parts in the assembly frame. They cover gap edges only (8 in v2) and never
  read a binding.
- The pane's live planner, `planFaceSuggestions`
  (`apps/annotate/suggestions.js:295`), runs for bind mode's selected edge
  only. Across parts it knows "same radius" and nothing else
  (`:195-200`); the file says it has no cross-part frame (`:26-43`). A
  same-part reference outranks the mating one (`:407`).
- The tree's "Pick a face" (`cmdArm`, `apps/annotate/app.js:2952`) narrows the
  pick to the part (`setPickFilter`, `:3058`) and paints no candidates.
- Per face, the browser computes class, axis, axis point, radius, normal and
  centre in the part's own frame (`AA.classifyPartFaces`,
  `apps/annotate/face_geometry.js:510`, cached by `ensureFaceClasses`,
  `app.js:1181`). The occurrence placements are in the scene (`app.js:7261`)
  and are not applied to those records.
- Jeff's case, fitted from the meshes: `hub_blade1_root_bearing_bore` is one
  node on two parts in v2 (not a gap edge). Blade seat: faces 4034 + 4033,
  r 41.257. Hub, correct: faces 2356 + 2358, r 41.275, axis X. Hub, the face
  that was wrongly bound: 2564, r 41.275, axis (−0.286, 0.958, 0) — another
  blade's bore. Radius cannot tell them apart; coaxiality in the assembled
  pose can.
- "suggested · high" is `VA.FEATURE_BODY_WORDS.suggested`
  (`apps/viewer/views/nav.js:941`), drawn at `:1039-1049` when the feature is
  unbound, has an open proposal, and the pane supplied no candidate rows
  (`rows` empty at `apps/viewer/topology_app.js:2198-2203`). The proposal's
  face is intact in `proposals[0].event.geometry_key(s)`; the branch builds a
  line with no `face` and one `arm` action, so there is nothing to hover and
  nothing to take. `at = proposals[0]` is unsorted while `best` is sorted by
  confidence (`:1041-1047`). Why the rows were empty on Jeff's page for
  `tangential link mount base face` was not determined.

## Deliverables

1. **A suggestion line names its face, lights it and can be taken.** Wherever
   the tree says a feature has a suggestion, the line carries the suggested
   face or faces: hovering the line lights them in the 3D pane (the
   `hover face` verb, `topology_app.js:2228`, already works in both pane
   modes; it is wired only when `line.face` is set, `nav.js:1087-1091`),
   clicking the line selects them so the pane turns to them, and a **Take**
   action accepts the proposal from the tree (`cmdAccept`, `app.js:4486`,
   takes no topology argument today, unlike arm, unbind and keep; give it
   one). The line and the action read the same proposal, the best by
   confidence. "Pick a face" stays beside Take. Find and state why the pane
   supplied no rows for that feature on the real data; if it is a defect, fix
   it here, and if it is the designed state, the line above is the fix.

2. **Arming one side of an interface ranks the other side's faces by the
   mate.** When a feature is armed (from the tree or from the pane) and its
   counterpart is bound — the other part's feature at a node two parts
   share, or the other end of a gap edge — place both parts' face records
   with their occurrence placements and rank the armed part's faces by the
   relation the interface implies: for a round feature, cylinders coaxial
   with the bound one in the assembled pose, nearest radius first; for a flat
   one, planes coincident with the bound plane, normals opposed. The ranked
   faces are pre-lit in the pane while armed (the pick still accepts any face
   of the part, as now) and listed under the feature in the tree with why
   each is there ("coaxial with blade seat, Ø82.51 vs Ø82.55") and Take. The
   mating relation outranks a same-part relation at `suggestions.js:407`.
   With the counterpart unbound, behaviour is what it is today.
   - The coaxial and coincident tolerances are measured, not guessed: on v2's
     already-bound pairs, tabulate axis angle, axis offset and radius
     difference (or plane angle and offset) for the true mate and for the
     nearest wrong face, and set the thresholds between them. The table goes
     in the lesson.
   - Where an occurrence is ambiguous (a part placed several times, as the
     blades are), a candidate qualifies if it mates in any occurrence pairing
     the model's interface allows; say in the lesson how the blade 1 bore is
     told from blade 2's.
   - Display and ranking only. This writes no event and produces no value;
     `scripts/fit_bound_features.py` remains the one place a placement makes
     a number (`CLAUDE.md`, "Where a feature is, in the assembly").

3. **The same list answers the walk's row 38** ("no suggestion list met under
   a side", `docs/sessions/lessons/REVIEW_20261112_the_merged_page.md`): an
   unbound side whose counterpart is bound opens to its ranked list without
   being armed first.

4. **`docs/ANNOTATION_SURFACE.md`** gains the two rules (a suggestion is
   shown where it is announced; the mate ranks the other side) in its
   existing gesture table and "Taking a suggested face" section, in the
   document's own voice.

Sites this fact reaches and the ones left alone: the tree's feature body
(items 1–3), the pane's pre-light while armed (item 2), the pane's own
candidate list in bind mode (uses the same ranking; one function, called from
both). Left alone, in writing: `scripts/propose_bindings.py` and the offline
contact-suggestion builder; extending the Python engine to two-part nodes is
`ISSUE_20261029_contact_suggestions_run_on_gap_edges_only` and stays open.

## Definition of done

- On a scratch root with the real log copied: with the blade seat (4034 +
  4033) bound and the hub's `hub_blade1_root_bearing_bore` side unbound, the
  hub side's list is headed by 2356 / 2358, and 2564 is absent or below it
  with a stated reason. Shot of the tree and the pane.
- `tangential link mount base face`: the suggestion line names its face,
  hover lights it, Take binds it (scratch root). Filmstrip of hover → Take.
- A browser suite covers: hover on a suggestion line lights the face; Take
  from the tree writes one accept event for the best proposal; arming with a
  bound counterpart pre-lights the ranked faces and lists them; arming with
  no bound counterpart is unchanged. Fast-tier tests cover the ranking
  function by value on the blade bore numbers above. Each new guard carries
  its mutation spec; pass every changed guard to the witness runner in one
  invocation if `the_suite_stops_paying_for_the_same_tree_twice` has merged.
- Exploratory click-around on the real projection, read with vision, at
  3840×2160 and 5120×2160, before the checks (`CLAUDE.md`).
- Lesson (`docs/sessions/lessons/LESSONS_20261115_a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates.md`):
  why the rows were empty; the tolerance table; how many of v2's unbound
  sides now open to a ranked list and how many still say nothing, by name;
  the real log's event count before and after.
