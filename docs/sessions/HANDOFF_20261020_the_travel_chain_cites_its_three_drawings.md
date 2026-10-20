---
priority: high
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-20 — the_travel_chain_cites_its_three_drawings: the end-stop travel study's four placeholders become drawing citations

Source: strategy session 2026-10-20 (Jeff exported the three drawings the
2026-10-16 travel handoff asked for; drawing-checker extracted them the same
day). Baseline: **branch from `integration`**, not `master` —
`the_travel_between_the_end_stops_is_a_study` and
`a_kinematic_study_folds_the_sweeps_jacobian` merged to `integration` on
2026-10-16 and trunk has not been batch-merged since. Scope:
`docs/topologies/topology_vpa_pitch_linkage.json` (the five end-stop edges and
their nodes only), `docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`,
`docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md`,
`docs/issues/` (the two issues named below), tests that pin the study. Do NOT
touch `apps/` (the annotator rail handoff staged today owns it),
`tolerance_stack/kinematic.py` or the kinematic study (unchanged inputs), or
any `pitch_system` file. Every existing node/edge id stays byte-identical
(`feature-identity/v0` bindings key on them).

## What exists

The study `vpa_pitch_linkage_travel_between_end_stops` walks four edges —
`piston_head_upper_thickness` (12.5094), `piston_head_lower_thickness`
(2.491), `piston_cover_flange_to_end_stop` (82.154),
`gas_spring_mount_flange_to_end_stop` (8.667) — to a nominal travel of
58.4866 mm, ±0.2000 worst case. **All four are `kind: assumed`, `untraced`,
±0.05 stand-in bands**: three mesh fits and one figure of Jeff's. The lesson
`docs/sessions/lessons/LESSONS_20261016_the_travel_between_the_end_stops_is_a_study.md`
and the worksheet's section 2 (face order along CAD Z, with face ids) are the
record. Read both first.

## The drawings, now extracted

drawing-checker ran all three on 2026-10-20 (vector extraction, one structured
JSON per sheet). Absolute paths; read-only; cite them by run id + `view_id` +
`bbox`:

