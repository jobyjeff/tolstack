# Lessons — the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below (2026-10-28)

What the next agent cannot derive from the code. The README's "The active
study is one band" says what the page does; this says what was measured and
decided on the way.

## What shipped, in one paragraph

All in JS, from the serialized walk: no Python change. `VA.bandSides` (which
side each row goes to), `VA.layWalk` (a generic re-layer: any order of a walk's
rows → entered/left/close roles, columns, rails, links), `VA.layoutCrossings`
(the builder's `layout_crossings`, ported), `VA.bandLayout` (above + band +
below; `{only: true}` = the band alone, which hidden mode now draws),
`VA.bodyLabelFields`, a direction-aware `closePath`, unique pill ids per
collapsed block, and an arrival Fit in `topology_app.js` once the respine
settles (keeping the sideways scroll; the toolbar Fit still resets it).

## Crossings and band height, every study of the product model

Crossings are `layout_crossings`' total (branch + close + leader), "walk" being
the same lit rows on the walk's own columns (`VA.hideUnlit`), "band" the band
alone. Heights are the band's rows × the uniform row pitch (26px comfortable,
16px compact); a scaled length mode stretches edge rows.

| study | lit rows | walk span | crossings in walk | in band | band columns | band height comfortable / compact |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `pitch_link_cotter_hole_clearance` | 15 | 19 | 11 | 2 | 3 | 390 / 240 px |
| `pitch_link_shank_out` | 14 | 19 | 1 | 0 | 2 | 364 / 224 px |
| `pitch_link_thread_region_t` | 5 | 18 | 2 | 0 | 2 | 130 / 80 px |
| `pitch_system_blade_angle_average` | 25 | 81 | 7 | 0 | 2 | 650 / 400 px |
| `pitch_system_blade_angle_worst` | 25 | 81 | 7 | 0 | 2 | 650 / 400 px |
| `pitch_system_end_stop_minus7` | 25 | 81 | 7 | 0 | 2 | 650 / 400 px |
| `pitch_system_end_stop_plus72` | 25 | 81 | 7 | 0 | 2 | 650 / 400 px |
| `pitch_system_gas_spring_branch` | 15 | 29 | 2 | 0 | 2 | 390 / 240 px |
| `pitch_system_gas_spring_mechanical_stroke` | 3 | 3 | 1 | 0 | 1 | 78 / 48 px |
| `pitch_system_vertical_hub_to_pitch_arm` | 21 | 81 | 6 | 0 | 2 | 546 / 336 px |
| `rotor_fastener_grip_u2h` … `u10h` (9) | 8 each | 8 … 16 | 0 | 0 | 2 | 208 / 128 px |
| `tan_link_take2_worst_case_protrusion` | 14 | 14 | 1 | 0 | 2 | 364 / 224 px |
| `vpa_output_shank_out` | 14 | 14 | 1 | 0 | 2 | 364 / 224 px |
| `vpa_pitch_linkage_travel_between_end_stops` | 10 | 97 | 1 | 0 | 1 | 260 / 160 px |
| *kinematic* `…blade_pitch_at_the_stops` | 42 | 105 | 15 | 7 | 5 | 1092 / 672 px |

The whole re-arranged walk stays **11 columns** for every study (the walk's
own width). On the kinematic page's 500px bounded box the compact band fits
at Fit scale 0.717 (browser tier prints it); the comfortable one at ~0.40.

## Decisions the handoff did not make

**Interleaved unlit rows move as connected pieces, not row by row.** The
handoff's rule ("an unlit row interleaved inside the lit span goes to
whichever side it is nearer") tore side branches in two when applied per row:
a branch forking off a lit node got its first edge below (it cannot hang
above) and its far node above, joined by a curve the height of the band. So
the interleaved unlit rows are grouped by their own edges, a piece goes by its
mean row, and a piece with an edge entered at a lit node goes below.

**Below the band, an edge forking off a lit node is drawn after its far node**
(one-place swap), so it hangs from that node and curves up to the band. In walk
order it runs a rail from the lit node down through the whole band: measured
**23 columns** on the kinematic study (rail depth 20 at one row) against the
walk's 11. With the swap: 11, every study.

**The rest of the model keeps the walk's own columns, not columns shifted out
by the band's width.** First cut shifted every unlit column by k (band takes
0..k-1): 12–24 columns. Reserving the band's columns only over the band's own
rows (`reserved` in `VA.layWalk`) lets the rest keep its columns everywhere
else, which also means the model above and below looks the way it does in the
walk.

**A re-ordered walk needs a downward curve.** A band node can be reached by an
unlit edge above the band; only one edge may run down onto a node's column (its
arrival), and a band node's arrival must come from the band (`group`), so any
other edge reaching it from above curves *down* (`closePath` flips its lift when
the target is below). Upward closes are drawn exactly as before.

**An edge with both nodes above it keeps the walk's own roles** (drawn down from
the node the walk entered it at). Hanging it from the higher node instead was the
obvious rule and broke the product model's deferred joints (17 columns where the
walk has 11). The [real] identity test — re-laying the walk in its own order on
its own columns reproduces the projection row for row — is what caught it and
pins it.

