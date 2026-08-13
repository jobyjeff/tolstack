---
priority: med
depends_on: []
---

# HANDOFF 2026-08-13 — spec_citation_identity_rendering: say the spec-pile identity rule on the citation row

Source: `docs/strategy/BRIEF_20260812_spec_pile_citation_identity.md`,
expanded 2026-08-13. Strategy chose **option 2 in its narrow reading**: a
*kind-aware rendering* derived from existing data — **no new `export.status`
value, no `export` block on the four citations, no enum change anywhere.**
Rationale: option 1 would quietly erase the deliberate 08-06 exception (for
the spec pile, filename identifies bytes — there is no exported file to
name); a third status value would widen a two-value enum whose second value
has zero live instances, purely to express a fact the data already carries
one hop away (`resolved_by: "spec_pile"` on the crop). Because nothing
enumerated changes, this does NOT need to wait for
`js_python_vocabulary_pairing` (staged) — but do not add any vocabulary
while you're in there, or that sequencing constraint comes back. Baseline:
trunk (`viewer_export_and_material_provenance` merged). Scope:
`scripts/build_viewer_projection.py`, `apps/viewer/`, tests.

## Deliverables

1. **Hoist the fact to the citation row.** In the viewer projection, a
   citation whose crop is `resolved_by: "spec_pile"` carries a derived
   marker (e.g. `identity_rule: "spec_pile_filename"` — projection-internal,
   not a schema/vocabulary change to the stack model). The viewer renders it
   on the citation row as a short sentence in place of the export block:
   *"Spec-pile document: identity by filename (append-only pile)"* — so
   `traced` + "no bytes identified" stops being a readable pair.
2. **Only the four** (and future spec-pile citations) get the sentence.
   The 21 `workbook` + 1 `assumed` no-export citations are untouched — they
   are uncontroversial and out of scope (the brief's Q2 answered: the rule
   applies to spec-pile resolution only).
3. **Write the rule where readers look.** One sentence in the viewer's
   legend/help affordance stating the spec-pile exception, so the rendering
   is explained by the surface itself, not by a lesson.

## Definition of done

- `results.json` rebuild: the four citations
  (`tan_link_to_pitch_plate:fastener_grip_13/_14`,
  `tan_link_to_pitch_plate_take2:fastener_grip_13`,
  `vpa_output_to_pitch_plate:fastener_grip`) carry the derived marker;
  value-level test asserts marker present for a spec_pile-resolved citation
  and absent for workbook/assumed/drawing ones.
- Viewer renders the sentence on those rows (and the legend entry exists);
  no change to `VA.EXPORT_STATUSES` or any Python enum
  (`grep` proves it in the lesson).
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260813_spec_citation_identity_rendering.md`):
  note this was the second sighting of "a fact about the citation reachable
  only through a crop" — if a third shape appears, the projection wants a
  general hoist, and the lesson should say what it would look like.

Related issue to update on completion:
`docs/issues/ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md`
→ `status: resolved`.