| part | drawing | run | sheets | extracted |
|---|---|---|---|---|
| upper piston head | 214698-002 rev A, "GAS SPRING PISTON HEAD, PROPELLER, UPR" | `C:\workspace\drawing-checker\data\runs\20261020_134240_214698-002-A\214698-002_A_p01.json` | 1 | 9 dimensions, 6 FCFs |
| lower piston head | 214699-002 rev A | `C:\workspace\drawing-checker\data\runs\20261020_134300_214699-002-A\214699-002_A_p01.json` | 1 | 3 dimensions, 5 FCFs |
| piston cover | 214958-002 rev A | `C:\workspace\drawing-checker\data\runs\20261020_134315_214958-002-A\214958-002_A_p01.json`, `_p02.json`, `_p03.json` | 3 | sheet 1: 0 dimensions, 1 FCF; sheets 2–3 unchecked |
| gas-spring mount | 213668-002 A.1 | `C:\workspace\drawing-checker\data\runs\20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER\` (newest of two runs) | — | already in the inbox since August; `pitch_system` may cite it — reuse that citation's form |

The source PDFs sit in `C:\workspace\drawing-checker\data\inbox\drawings\`
(`214698-002-A.pdf`, `214699-002-A.pdf`, `214958-002-A.pdf`), and each run
folder has `page_N.png` renders you can look at. Each dimension row is
`{kind: "dim", view_id, bbox, raw, parsed: {nominal, tolerance: {type, plus,
minus, sym}, reference, ...}, provenance}`. **The general-tolerance block is
in the title block**, and the extractor filed it under `title_block.copyright`
(a quirk, not a licence): for 214698-002, `X ±1`, `X.X ±0.25`, `X.XX ±0.10`,
`X.XXX ±0.050` mm, angles `±5° / ±1° / ±0.5° / ±0.1°`, interpret per JBM08009.
An untoleranced callout takes its band from that block, by its decimal
places; cite the block as the band's source and the callout as the nominal's.

## Deliverables

1. **Cite the four edges.** For each, replace the `assumed` source_ref with a
   `drawing` citation (`document`, run id, `view_id`, `bbox`, the raw callout,
   `confidence: traced`) and set `nominal`/`min`/`max` from the callout plus
   its tolerance (explicit, or the general block). Where the drawing
   dimensions a chain of features rather than the one length the edge names
   (a head height called out as steps from a datum face), say in the
   source_ref note how the edge's value is composed from the callouts, and
   keep each callout's own tolerance — do not fold them yourself; if an edge
   genuinely needs two callouts summed, split it into two edges in series
   (new ids, additive) so the one `fold()` does the sum. Compare each cited
   nominal with the mesh fit the edge carried; record the difference in the
   worksheet (a mesh fit that disagrees with its drawing by more than the
   drawing's band is a finding, not a typo).
2. **The upper head's stop face.** `ISSUE_20261016_which_upper_piston_head_face_meets_the_mount_end_stop_is_unknown.md`
   (on `integration`): the head is stepped, the study took the topmost plane
   (face 149, part-frame Z 249.169); the alternatives give 62.281 / 64.440 /
   66.987 mm. Read 214698-002 for anything that names the stop surface (a
   note, a datum, a flatness or parallelism callout on one of the four +Z
   planes, a "CONTACT" or "STOP" label). If the drawing settles it, move node
   `piston_head_upper_top_face` and the edge together, resolve the issue
   with the citation, and say so in the lesson. If it does not, keep face
   149, leave the issue open, and add to it the drawing's cited height of
   each candidate face so Jeff can pick by number.
3. **The cover.** Sheet 1 of 214958-002 extracted no dimensions. Read
   sheets 2 and 3 (`_p02.json`, `_p03.json`) for the flange-to-end-stop
   length (Jeff's ~82.154). If no sheet carries it as a dimension, look at
   the page renders and record which of the SOP's outcomes applies — an
   **absence** (the length is not dimensioned on the drawing; it is a
   derived distance between two features that are) or **unreadable** (it is
   on the page and the extraction missed it). Unreadable → cite the PDF page
   and bbox you read by eye as `confidence: inferred` with the reason, and
   file a tolstack issue (`audience: triage`, naming the drawing-checker run)
   so the extraction gap reaches that repo. Absence → compose it from the
   callouts that do exist, as in item 1.
4. **Re-run the study and update the worksheet**: the four cited values, the
   new nominal and intervals (worst case, RSS), the mesh-vs-drawing table, the
   ATP's derived 65.03 mm (S4ATS-2439, ≤65 row) and S461-516/637's 61.67 mm
   nominal stroke beside the result as before — no claim about which is
   right. Update the worksheet's `claim` fence and the traced-ratio prose
   (both guarded; the lesson of 10-16 says what trips them). The study stays
   check-less (`no_checks_reason` holds); the study-level incompleteness
   question (`ISSUE_20261016_a_study_with_no_checks_has_nowhere_to_say_it_is_incomplete`)
   is a strategy design call and is not yours.
5. **Close the loop on the ask.** Resolve
   `ISSUE_20261016_end_stop_travel_stack_rests_on_three_drawings_in_no_inbox.md`
   with the three run ids. Append a note to forge todo `20261016T165622_zy675c`
   saying the drawings landed 2026-10-20 and were cited here (from
   `C:\workspace\forge`: `venv-win\Scripts\python.exe -m forge tasks note
   <ref> ...`; `forge tasks --help` shows the verb — tasks have no close verb
   for agents, Jeff ticks it off).
6. **Projections.** Do not rebuild the shared projection from the worktree.
   Build a shadow copy as the 10-16 lesson describes and run the viewer
   `[real]` tier against it; the viewer README/comment counts that pair
   against the live graph moved last time (crossings, rail allocations) —
   if adding edges moves them again, those digit-only edits in `apps/viewer`
   are forced-by-guard and allowed (say so in the lesson), nothing else in
   `apps/` is.

## Definition of done

- `study_vpa_pitch_linkage_travel_between_end_stops` folds four `drawing`-cited
  terms (or three plus one recorded gap with a filed issue), pinned to three
  decimals by a `[real]` test; the previous placeholder numbers appear only in
  the worksheet's before/after table.
- The traced ratio for the topology is restated correctly in fence and prose;
  `venv-win/Scripts/python.exe -m pytest -q` green in the worktree except the
  documented worktree-only red; shadow `[real]` tier green.
- Lesson (`docs/sessions/lessons/LESSONS_20261020_the_travel_chain_cites_its_three_drawings.md`):
  the four values before → after with their citations; the stop-face answer
  (settled by what, or still open with the per-face heights); the cover's
  outcome (dimensioned / absence / unreadable); any mesh-vs-drawing
  disagreement larger than a band; which guards tripped and why.
