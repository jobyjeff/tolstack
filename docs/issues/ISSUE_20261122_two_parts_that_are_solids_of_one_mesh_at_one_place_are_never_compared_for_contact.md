---
type: feature
priority: low
status: open
area: annotate/contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md
---

# Two parts that are solids of one mesh at one place are never compared for contact

v2 authors a bearing's two races as two parts on the bearing's one mesh
(`pitch_link_lower_inner_race` and `pitch_link_lower_outer_race` are solids 1
and 0 of `asm217755_MS14101_3_815597cb`). Since 2026-11-21 each race is
measured at its bearing's occurrence (`part_occurrence` in
`scripts/build_contact_suggestions.py`), so a ball-joint edge between the two
races is one mesh at one occurrence, and `interface_contact.edge_candidates`
never compares an occurrence with itself. Such an edge says `no_contact`
with the note "both parts are one 3D model at one place; its faces are not
compared with each other".

Before 2026-11-21 these edges were also `no_contact`, for a worse reason: the
inner race at one bearing was compared with the outer race at another.

**Options** (strategy's call): (a) compare a mesh with itself at one
occurrence when the two ends are different parts, every face against every
other -- cheap, and a ball can only sit in a seat that is another face; (b)
first teach the engine which faces are which solid (the parts' notes name
solid indices; `data/meshes/` carries per-face solids for the annotator's
`faceSolids`) and pair only solid against solid. Recommendation: (b) -- (a)
would offer the MS14103-3's one-solid sphere as its own seat.
