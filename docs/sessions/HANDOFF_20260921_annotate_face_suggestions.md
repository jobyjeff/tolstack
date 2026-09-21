---
priority: med
depends_on: [annotate_hint_bar_and_context_autofilter]
model: opus
---

# HANDOFF 2026-09-21 — annotate_face_suggestions: geometry-narrowed face suggestions in the 3D view

Source: Jeff, strategy session 2026-09-21 (expanding the suggestion arc he
first sketched 2026-09-08 — `dispatch/docs/strategy/drafts/
DRAFT_annotation_roadmap.md` arc 3, which this handoff promotes): "I'd like to
also work towards a suggestion engine in the 3d view, for example you can
greatly narrow it down (diameters require cylindrical surfaces, flanges
require planar surfaces, etc), so we could display the body as transparent and
then use a different color for suggested surfaces, and another color for
currently selected surface (if any). If one half of an interface is already
defined (in the adjacent 3d part) you can narrow it down further, by
suggesting coaxial cylinders or coplanar/parallel planes etc." Settings for
"auto-suggestion/auto-selection in the 3d window … could be part of the
collapsible commands/help menu" — that element is the depends_on handoff's
deliverable.
Baseline: trunk `master` + `annotate_hint_bar_and_context_autofilter` merged.
Scope: `apps/annotate/`, any new geometry-analysis module and its tests;
`apps/viewer/` untouched.

## Hard fence (from the draft, unchanged)

**Suggestions are proposals in the UI, never auto-bindings.** A binding stays
a human-ratified `feature-identity/v0` event through the existing write path —
eager-until-one-way-door. The engine colours candidates; it never selects one
for you, and it never writes.

## Deliverables

1. **Face classification.** Classify mesh faces as cylindrical / planar /
   other, extracting the cylinder axis or plane normal+offset. Inputs that
   already exist: the tessellation's per-face fingerprints (area/centroid);
   axis/plane extraction from triangle data is the new piece. Suggested
   direction (investigate, not binding): prototype on the live meshes first —
   the pitch-link/bushing set under the mesh store — and measure how cleanly
   tessellated cylinders classify before committing to thresholds; report the
   hit rates in the lesson.
2. **Narrowing rules, applied in order of what is known:**
   - the element's kind/description narrows the surface class (a diameter
     needs a cylindrical face; a flange/thickness/length between faces needs
     planar faces);
   - if the other half of the interface is already bound on the adjacent
     part, narrow further: coaxial cylinders, coplanar or parallel planes.
   The rule set is a declared table, not scattered conditionals — the repo's
   vocabulary-drift lesson applies.
3. **Display states.** When suggestions are active for the selected element:
   the body renders transparent, suggested faces in one colour, the currently
   selected face (if any) in another. Colours come from the design tokens
   (`docs/DESIGN_TYPE_AND_COLOUR.md` / `apps/viewer/style.css` `:root`) —
   suggestion is not a state colour claim about correctness, pick roles
   accordingly. Nothing-suggested renders the normal view, not an empty
   transparent ghost.
4. **Settings live in the commands/help element** (built by the depends_on
   handoff): enable/disable auto-suggestion; per the standing rule the toggle
   and the suggestion application are commands (`AA.exec`), so an agent can
   drive them later (draft arc 4).

## Definition of done

- On the live pitch-link data: selecting a diameter-like element suggests
  only cylindrical candidates on the right part; selecting a
  length-between-faces element suggests planar candidates; with one interface
  half bound on the adjacent part, the candidate set demonstrably shrinks
  (name the counts in the lesson).
- A suggestion never mutates binding state; the write path is untouched.
- JS suite + browser tier green in the main checkout.
- Lesson (`docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md`):
  classification hit rates on the real meshes, the rule table, and what the
  agent-driving arc (draft arc 4) can rely on.
