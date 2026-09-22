---
type: feature
priority: med
status: open
area: apps/annotate
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260921_annotate_face_suggestions.md
---

# Face suggestions cannot narrow a flat face across two parts, because no assembly placement is applied

## What is missing

`apps/annotate/suggestions.js` narrows face candidates in three stages. The
third one — **`mating_fit`**, the case Jeff's own note asks for ("if one half of
an interface is already defined in the adjacent 3d part you can narrow it down
further, by suggesting coaxial cylinders or coplanar/parallel planes") — can
assert exactly one relation, and only for cylinders:

| relation | needs | available today |
|---|---|---|
| same radius | nothing shared: a radius belongs to one face | **yes** |
| coaxial | the two axes in one frame | no |
| coplanar / parallel | the two normals in one frame | no |

The reason is a decision, not an oversight: this app applies **no assembly
placement transforms** (`docs/ANNOTATION_SURFACE.md`, "What this MVP does not
build"; `apps/annotate/README.md`, "What it does and does not do"). Every part
is drawn at its own local origin, side by side, so a plane's normal and offset
on one mesh mean nothing measured against another mesh's. The rule table
declares the null with its reason (`AA.NO_MATING_PLANE_RELATION`) and the
surface says so in plain words rather than computing a coplanarity it cannot
support.

## Why this is worth a design decision rather than a fix

The data to do better probably exists. `data/meshes/<sha>/provenance.json`
records each instance's `placement_location` for the `asm217755_*` meshes
extracted from the 217755-001 assembly, and states in as many words that the
placements are **recorded but NOT applied**. Nothing in this repo reads them.

So the question is not "how do we multiply a matrix" but a chain of decisions
nobody has taken:

- Does `apps/annotate/` render an assembly at all, or only ever parts side by
  side? Applying placements changes the meaning of every camera verb, the
  side-by-side layout in `scene.js`, and what `isolate` shows.
- Which instance? A part with 29 instances across the assembly (the
  NAS1149V0332H washer) has 29 placements and a binding names none of them.
  Feature identity is per `(source_step_sha256, face_id)`, deliberately
  frame-free; an assembly view introduces "which copy of this part" as a new
  thing a reader has to say.
- A mesh extracted from one assembly has a placement in THAT assembly only.
  `machined_213668` and `blade_oml` arrived by the other route
  (`data/meshes/README.md`) and have no assembly frame at all, so any
  placement-aware narrowing is available for some parts and not others — which
  is a second class of "we cannot answer here" to design a surface for.
- The tessellation spike's own lesson flags that nothing has exercised a real
  multi-part assembly's placement math, so this needs a validation of its own
  before anything renders from it.

## What the absence costs, concretely

Measured on the live pitch-link joint (`topology_pitch_link_to_pitch_plate`):
every one of its five cross-part interfaces (`head_bearing_face`,
`bushing_eye_face`, `eye_flange_face`, `flange_lug_face`,
`pitch_plate_washer_face`) is a **flat** mating face, so `mating_fit` narrows
nothing at any of them — stage 1's answer stands and the reader is told why.
The two diametral cross-part interfaces in the repo
(`topology_pitch_system`'s `pitch_plate_link_hole` and `pitch_link_arm_hole`,
where the radius relation WOULD apply) each have one half on `pitch_link`,
which has no installed mesh, so the cylindrical leg of the stage has no live
end-to-end case either. It is exercised against real geometry by a synthetic
topology in `apps/annotate/run_tests.cjs`'s `[real]` tier.

## What a fix is not

Do not make `suggestions.js` compare planes across meshes without a shared
frame. Two flat faces at unrelated origins will read as parallel or not by
accident, and a suggestion that is right by accident is the shape this repo
avoids everywhere else.
