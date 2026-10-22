---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-22 — a_general_profile_note_bands_a_model_defined_term: a drawing's UNLESS-OTHERWISE-SPECIFIED profile note is a citable band, a position zone is a disk, and the end-stop travel chain carries both

Source: Jeff's forge note `20261020T171900_km22z6` (2026-10-20, after reading
`the_travel_chain_cites_its_three_drawings`), which rules on the two uncited
edges, and `docs/strategy/BRIEF_20261021_what_a_term_cites_when_its_drawing_does_not_band_it.md`
(consumed 2026-10-22 — this handoff carries instances 1 and 2 of its four).
Baseline: master after the 2026-10-22 batch merge, with
`the_travel_chain_cites_its_three_drawings` and
`the_kinematic_study_checks_its_run_its_units_and_shows_its_limit` merged.
Scope: `docs/SOP_TOLERANCE_STACK.md` (one new section), the topology and
study files named below, `docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md`,
`tolerance_stack/` where a band's `source_ref` is validated, `apps/viewer/`
(the term badge and hover), `tests/`. Do NOT touch `apps/annotate/`, the
mutation-witness runner, or the study schema's completeness fields — the
sibling `a_study_says_it_is_incomplete_without_inventing_a_check` owns those.

## Jeff's rulings (2026-10-20), verbatim where it matters

1. "Upper piston head (214698-002) thickness (bottom flange A datum to end
   stop surface): Measured to 6.556mm, is in fact missing a tolerance on the
   drawing face. This would default to the global surface profile (Drawing
   note 6, surface profile 0.5 Unless Otherwise Specified), this is an
   oversight and should be corrected/tightened in future releases."
2. "Gas spring mount (213668-002) thickness, 8.667 in CAD. Also would default
   to the global surface profile 1mm (note 12). Also needs an explicit
   tolerance. Worth noting, there is a 76.86 +/-0.1 from A-datum to the top
   face of the part, which is where the feather direction end stop hits. One
   option would be to add another tolerance from A-datum to piston cover
   mount flange, this would improve the absolute flat pitch end stop accuracy
   but lengthen the stack for total travel. Probably better to directly
   constrain the 8.667mm dimension since total travel is what is controlled
   in the ATS."
3. "Agent mentioned a .025mm discrepancy in measured travel. I checked the
   kinematic model in Catia and sure enough, there was a slight .025mm
   overlap/interference at 72deg resting state, while at -7deg the upper stop
   surfaces are perfectly coincident. This means the actual nominal travel is
   64.440, not 64.465 I reported earlier."
4. "The ATS spec (65mm) likely doesn't take into account compliance in the
   system as it pushes against the charged gas spring. I think Chao said this
   could be ~1mm of deflection based on a simplified FEA model he made, we'll
   likely need to revise the ATS to reflect this (or measure the true end
   stop locations with the gas spring discharged)."

## The rule this handoff writes into the SOP (decided 2026-10-22)

A new SOP section, "What a term cites when its drawing does not band it", as
a table — one row per source, what the term carries, at what `kind` /
`confidence`, and what the `note` must say:

| the drawing gives | the term carries | kind / confidence | note |
| --- | --- | --- | --- |
| a dimension with a ± on the term's axis | that band | `drawing` / `traced` | — (today's rule) |
| no dimension, but a general profile note `⌓w UNLESS OTHERWISE SPECIFIED` and the term is a datum-referenced surface the note governs | **±w/2 about the model nominal** (bilateral unless the note states a unilateral zone) | `drawing` / `traced`, `source_ref` = the **note** (sheet, note number, drawing-checker run id), not a dimension | "general profile note, not a dimension; the drawing should carry an explicit tolerance" — this is Jeff's "oversight, correct in future releases", and the viewer must show the difference (deliverable 4) |
| a position zone `⌖Øw A B C` on the feature the term reads | a **`disk`** of radius w/2 over the two components normal to the feature's axis (`sphere` for a spherical zone), **never a one-axis band** | `drawing` / `traced` | names the axis and where it came from |
| the assembly drawing dimensions the length the part drawing leaves to the model | that band, cited to the assembly drawing | `drawing` / `traced` | names the assembly drawing |
| nothing — the surface is model-defined and no note governs it | a **`gap`**, and the study is incomplete (sibling handoff) | `gap` | what would close it (a drawing release, an assembly dimension) |

The ±0.05 `kind: assumed` stand-in is **retired** for a drawing-defined
surface: an `assumed` band may exist only for a quantity no drawing governs
at all, and the SOP row says so. Keep the table terse; the SOP's existing
confidence vocabulary (`traced | inferred | untraced`) and `kind` set
(`drawing | parts_list | workbook | spec | pipeline_element | assumed |
requirement`, plus `gap`) are not extended — a general note is still a
drawing citation.

## Deliverables

