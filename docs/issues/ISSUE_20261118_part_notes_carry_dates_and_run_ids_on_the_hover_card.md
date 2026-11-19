---
type: chore
priority: low
status: open
area: topologies/notes
reporter: agent
found_by: docs/sessions/HANDOFF_20261117_a_joints_preview_says_what_the_joint_is.md
---

# Part notes in the pitch-linkage topology still carry dates, run ids and issue file names

The history guard from `a_joints_preview_says_what_the_joint_is`
(`BANNED_AS_HISTORY` in `tests/test_topology_prose_for_a_reader.py`) covers a node's and an
edge's `note`, the Preview's surface. The 13 `parts[].note` strings in
`docs/topologies/topology_vpa_pitch_linkage.json` (hub, pitch_arm, blade_root, pitch_link,
spherical_bearing_pitch_link, pitch_plate_215177_001, gas_spring_piston_214700_002,
tan_link_212956_005, both piston heads, piston_cover_214958_002, flanged_bushing_nas77a3_015a,
plain_bushing_214943_002) carry ISO dates, rotorkit run ids, `ISSUE_...md` file names and one
handoff slug, and render on the component hover card. The same rewrite applies; then change
`PREVIEW_PROSE` in that test to include `parts/` and the guard covers them.
Also: v2's and v1's `bodies[].note`, `provenance` text and edge `source_ref` notes keep dates by
design (a citation's argument), and are not in the guard.
