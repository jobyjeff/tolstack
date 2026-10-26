---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — the_tangential_link_cites_its_drawing: the two "no band on file" contributors read their drawings, and the blade part stops calling itself a root

Source: strategy session 2026-10-26 (Jeff's walkthrough of the kinematic
study: "two with alerts … no obvious way to resolve the alert"), the
2026-10-16 lesson's rung 4 ("bands for the tangential link — drawing reads"),
and `docs/issues/ISSUE_20261016_two_tangential_link_contributors_have_a_sensitivity_and_no_cited_band.md`.
Baseline: `master` after the 2026-10-22 batch merge (every 10-20 → 10-22
handoff in `docs/sessions/completed/`). Scope: `docs/topologies/topology_vpa_pitch_linkage.json`
(two edges' `dimension`, one part's `name`), the kinematic study document's
two gap contributors, `tests/`, the lesson. Do NOT touch `apps/`,
`tolerance_stack/`, `scripts/`, or `topology_pitch_system.json` (a staged
handoff folds it into this topology and depends on this one landing first).

## What is true today (measured 2026-10-26)

The kinematic study `vpa_pitch_linkage_blade_pitch_at_the_stops` has six
contributors; two are gap rows, rendered on the viewer page as a `no band on
file` chip and in the annotator's sweep rail as a warning badge:

| edge | nodes | gap text in the study |
|---|---|---|
| `tan_link_length` | `tan_link_lower_sphere_centre` → `tan_link_upper_sphere_centre` | "No band for the tangential link's centre-to-centre length is cited anywhere in this repo … 212956-005's drawing has not been read for it." |
| `pitch_plate_tan_link_attach_radius` | `pitch_plate_spindle_bore_axis` → `pitch_plate_tan_link_attach_bore` | "No positional tolerance for the pitch plate's tangential-link attach point is cited anywhere in this repo …" |

Neither edge carries a `dimension` in `topology_vpa_pitch_linkage.json`
(their sibling `pitch_link_length` does). Their sensitivities are real: 0.311
deg/mm at the −7° stop and 0.487 deg/mm at +72° (zone `band` on the length,
zone `sphere` on the attach point). On run P2 the link's two sphere centres sit
at `tan_link.point_a_world = (79.428, 62.430, 110.027)` and
`point_b_world = (80.708, 11.329, 144.132)` — a centre-to-centre distance of
about **61.45 mm**, which is the mesh-derived nominal the drawing value should
agree with to within the bearing fit (`docs/topologies/part_mesh_aliases.json`
row for `tan_link_212956_005`: the mesh is the whole four-solid link
assembly, body + MS14101-3 + MS14103-3 + bolt).

The drawings exist and have been extracted by drawing-checker, read-only for
this repo (the `the_travel_chain_cites_its_three_drawings` precedent,
`docs/sessions/lessons/LESSONS_20261020_the_travel_chain_cites_its_three_drawings.md`
— read it first; it records how a citation into drawing-checker's inbox is
spelled, that `view_id`/`bbox` live in `note`, and the rebuild-after-commit
trap):

- `C:\workspace\drawing-checker\data\inbox\drawings\212956-005-A.pdf`, run
  `C:\workspace\drawing-checker\data\runs\20260904_184233_212956-005-A\`
  (one sheet; `212956-005_A_p01.json` stores title block, parts list and
  notes and **no `dimensions` key** — it predates the general-dimension
  extraction, so the length is read off `page_1.png` by eye, exactly as the
  mount's drawing was on 2026-10-20).
- `C:\workspace\drawing-checker\data\inbox\drawings\215177-A.pdf`, runs
  `20260813_180719_215177-A` and `20260819_153159_215177-A` (same caveat).
  215177-001 is the plate INSTALLATION (plate + nine bushings); the machined
  detail is 215735-001 and its drawing is already in this repo's own inbox:
  `C:\workspace\tolstack\data\inbox\drawings\215735-A.pdf`. The attach-bore
  position callout is more likely on the detail than on the installation.
- The bearings' ball-centre offsets are already in the spec library (event
  0006, RBC plain bearings, pp. 21–22, MS14101-3 and MS14103-3) if the
  drawing's length is between seat faces rather than ball centres.

## Deliverables

1. **`tan_link_length` cites or records.** Read 212956-005 A for the
   centre-to-centre (or seat-to-seat) length and its band; if it is on the
   sheet, author `dimension` with `source_ref` into the drawing-checker inbox
   path + sha256 (as the 10-20 lesson spells it), `confidence: traced`, and
   a `note` that states how the drawn length maps to the sphere-centre
   distance the solver uses (seat-to-seat + two ball-centre offsets, cited
   from event 0006, or directly if the drawing dimensions the centres). If
   the sheet does not dimension it, the edge stays dimensionless but the
   **study's gap text names the drawing and the outcome** (absence:
   "212956-005 A read 2026-10-26, no centre-to-centre length"; the three
   outcomes rule of the spec library, not a guess), and the issue above gets
   a `handoff:` line and the finding. 213863-004 (the bare link body) is not
   in any inbox; if the length lives there, say so — that is Jeff's export.
2. **`pitch_plate_tan_link_attach_radius` cites or records**, from 215735-A
   first, then 215177-A. A positional tolerance `⌖ ⌀t` on the attach bore
   maps to the study's `sphere` zone as radius t/2 — state in the note that
   this treats an in-plane position zone as a ball (conservative in the axial
   direction) rather than invent a `disk`. Same absence rule as item 1.
3. **The kinematic study's two contributors follow**: a cited edge turns the
   contributor from `gap` to a `dimension_ref` on this same topology (the
   loader's existing path), and the envelope moves — record the new worst
   case and RSS at both stops beside today's ±0.244 / ±0.242 (`docs/sessions/lessons/LESSONS_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md`
   has the table) and the S461-607 margins.
4. **The blade part says what it is.** `topology_vpa_pitch_linkage.json`'s
   part `blade_root` (drawing 216332-001, BLADE BONDED ASSEMBLY) is drawn in
   the annotator as the whole 20-solid blade but reads "blade root" in every
   rail, because `data/projections/parts/names.json` takes the topology's
   `name` when no title block was found. Change its `name` to `blade bonded
   assembly` (the id stays `blade_root`: linkage's `BODY_PARTS` and the
   sweep artifacts name the id). Rebuild the parts-names projection and
   check the rail wording in the lesson.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green in the main checkout;
  the kinematic `[real]` tier green after `scripts/rebuild_projections.ps1`
  (rebuild AFTER committing — the provenance gate refuses a dirty tree, the
  10-20 lesson's trap).
- The viewer page `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  shows, for each of the two rows, either a band with a `traced` chip or a
  gap chip whose hover names the drawing read and the outcome. Screenshot in
  `docs/sessions/shots_20261026_tangential_link_cites/`.
- Every node and edge id is byte-identical before and after (linkage's
  `geometry.features[]` names them; its pairing test reads this file by
  absolute path); the part rename changes `name` only.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_tangential_link_cites_its_drawing.md`):
  the before/after table (the 10-20 lesson's shape), where on each sheet the
  value was found (view, bbox), the mesh-vs-drawing nominal agreement, and
  what Jeff still has to export if anything.
