---
priority: high
depends_on: [v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-22 — v2s_standard_parts_cite_their_spec_sheets: the races, the flanged bushings and the bolts of v2 cite the sheets in the inbox, or say what the sheet does not give

Source: strategy session 2026-11-22
(`dispatch/docs/strategy/HANDOFF_20261122_strategy.md`); the review page of
11-19 counts 22 open v2 dimensions as "spec sheet". Baseline: trunk with the
three links ahead merged. Scope: `docs/spec_library/events/` (new events
only; the log is append-only and an existing event is never edited),
`docs/topologies/topology_vpa_end_stop_v2.json` (dimensions on the edges of
the parts below only), tests for the new values. Do NOT touch: v1's files;
any id; `apps/`; `data/inbox/specs/` (append-only, never rename or tidy);
gap edges between parts (see "Left for the next design"). Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

Read `docs/spec_library/README.md` first: a reading is an immutable
`spec-parse/v0` event with three outcomes, a value, an absence (read for,
not there) and an unreadable (on the page, cannot be made out). All three are
results here. Nothing is recalled from memory: a standard part's dimension
you "know" is exactly the wrong number this repo exists to keep out.

## What is on file (measured 2026-11-22)

| Sheet in `C:\workspace\tolstack\data\inbox\specs\` | Parsed? | Subjects |
|---|---|---|
| `NAS6403-NAS6420 Rev 4.pdf` | event `0001_nas6403_nas6420_rev4_agent_manual_v0.json` | `NAS6403U11D` has `shank_dia`, `grip`, `length`. `NAS6403U14D` is not a subject |
| `RBC_Aerospace_Plain_Bearings_Web.pdf` | event `0006_rbc_aerospace_plain_bearings_2008_agent_manual_v0.json`, pages 21-22 | `MS14101-3` and `MS14103-3` carry `bore_B`, `od_D`, `width_H`, `ball_width_W`, `min_race_A` |
| `JB_NAS77.pdf`, `RBC - Plain bearings (NAS77 p92).pdf` | no event | none |

Events are folded by `tolerance_stack/spec_library.py`
(`python -m tolerance_stack`) and cited as `source_ref.kind: "spec"`.

v2's open edges on these parts (`docs/topologies/topology_vpa_end_stop_v2.json`):

- **Races** (eight parts, part ids `pitch_link_*_race`, `tan_link_*_race`):
  `*_outer_race_od_to_centre` ×4, `*_inner_race_bore_to_ball` ×4,
  `*_upper_inner_race_width` ×2, `*_upper_inner_race_face_to_ball` ×2.
- **Flanged bushings** (`flanged_bushing_nas77a3_015a`,
  `flanged_bushing_nas77a3_015a_tan_link`): `*_flanged_bushing_wall`,
  `*_flanged_bushing_bore_to_flange`, `*_flanged_bushing_flange_thickness`,
  each ×2.
- **Bolts** (`bolt_nas6403u11d`, `bolt_nas6403u14d`):
  `*_bolt_shank_straight_to_race`, `*_bolt_shank_race_to_flanged`, each ×2.

## Deliverables

1. **NAS77 is read.** One new parse event for the NAS77 sheet(s), subject
   NAS77A3-015A (the number on the model and in Enovia; the STEP names its
   instances NAS77C3-015, which is Jeff's question D4 and not yours to
   settle: record what the sheet says distinguishes A3 from C3 if it says).
   Record every dimension the flanged bushing's edges need, each as value,
   absence or unreadable. If the two PDFs disagree, record both and say so.

2. **NAS6403U14D is read**, as a new event adding that subject from the
   sheet already parsed for U11D, with the same fields.

3. **The edges cite.** For each open edge above, cite the spec field that
   states the relation between the edge's two ends, with its band as the
   sheet gives it. Where the event has the two diameters but the edge is
   their concentricity, a centre offset or a straightness the sheet does not
   state, the edge stays open and its note says what the sheet gives
   instead. Expect that outcome for most of the ten race centre edges; an
   open edge honestly worded is this deliverable done. Never derive a band
   by subtracting two catalogue numbers.

4. **The study's rows follow.** After a rebuild into a scratch data root,
   v2's study rows on these parts read as valued where an edge now cites,
   and each opens to the sheet's crop (`scripts/record_spec_crop_region.py`
   records where on the sheet). No viewer code is expected.

## Left for the next design (do not start it)

The play of a joint, bolt in bushing, race on bolt, a press fit, is a gap
edge between two parts' own diameters (Jeff, 2026-11-18), and how a gap edge
carries two cited diameters as one band is not designed yet. Your lesson
makes that design possible: for each gap edge on the two lug stacks and the
four bearings, list the two diameters it needs and, for each, whether a
cited value is now on file (event and field, or drawing and callout) or what
is missing.

## Definition of done

- Default pytest green in the main checkout, with value-level pins for each
  new event's fields and each edge valued; the spec library's fold lists the
  new subjects.
- One shot at 1536 wide, read with vision, from a scratch-root serve on a
  scratch port (never 8000): a race row and a bushing row opened to their
  sheet crop, the crop showing the digits transcribed.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_v2s_standard_parts_cite_their_spec_sheets.md`):
  one row per edge (cited with event and field, or open with what the sheet
  gives); the two-diameters table above; v2 edges with a value before and
  after; anything on a sheet that contradicts the model's part number.
