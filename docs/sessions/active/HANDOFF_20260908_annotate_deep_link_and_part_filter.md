---
priority: med
depends_on: [viewer_v2_single_nav]
---

# HANDOFF 2026-09-08 — annotate_deep_link_and_part_filter: jump from a stack row into the 3D tool with the right part on screen, via a command layer

Source: Jeff, 2026-09-08 (verbatim intent): "If a component of a stack is
missing a reference, you can click a link to jump directly into the 3d tool
with the correct part filtered, so all you have to do is click the correct
surface(s)." Plus the standing architecture rule (Jeff, same session): **make
sure everything is CLI behind the scenes** — the UI is a thin shell over
text-addressable commands, because the follow-on arc is agents driving this
surface with vision + text commands (zoom/pan/rotate/filter/select). Baseline:
trunk + `viewer_v2_single_nav` merged (this handoff touches the viewer only
to emit links; the new nav/detail layout is where they live). Scope:
`apps/annotate/` + the minimal link-emission touch in `apps/viewer/` +
tests. Do NOT touch `tolerance_stack/` models, projection builders,
`docs/topologies/`.

## Deliverables

1. **A command layer in the annotator.** Factor the scene operations into
   named, text-addressable commands with a single dispatch point (suggested
   verbs, adjust as the code wants: `open-part <mesh-id|part>`,
   `show`/`hide <part>`, `isolate <part…>`, `camera <preset|orbit args>`,
   `select-face <face_id>`, `goto <topology> <edge> [study]`). The UI's
   existing interactions re-route through it; a dev console/text input (or
   `window.AnnotateApp.exec(...)`) exposes it. This is the architectural
   deliverable — the deep link and the filter UI below are its first two
   consumers, and a future vision-agent driver is the third (design for it,
   don't build it).
2. **Part show/hide/isolate.** A parts panel listing every installed mesh
   (`data/meshes/`), with show/hide toggles and an isolate action — backed
   by the command layer. (Subtree-level filtering — "hide the whole EPU" —
   is deliberately NOT here: it needs assembly product structure that
   doesn't exist yet; see rotorkit's `assembly_step_structure_probe`.)
3. **Deep link in.** URL params (e.g.
   `?topology=…&edge=…&study=…&isolate=<part>`) that boot the app with that
   study open, that edge's row selected, and the named part(s) isolated —
   implemented as command-layer calls at boot, not a parallel code path. An
   element whose owner part has no installed mesh gets a plain-words empty
   state naming what's missing (the mesh id / part), never a blank scene.
4. **Deep link out (viewer side).** On the viewer's detail pane for an
   untraced/unbound element or edge, an "annotate this →" link carrying the
   params. Respect house UI copy (everyday words). Keep the edit minimal
   and inside the post-v2 layout.

5. **Fix the orbit up-axis.** Jeff's live report (2026-09-08, first real use
   of the app): "the rotation axes are partially tied to the part CS rather
   than the viewer CS. Depending on which angle you're looking at it from,
   horizontal mouse drag either rotates the part about the vertical axis, or
   about an axis normal to the screen." This is the classic
   OrbitControls-azimuth-about-world-up symptom when the mesh's up axis
   (CATIA exports are typically Z-up) disagrees with the controls' assumed
   up (three.js default Y-up). Suggested direction (verify against the real
   meshes, not binding): set the camera/controls up vector to the meshes'
   actual up, or switch to a trackball-style control if fixed-up orbiting
   still fights CAD-shaped models. Whatever the fix, `camera` commands in
   the new command layer must behave consistently with it.

## Constraints

- FSA grant flow is unchanged — a deep link cannot pre-grant the folder;
  after Connect the boot commands replay. Say so in plain words on arrival.
- `?mock=1` and `?autotest=1` keep working; autotest ideally re-expresses
  through the command layer (it is the proto-agent-driver already).
- No suggestion algorithms in this handoff (coaxial/coplanar heuristics are
  a recorded future arc — `dispatch/docs/strategy/drafts/DRAFT_annotation_roadmap.md`).

## Definition of done

- From the served viewer, clicking "annotate this" on a real unbound
  pitch_system edge lands in the annotator with the study open, edge
  selected, and (if its part's mesh is installed) the part isolated.
- Command layer covered by `run_tests.cjs`-tier tests where DOM-free
  (command parsing/dispatch, state transitions) and by `?autotest=1` for the
  scene path.
- Existing annotate + viewer test tiers green.
- Lesson (`docs/sessions/lessons/LESSONS_20260908_annotate_deep_link_and_part_filter.md`):
  the command vocabulary as shipped (it becomes agent-facing API — name it
  carefully) and what a vision-agent driver would still need.