**The band's columns are chosen, not just allocated.** Greedy allocation, then
every permutation of the non-trunk columns (≤ 6, so ≤ 720), held against the
columns the walk already gave those rows; fewest crossings wins, ties to the
narrower. The walk's columns never won on the live model, but the comparison is
what makes "never crosses itself more than in the walk" true by construction
rather than by measurement.

**A body is named once when a study is lit, on its band field.** With nothing
lit every block is still named (the 2026-10-27 rule, its test unchanged).

**No thermal-fit study exists on the product topology** — the thermal fits are
stacks, not topology studies. The browser DoD's three studies are the
kinematic one (its own page), a grip budget (`rotor_fastener_grip_u2h`) and
`pitch_system_blade_angle_worst` (the chain the walk spread over 81 rows).

**Arrival Fit keeps the sideways scroll.** The respine suite's scrolled-pane arm
("settles where the reader was, clamped") went red when the arrival called the
toolbar's Fit, which resets `scrollLeft`. `fitDagTo(keepSideways)`.

## Alternatives B and C

Prototype did not make either look better. (B) hidden + Fit alone: the hidden
band is now exactly what B would show, so B is one toggle away, and dimmed mode
still has the context Jeff asked for. (C) the 09-14 per-study swap: not rebuilt.

## Should the Python per-study layout now be deleted?

Yes — filed as `ISSUE_20261028_the_per_study_layout_the_builder_emits_has_no_reader_since_the_band.md`
(it cannot express a branching band, and nothing reads it). Not done here: it is
Python + pytest pins + a README paragraph, outside this handoff's file fence.

## What the band does to the study-groups handoff that follows

* A band is per lit set. A *group* of studies has a union lit set; `VA.bandLayout`
  takes any lit set, so a group's band is one call — but a group whose studies'
  lit rows are far apart in the walk becomes one tall band, and the side rule
  will pull every interleaved piece out of it. Worth measuring the union before
  deciding whether a group is one band or one band per member.
* The leaders across the seam to the 3D scene cross each other **58 times** on the
  kinematic page with the band framed (they are ordered by the band, the scene
  orders its anchors spatially). That number was not this handoff's to move, but
  a study-groups view that adds more leaders will make it worse; a strategy
  session may want the band's order to follow the scene's.
* Rows change column in the transition without moving sideways — filed as
  `ISSUE_20261028_a_row_the_band_moves_sideways_jumps_to_its_new_column_on_the_first_frame.md`.

## Gotchas

* **Mutation-witness anchors must stay unique across the whole file.** My
  `bandSides` first spelled its lit test with the exact line another spec
  anchors on (`hideUnlit`'s), and `tests/test_mutation_witnesses.py` went red
  ("a `find` matches 2 places"). Re-spelled.
* **A harness that reads seam/dot numbers must scale by the painted zoom.**
  Arrival Fit made the kinematic page zoom < 1 on arrival, and
  `testSeamLeaders`' `liveMeasure` added SVG pixels to screen rects: its
  "expected" leader set shrank to 8 while the page correctly drew 17. Scaled.
* **The flyout suite's live respine check raced the click**
  (`paneSettled()` can read the previous paint); it passed directly and failed
  in the witness shadow. It now waits for the study's nav row to light first.
* **The P2 seam checks are load-sensitive** (clean-run red three times in a long
  witness run, green 4/4 alone) — filed as
  `ISSUE_20261028_the_p2_seam_leader_check_races_the_scenes_anchor_messages_under_load.md`.
* The browser check names had `${id}` in them first; an interpolated name cannot
  be enrolled. They are four literal checks over both studies.
* `node_modules` was junctioned into the worktree from the main checkout for the
  browser tier (gitignored) and removed before hand-back.

## Verification record

See the hand-back report (the same record): fast tier, annotate fast tier,
browser tier, mutation witnesses `--changed-since integration`, pytest.

Run from this worktree; data tiers pointed at the main checkout with
`--repo C:/workspace/tolstack` (projections built 2026-10-28 00:40, accepted by
the fast tier's freshness pairing — this branch changes no projection input, so
no rebuild was needed or done); `node_modules` junctioned in for the browser tier.

* `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — 606/606 (598 + 8 new).
* `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` — 239/239.
* `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` — 33/34
  suites, 340 s; the one red is the crop lightbox's launcher-focus check, already
  filed (`ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`),
  green 2/2 run alone. Every suite this diff touches was green in that run.
* `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`
  — 35/35 reached, 32 witnessed, 597 s; the three misses were the P2 seam suite's
  clean run going red under load (above), and `--only "leaders across the seam"`
  then witnessed all 4 entries. Earlier in the session the same run found one real
  decay (the leader spec I first wrote, re-aimed) and two specs the band had
  outgrown (P2 and hidden seam, re-aimed at the zoom, both WITNESSED).
* `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` — 1590 passed,
  1 skipped, 1 failed in 304 s; the failure is `test_viewer_js_suite_is_green`, red
  by design in a worktree (no `data/`).
