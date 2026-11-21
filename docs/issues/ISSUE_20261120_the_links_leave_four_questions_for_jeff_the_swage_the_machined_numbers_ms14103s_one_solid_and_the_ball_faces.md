---
type: chore
priority: med
status: open
area: topology/v2
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
---

# The links leave four questions for Jeff: the swage, the machined parts' numbers, MS14103-3's one solid, and the ball faces

Handoff `a_link_is_a_machined_part_and_two_bearings_each_two_races` (link 4 of
the 11-19 chain) listed six questions in its lesson. Questions 3 and 4 (the
hardware at the pitch arm and at the mount) are already in
`ISSUE_20261120_the_inner_races_at_the_pitch_arm_and_the_mount_sit_on_a_stand_in_for_hardware_nobody_has_authored.md`.
The other four were in the lesson only. They are gathered here so a strategy
session can put them to Jeff and act on the answers. The walk's page
(`docs/sessions/lessons/REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`,
"Only you can decide") shows each with what the page does today.

| # | Question | What v2 does now | Recommendation |
|---|---|---|---|
| 1 | **The swage.** Is the outer race swaged into the machined link a press fit for a tolerance study, or its own interface with the bore's band and none of the race's? | A `press_fit` gap from the race's outside cylinder to the machined bore, on all four bearings | Keep `press_fit` until a drawing note says otherwise: a swaged race never moves, which is what an interference fit says. Jeff's "zero distance gap with a tolerance" is what the gap edge already is |
| 2 | **The machined parts' numbers.** The mesh products and Enovia say 213861-002 and 213863-004; the STEP's instances are named `213861-001.1` and `213863-002.1` | Uses the products' numbers | Products' numbers. 213863-004's drawing is read (drawing-checker run `20260910_154233_213863-004-A`), so a transcription session can check its title block; 213861-002 has no run ("no drawing yet" on the page) |
| 3 | **MS14103-3 is one solid.** Its two races are authored on one mesh, so a face on its sphere cannot say which race it is on. Ask rotorkit for a split mesh? | Both races alias the same mesh; the reader decides by which feature they armed | Not before the end-stop study needs a bound face on that sphere. The tangential link's plate-end ball is already bound on the link-assembly mesh |
| 4 | **The four ball centres** are bound on the inner races' balls (link-assembly meshes); v2 states the centre on the outer race's seat, concentric within 0.001 mm | The four bindings read through unchanged and the fits did not move | Keep them. A re-pick changes no number |
