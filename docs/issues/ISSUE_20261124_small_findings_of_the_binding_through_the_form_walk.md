---
type: bug
priority: low
status: deferred
area: viewer/feature form
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261122_the_walk_binds_through_the_form_on_the_merged_page.md
class: walk_small_findings
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# Small findings of the binding-through-the-form walk (2026-11-24)

Measured on `integration` `10a6b07f`, served over the scratch copy
`data/scratch/walk1124`. Shots are in
`docs/sessions/lessons/shots/the_walk_binds_through_the_form_on_the_merged_page/`.

| # | Finding | Evidence |
|---|---|---|
| F1 | **"Saved · 1 faces".** The pane's save notice does not take a singular. It also showed after the menu's "Bind the suggested faces" on v1's upper head. | `n4a_open_1536`, `k18_after_bind_suggested_1536` |
| F2 | **The pane's last notice outlives its subject.** "Saved · 18 faces" (the pilot) stayed on the pane's head while the bushing bores' form was open. "unbound: tangential link mount fastener pattern" stayed over that feature's form after the re-bind had begun. "Saved · 1 faces" stayed into sweep mode, over the kinematic study. It reads as a fact about what is on screen now. | `b1_bushing_bores_form_open_1536`, `c4_pattern_one_hole_in_set_1536` |
| F3 | **After a Take, the next suggestion slides under the pointer.** Its hover preview then replaces the light on the set just taken. On the fastener pattern, the 10 holes just taken went dark until the pointer moved, and the scene showed the hidden r 2.4998 mm hole instead. | `c5_pattern_line_taken_1536` against `c7_pattern_bound_pointer_off_1536` |
| F4 | **A tick on an unchanged set can write, and the form does not say so.** The filmstrip opened "attachment bore" on v2 and pressed ✓ with nothing changed. That wrote scratch 0128: `bound`, keyed `vpa_pitch_linkage` (v1), ratifying `proposal-0049-tan_link_mount_height-to`. Jeff's 0106 had bound the same face 1569 ratifying 0024, which left 0049 open. This is the documented rule (the tick answers every open proposal the set holds; `docs/ANNOTATION_SURFACE.md`, "Editing a feature"). But nothing in the form showed that a write was pending, and it was keyed to the other model. | scratch `0128_tan_link_mount_bore_accepted.json`; `f1_tree_holds_still_1536.json` |
| F5 | **The 3840 layout keeps the tree, and so the form, at 300 px.** That is 8% of the width, while the pane gets 1189 px. The form fits, and its title clips with the name on hover, as before. The right-click menu over a row covers the row below it. | `w2_pilot_form_3840`, `w3_menu_feature_row_3840` |