1. **The two edges are cited.** In the `vpa_pitch_linkage` topology
   (`docs/topologies/` — the file the study
   `docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`
   names as `"topology": "vpa_pitch_linkage"`):
   - `piston_head_upper_thickness`: 6.556 **±0.25**, `kind: drawing`,
     `confidence: traced`, `source_ref` = 214698-002 A, general note 6
     (profile 0.5 UOS), the drawing-checker run for 214698-002 that
     `the_travel_chain_cites_its_three_drawings` used (its lesson names it),
     with the note text above.
   - `gas_spring_mount_flange_to_end_stop`: 8.667 **±0.5**, same shape,
     213668-002 A.1, general note 12 (profile 1 mm UOS), run
     `20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER` (which
     extracted no `dimensions` — read the note off the page render and say
     so in `note`; the extraction gap is filed in drawing-checker as
     `ISSUE_20261022_the_gas_spring_mount_run_extracted_no_dimensions_from_sheets_that_print_many.md`,
     cite it, do not re-file it).
   - Record the 76.86 ±0.1 (A datum to the top face, the feather-direction
     stop) in the topology as a `datum_feature`/measured fact on 213668-002
     where the SOP puts such facts, **not** folded into this chain (Jeff:
     constraining 8.667 directly is the better drawing change).
2. **The study's numbers are the drawings' numbers.** Re-fold the travel
   study. Expected: nominal **64.440** (Jeff confirmed this against the
   CATIA kinematic model — a 0.025 mm interference at the 72° rest, coincident
   at −7°; the worksheet records that confirmation, dated, and retires
   "64.465"). Worst case ±(0.050 + 0.020 + 0.25 + 0.5) = **±0.82** →
   63.62–65.26 mm; RSS about ±0.56. State these as the handoff's expectation
   and report the actual fold. The worksheet's §3 table loses its two
   "assumed" rows and gains the general-note rows with the citations.
3. **Context the study did not have.** `provenance.context_only` of the
   study gains: the ATS acceptance limit for travel (S4ATS-2439 / S4ATS-2379,
   "≤ 65 mm", as atp-post scores it — `C:\workspace\atp-post\docs\` criteria;
   cite the clause ids, do not transcribe the clause) **as context, not a
   limit** (the study's `no_checks_reason` stands: S461 gives no number, and
   the ATS is an acceptance test, not a design requirement); and Jeff's
   note 4 verbatim as a `notes` entry — the ~1 mm compliance figure is Chao's
   estimate relayed by Jeff, unverified, and the note must say so. The
   worksheet gains a short "Drawing follow-ups" list: both parts need an
   explicit tolerance in their next release; for 213668-002 constrain the
   8.667 directly rather than adding an A-datum-to-cover-flange dimension
   (Jeff's reasoning in ruling 2, quoted).
4. **The viewer shows which kind of citation it is.** A term banded by a
   general note is badged differently from one banded by a dimension — the
   existing provenance hover gains one line ("from the drawing's general
   profile note, not a dimension") and the band chip carries a small marker;
   everyday words, no internal field names (`docs/UI_STYLE` rules as the
   repo states them). The study page's interval updates by construction.
   Named site list for this fact: the topology term hover, the study's term
   table, the DAG's band column if it renders bands; say in the lesson which
   you changed and which renders nothing today.
5. **The position-zone rule applied once.** `pitch_plate_attach_height`
   (blade-pitch kinematic study, 215735-A `⌖Ø0.2 A B C` on
   `pitch_link.point_a[2]`): if the topology's feature for that hole states
   its axis, convert the band to a `disk` of radius 0.1 in the plane normal
   to it and report the verdict delta (the brief measured about +0.002° at
   −7° and +0.005° at +72°, no verdict change — confirm or correct). If the
   axis is **not** in the topology, do not guess: keep the band, add a `gap`
   naming the missing axis and which drawing/feature would give it, and
   leave F4 of `WORKSHEET_endstop_vision_baseline.md` ("one callout serving
   the vertical and tangential rows, counted twice?") answered or explicitly
   open in the lesson.
6. **Validation follows the rule.** Wherever `source_ref` is validated, a
   `drawing` citation whose `note` begins with the general-note phrase is
   accepted with a `note_number`/`sheet` instead of a dimension anchor, and a
   `kind: assumed` band on an edge whose feature carries a drawing reference
   is a validation **error** (the retired stand-in). The structural-count
   pins move with the edits, by the SOP's own rule.

## Definition of done

- The travel study folds to the expected shape (nominal 64.440; worst case
  and RSS reported against the ±0.82 / ±0.56 expectation; any difference
  explained by the drawings, not smoothed).
- Viewer: the travel study page shows the new interval and the two
  general-note terms are visibly marked; `node apps/viewer/run_tests.cjs`
  and the browser tier for the specs you added (`--only`, never the full
  registry on this branch) green; `venv-win/Scripts/python.exe -m pytest -q`
  green in the main checkout.
- The SOP section exists and the four source issues the brief lists keep
  their `handoff:` lines (set 2026-10-22) so dispatch resolves them on
  completion; the VPA-facts issue is **not** yours (Jeff is asked
  separately).
- Lesson (`docs/sessions/lessons/LESSONS_20261022_a_general_profile_note_bands_a_model_defined_term.md`):
  the fold before/after; which viewer sites changed; the position-zone
  outcome (converted, or gap and why); how long the suite took.
